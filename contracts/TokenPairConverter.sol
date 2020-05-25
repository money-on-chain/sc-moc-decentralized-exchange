pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/math/SafeMath.sol";

import "./TokenPairListing.sol";


contract TokenPairConverter is TokenPairListing {
  using SafeMath for uint256;

  address private commonBaseTokenAddress;

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
    uint256 _priceComparisonPrecision,
    uint256 _initialPrice
  ) public {
    // The TokenPairListing validates the caller is an authorized changer
    require(_baseToken == commonBaseTokenAddress || validPair(commonBaseTokenAddress, _baseToken), "Invalid Pair");
    TokenPairListing.addTokenPair(_baseToken, _secondaryToken, _priceComparisonPrecision, _initialPrice);
  }

  /**
    @dev simple converter from the given token to a common base, in this case, Dollar on Chain
    @param _tokenAddress the token address of token to convert into the common base token
    @param _amount the amount to convert
    @param _baseAddress the address of the base of the pair in witch the token its going to operate.
    if the the token it is allready the base of the pair, this parameter it is unimportant
    @return convertedAmount the amount converted into the common base token
  */
  function convertTokenToCommonBase(
    address _tokenAddress,
    uint256 _amount,
    address _baseAddress
  ) public view returns (uint256 convertedAmount) {
    if (_tokenAddress == commonBaseTokenAddress) {
      return _amount;
    }
    MoCExchangeLib.Pair storage pair = tokenPair(commonBaseTokenAddress, _tokenAddress);
    if (pair.isValid()) {
      return MoCExchangeLib.convertToBase(_amount, pair.emaPrice, pair.priceComparisonPrecision);
    }

    pair = tokenPair(commonBaseTokenAddress, _baseAddress);
    if (pair.isValid()) {
      uint256 intermediaryAmount = MoCExchangeLib.convertToBase(_amount, pair.emaPrice, pair.priceComparisonPrecision);
      pair = tokenPair(_baseAddress, _tokenAddress);
      if (pair.isValid()) {
        return MoCExchangeLib.convertToBase(intermediaryAmount, pair.emaPrice, pair.priceComparisonPrecision);
      }
    }

    /** There was no possible conversion from the given token to the common base */
    return ~uint256(0);
  }

  /**
    @param _commonBaseTokenAddress address of the common base token, necessary to convert amounts to a known scale
    @param _expectedOrdersForTick amount of orders expected to match in each tick
    @param _maxBlocksForTick the max amount of blocks to wait until allowing to run the tick
    @param _minBlocksForTick the min amount of blocks to wait until allowing to run the tick
    @param _governor Address in charge of determining who is authorized and who is not
 */
  function initialize(
    address _commonBaseTokenAddress,
    uint64 _expectedOrdersForTick,
    uint64 _maxBlocksForTick,
    uint64 _minBlocksForTick,
    address _governor
  ) internal initializer {
    require(_commonBaseTokenAddress != address(0), "commoBaseTokenAddress cannot be null");
    commonBaseTokenAddress = _commonBaseTokenAddress;
    ConfigurableTick.initialize(_expectedOrdersForTick, _maxBlocksForTick, _minBlocksForTick, _governor);
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}
