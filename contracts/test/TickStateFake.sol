pragma solidity 0.5.8;

import {TickState} from "../libs/TickState.sol";


// This contract is a proxy for testing the TickState library, it is not mend to be deployed for use.
contract TickStateFake {
  using TickState for TickState.Data;

  /*  Cloned from TickState.sol or the event it is not recogniced and emited from that lib
   @notice notifies the end of a matching process and its result
   @param baseTokenAddress the base token of the pair
   @param secondaryTokenAddress the secondary token of the pair
   @param number the tick number that just finished
   @param nextBlock the block number after wich one it can be excecuted the next matching process
   @param closingPrice the price [using priceComparisonPrecision] used to match the orders this tick
 */
  event TickEnd(
    address indexed baseTokenAddress,
    address indexed secondaryTokenAddress,
    uint64 indexed number,
    uint256 nextTickBlock,
    uint256 closingPrice
  );

  address public baseTokenAddress;
  address public secondaryTokenAddress;

  TickState.Config public tickConfig;
  TickState.Data public tickState;

  function nextTick(uint256 _actualOrders) external {
    tickState.blockNumberWhenTickStarted = block.number;
    tickState.nextTick(
      baseTokenAddress,
      secondaryTokenAddress,
      tickConfig,
      0, //this is 0 becose it is unimportant for the excecution
      _actualOrders
    );
  }

  function initialize(
    address _baseToken,
    address _secondaryToken,
    uint256 _expectedOrdersForTick,
    uint256 _maxBlocksForTick,
    uint256 _minBlocksForTick
  ) public {
    baseTokenAddress = _baseToken;
    secondaryTokenAddress = _secondaryToken;
    tickConfig = TickState.Config(_expectedOrdersForTick, _maxBlocksForTick, _minBlocksForTick);
    tickState = TickState.Data(block.number, block.number, 0, 1);
  }
}
