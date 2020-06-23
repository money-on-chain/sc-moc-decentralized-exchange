pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";

import {MoCExchangeLib} from "./libs/MoCExchangeLib.sol";
import {TickState} from "./libs/TickState.sol";
import "./libs/MoCExchangeLib.sol";
import "./ConfigurableTick.sol";
import "./interface/IPriceProvider.sol";

contract EventfulTokenPairListing {
  event TokenPairDisabled(address baseToken, address secondaryToken);
  event TokenPairEnabled(address baseToken, address secondaryToken);
}


contract TokenPairListing is ConfigurableTick, EventfulTokenPairListing {
  using MoCExchangeLib for MoCExchangeLib.Data;
  using TickState for TickState.Data;
  using MoCExchangeLib for MoCExchangeLib.Pair;
  using MoCExchangeLib for MoCExchangeLib.OrderType;
  using SafeMath for uint256;

  // tokenPairAddresses stores the addresses of every listed pair
  // tokenPairs stores the Pair structures, indexed by
  // the hash of both addresses:
  // pairHash = sha256(abi.encodePacked(baseAddress, secondarAddress))
  // this is necessary to be able to know how many pairs there are
  // and which token pairs are listed.
  mapping(bytes32 => MoCExchangeLib.Pair) tokenPairs;
  address[2][] public tokenPairAddresses;

  uint256 public constant PRECISION_SMOOTHING_FACTOR = 10**18;
  uint256 public constant SMOOTHING_FACTOR = 16530000000000000;

  /**
@notice Check if the new pair is valid; i.e. it or its inverse is not listed already, and
that the tokens are different; fails otherwise

@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
*/
  modifier isNewPairValid(address _baseToken, address _secondaryToken) {
    require(!validPair(_baseToken, _secondaryToken), "Existent pair");
    require(!validPair(_secondaryToken, _baseToken), "Existent inverse pair");
    require(_baseToken != _secondaryToken, "Base equal to secondary");
    _;
  }

  /**
@notice Disable the insertion of orders in a pair; the pair must have been added before and must not be disabled currently
Emits an event
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
*/
  function disableTokenPair(address _baseToken, address _secondaryToken) public onlyAuthorizedChanger {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    require(!pair.disabled, "Pair already disabled");
    pair.disabled = true;
    emit TokenPairDisabled(_baseToken, _secondaryToken);
  }

  /**
@notice Re-enable the insertion of orders in a pair; the pair must have been added
and disabled first
Emits an event
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
*/
  function enableTokenPair(address _baseToken, address _secondaryToken) public onlyAuthorizedChanger {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    require(pair.disabled, "Pair already enabled");
    pair.disabled = false;
    emit TokenPairEnabled(_baseToken, _secondaryToken);
  }

  /**
@dev Sets the smoothing factor for a specific token pair
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@param _smoothingFactor wad from 0 to 1 that represents the smoothing factor for EMA calculation
*/
  function setTokenPairSmoothingFactor(
    address _baseToken,
    address _secondaryToken,
    uint256 _smoothingFactor
  ) public onlyAuthorizedChanger {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    require(_smoothingFactor <= PRECISION_SMOOTHING_FACTOR, "Smoothing factor should be in relation to 1");
    pair.smoothingFactor = _smoothingFactor;
  }

  /**
  @dev Sets the EMA Price for a specific token pair
  @param _baseToken Address of the base token of the pair
  @param _secondaryToken Address of the secondary token of the pair
  @param _emaPrice The new EMA price for the token pair
  */
  function setTokenPairEmaPrice(
    address _baseToken,
    address _secondaryToken,
    uint256 _emaPrice
  ) public onlyAuthorizedChanger {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    pair.emaPrice = _emaPrice;
  }

  /**
  @dev Sets a price provider for a specific token pair
  @param _baseToken Address of the base token of the pair
  @param _secondaryToken Address of the secondary token of the pair
  @param _priceProvider Address of the price provider
  */
  function setPriceProvider(address _baseToken, address _secondaryToken, address _priceProvider) public onlyAuthorizedChanger() {
    require(validPair(_baseToken, _secondaryToken), "The pair does not exist");
    require(_priceProvider != address(0), "Price provider address can not be 0x");
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    pair.priceProvider = IPriceProvider(_priceProvider);
  }

  /**
@notice Adds a token pair to be listed; the base token must be the commonBaseToken or be listed against it; the pair
or its inverse must not be listed already

@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@param _priceComparisonPrecision Precision to be used in the pair price
@param _initialPrice Price used initially until a new tick with matching orders is run
*/
  function addTokenPair(
    address _baseToken,
    address _secondaryToken,
    address _priceProvider,
    uint256 _priceComparisonPrecision,
    uint256 _initialPrice
  ) public onlyAuthorizedChanger() isNewPairValid(_baseToken, _secondaryToken) {
    require(_initialPrice > 0, "initialPrice no zero");
    bytes32 pairIndex = hashAddresses(_baseToken, _secondaryToken);
    tokenPairAddresses.push([_baseToken, _secondaryToken]);
    tokenPairs[pairIndex] = MoCExchangeLib.Pair(
      MoCExchangeLib.Token(MoCExchangeLib.Data(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, _initialPrice, true), IERC20(_baseToken)),
      MoCExchangeLib.Token(MoCExchangeLib.Data(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, _initialPrice, false), IERC20(_secondaryToken)),
      IPriceProvider(_priceProvider),
      // initialize TickState with the given Tick number and an nextTickBlock of blocksForTick after the current one
      TickState.Data(SafeMath.add(block.number, tickConfig.minBlocksForTick), 0, 0, 1),
      MoCExchangeLib.TickPaginationMemory(
        0,
        0,
        new uint256[](0),
        0,
        MoCExchangeLib.Order(MoCExchangeLib.OrderType.LIMIT_ORDER, 0, 0, 0, 0, 0, 0, address(0), 0),
        MoCExchangeLib.Order(MoCExchangeLib.OrderType.LIMIT_ORDER, 0, 0, 0, 0, 0, 0, address(0), 0),
        0,
        0,
        0,
        0
      ),
      MoCExchangeLib.TickStage.RECEIVING_ORDERS,
      _priceComparisonPrecision,
      _initialPrice,
      false,
      _initialPrice,
      SMOOTHING_FACTOR,
      _initialPrice
    );
  }

  /**
@notice Returns the tick context of a given pair
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@return tickNumber Current tick number
@return nextTickBlock The first block on which the next tick will be runnable
@return lastTickBlock The first block on which the last tick was run
*/
  function getNextTick(address _baseToken, address _secondaryToken)
    public
    view
    returns (
      uint64 tickNumber,
      uint256 nextTickBlock,
      uint256 lastTickBlock
    )
  {
    MoCExchangeLib.Pair storage pair = tokenPair(_baseToken, _secondaryToken);
    return (pair.tickState.number, pair.tickState.nextTickBlock, pair.tickState.lastTickBlock);
  }

  /**
@notice Returns the amount of pairs that have been added
*/
  function tokenPairCount() public view returns (uint256) {
    return tokenPairAddresses.length;
  }

  /**
@notice Returns all the pairs that have been added
*/
  function getTokenPairs() public view returns (address[2][] memory) {
    return tokenPairAddresses;
  }

  /**
@notice Hashes a pair of tokens
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@return Returns an id that can be used to identify the pair
*/
  function hashAddresses(address _baseToken, address _secondaryToken) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(_baseToken, _secondaryToken));
  }

  /**
@notice Sets last closing price of a pair
@dev Intended to keep a price updated if the pair is no longer enabled or not sufficiently active
and it affects negatively other pairs that depend on this
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@param _price New price to set[base/secondary]
*/
  function setLastClosingPrice(
    address _baseToken,
    address _secondaryToken,
    uint256 _price
  ) public onlyAuthorizedChanger {
    require(_price > 0, "The given initial price should be greater than 0");
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    pair.lastClosingPrice = _price;
  }

  /**
@notice Returns the status of a pair
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@return tickNumber Number of the current tick
@return nextTickBlock Block in which the next tick will be able to run
@return lastTickBlock Block in which the last tick started to run
@return lastClosingPrice Emergent price of the last tick
@return disabled True if the pair is disabled(it can not be inserted any orders); false otherwise
*/
  function getStatus(address _baseToken, address _secondaryToken)
    internal
    view
    returns (
      uint64 tickNumber,
      uint256 nextTickBlock,
      uint256 lastTickBlock,
      uint256 lastClosingPrice,
      bool disabled,
      uint256 emaPrice,
      uint256 smoothingFactor
    )
  {
    return tokenPair(_baseToken, _secondaryToken).getStatus();
  }

  /**
@notice returns the struct for the given pair, reverts if the pair does not exist
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
*/
  function getTokenPair(address _baseToken, address _secondaryToken) internal view returns (MoCExchangeLib.Pair storage pair) {
    pair = tokenPair(_baseToken, _secondaryToken);
    require(pair.isValid(), "Token pair does not exist");
    return pair;
  }

  /**
@notice returns the TokenPair struct for the given id, reverts if the pair does not exist
@param _id Id of the pair
*/
  function getTokenPair(bytes32 _id) internal view returns (MoCExchangeLib.Pair storage pair) {
    pair = tokenPairs[_id];
    require(pair.isValid(), "Token pair does not exist");
    return pair;
  }

  /**
@notice returns the TokenPair struct for the given pair, the returned struct is empty if the pair does not exist
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
*/
  function tokenPair(address _baseToken, address _secondaryToken) internal view returns (MoCExchangeLib.Pair storage) {
    return tokenPairs[hashAddresses(_baseToken, _secondaryToken)];
  }

  /**
@notice Returns true if the given pair has been added previously. It does not affect if the pair has been disabled
Returns true if not
*/
  function validPair(address _baseToken, address _secondaryToken) internal view returns (bool) {
    return tokenPair(_baseToken, _secondaryToken).isValid();
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}
