pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/math/Math.sol";

/**
  @notice This library manages the inter-tick state(not intra-tick)
 */
library TickState {
  using SafeMath for uint256;

  /**
    @notice notifies the start of the tick
    @param baseTokenAddress the base token of the pair
    @param secondaryTokenAddress the secondary token of the pair
    @param number the tick number that just started
 */
  event TickStart(
    address indexed baseTokenAddress,
    address indexed secondaryTokenAddress,
    uint64 number
  );

  /**
    @notice notifies the end of the tick and its result
    @param baseTokenAddress the base token of the pair
    @param secondaryTokenAddress the secondary token of the pair
    @param number the tick number that just finished
    @param nextTickBlock the block number after wich one it can be excecuted the next tick
    @param closingPrice the price [using priceComparisonPrecision] used to match the orders this tick
 */
  event TickEnd(
    address indexed baseTokenAddress,
    address indexed secondaryTokenAddress,
    uint64 indexed number,
    uint256 nextTickBlock,
    uint256 closingPrice
  );

  /**
    @param expectedOrdersForTick amount of orders expected to match in each tick
    @param maxBlocksForTick the max amount of blocks to await until allowing to run the tick
    @param minBlocksForTick the min amount of blocks to await until allowing to run the tick
 */
  struct Config {
    uint256 expectedOrdersForTick;
    uint256 maxBlocksForTick;
    uint256 minBlocksForTick;
  }

  /**
    @param number the current tick number
    @param nextTickBlock the block number after wich one it can be excecuted the next tick
    @param lastTickBlock the block number in which one the last tick was executed
    @param blockNumberWhenTickStarted 0 when the contract is reciving orders,
      the block number in which one the tick was executed as the tick started
  */
  struct Data {
    uint256 nextTickBlock;
    uint256 lastTickBlock;
    uint256 blockNumberWhenTickStarted;
    uint64 number;
  }

  /**
    @dev reverts if the block since which this tick matching can be executed has not been reached yet
  */
  function startTick(Data storage _self, address _baseTokenAddress, address _secondaryTokenAddress) internal {
    require(block.number >= _self.nextTickBlock, "Next tick not reached");
    _self.blockNumberWhenTickStarted = block.number;
    emit TickStart(
      _baseTokenAddress,
      _secondaryTokenAddress,
      _self.number
    );
  }

  /**
    @dev Given Tick processing is completed, nextTick calculates and sets the tick state for the
    following execution. Also emitts the TickEnd event.
    @param _baseTokenAddress the base token of the pair involved in this tick
    @param _secondaryTokenAddress the secondary token of the pair involved in this tick
    @param _config ticks confirguration
    @param _closingPrice emergent price resulted from this ticks matching
    @param _actualOrders amount of orders matched on this ticks execution
  */
  function nextTick(
    Data storage _self,
    address _baseTokenAddress,
    address _secondaryTokenAddress,
    Config memory _config,
    uint256 _closingPrice,
    uint256 _actualOrders
  ) internal {
    assert(_self.blockNumberWhenTickStarted != 0);
    uint64 previousTickNumber = _self.number;

    // Calculate the minimum amount of blocks until the contract allows to run the tick again
    uint256 blocksUntilNextTick = calculateBlocks(
      _config.expectedOrdersForTick,
      _self.lastTickBlock,
      _config.maxBlocksForTick,
      _config.minBlocksForTick,
      Math.max(_actualOrders, 1),
      _self.blockNumberWhenTickStarted
    );

    _self.lastTickBlock = _self.blockNumberWhenTickStarted;
    _self.nextTickBlock = _self.blockNumberWhenTickStarted + blocksUntilNextTick;
    _self.number = _self.number + 1;
    _self.blockNumberWhenTickStarted = 0;

    emit TickEnd(
      _baseTokenAddress,
      _secondaryTokenAddress,
      previousTickNumber,
      _self.nextTickBlock,
      _closingPrice
    );
  }

  /**
    @notice Calculate the block that should pass until the next tick is available
    @param _expectedOrdersForTick Ideal amount of matching orders per tick
    @param _lastTickBlock The block in which the last tick was run
    @param _maxBlocksForTick The max blocks between two ticks
    @param _minBlocksForTick The mix blocks between two ticks
    @param _actualOrders The amount of matched orders
    @param _currentBlockNumber The current block number
    @return Blocks that should pass until the next tick
  */
  function calculateBlocks(
    uint256 _expectedOrdersForTick,
    uint256 _lastTickBlock,
    uint256 _maxBlocksForTick,
    uint256 _minBlocksForTick,
    uint256 _actualOrders,
    uint256 _currentBlockNumber) private pure returns(uint256) {

    // The amount of blocks since the previous tick until the current one
    uint256 blocksForLastTick = _currentBlockNumber - _lastTickBlock;

    // The minimum amount of blocks until the next tick, given by linear regression
    uint256 tentativeBlocksUntilNextTick = _expectedOrdersForTick.mul(blocksForLastTick).div(_actualOrders);

    // if the tentativeBlocksUntilNextTick is greater than the max tolerated, sets it as _maxBlocksForTick
    tentativeBlocksUntilNextTick = Math.min(tentativeBlocksUntilNextTick, _maxBlocksForTick);

    // if the tentativeBlocksUntilNextTick is lower than the min tolerated, sets it as _minBlocksForTick
    tentativeBlocksUntilNextTick = Math.max(tentativeBlocksUntilNextTick, _minBlocksForTick);

    return tentativeBlocksUntilNextTick;
  }
}
