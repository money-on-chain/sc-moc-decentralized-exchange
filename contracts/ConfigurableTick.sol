pragma solidity 0.5.8;

import "areopagus/contracts/Governance/Governed.sol";
import { TickState } from "./libs/TickState.sol";

contract ConfigurableTick is Governed {
  TickState.Config public tickConfig;

  /**
    @notice Sets the expected orders for tick, it must be higher or equal than two
    @param _expectedOrdersForTick The new expectedOrdersForTick
   */
  function setExpectedOrdersForTick(uint64 _expectedOrdersForTick) external onlyAuthorizedChanger {
    require(_expectedOrdersForTick >= 2, "Expected orders for tick too low");
    tickConfig.expectedOrdersForTick = _expectedOrdersForTick;
  }


  /**
    @notice Sets a new maxBlocksForTick, it must be higher or equal than the minimum
    @param _maxBlocksForTick The new maxBlocksForTick
   */
  function setMaxBlocksForTick(uint64 _maxBlocksForTick) external onlyAuthorizedChanger {
    require(_maxBlocksForTick >= tickConfig.minBlocksForTick, "min BlockForTick should be lower than max");
    tickConfig.maxBlocksForTick = _maxBlocksForTick;
  }

  /**
    @notice Sets a new minBlocksForTick, it must be lower or equal than the maximum
    @param _minBlocksForTick The new minBlocksForTick
   */
  function setMinBlocksForTick(uint64 _minBlocksForTick) external onlyAuthorizedChanger {
    require(_minBlocksForTick <= tickConfig.maxBlocksForTick, "min BlockForTick should be lower than max");
    tickConfig.minBlocksForTick = _minBlocksForTick;
  }
 /**
    @notice Initialize the contract, kind of like a constructor, but able to be used in a proxy-pattern
    contract
    @param _expectedOrdersForTick amount of orders expected to match in each tick
    @param _maxBlocksForTick the max amount of blocks to wait until allowing to run the tick
    @param _minBlocksForTick the min amount of blocks to wait until allowing to run the tick
    @param _governor Address in charge of determining who is authorized and who is not
 */
  function initialize(
    uint64 _expectedOrdersForTick,
    uint64 _maxBlocksForTick,
    uint64 _minBlocksForTick,
    address _governor
  ) internal initializer {
    require(_expectedOrdersForTick >= 2, "Expected orders for tick too low");
    require(_maxBlocksForTick >= _minBlocksForTick, "min BlockForTick should be lower than max");
    tickConfig = TickState.Config(_expectedOrdersForTick, _maxBlocksForTick, _minBlocksForTick);
    Governed.initialize(_governor);
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}
