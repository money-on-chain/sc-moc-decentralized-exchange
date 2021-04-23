// SPDX-License-Identifier: 
// File: openzeppelin-eth/contracts/math/SafeMath.sol

pragma solidity ^0.5.2;

/**
 * @title SafeMath
 * @dev Unsigned math operations with safety checks that revert on error
 */
library SafeMath {
    /**
     * @dev Multiplies two unsigned integers, reverts on overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b);

        return c;
    }

    /**
     * @dev Integer division of two unsigned integers truncating the quotient, reverts on division by zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Subtracts two unsigned integers, reverts on overflow (i.e. if subtrahend is greater than minuend).
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Adds two unsigned integers, reverts on overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a);

        return c;
    }

    /**
     * @dev Divides two unsigned integers and returns the remainder (unsigned integer modulo),
     * reverts when dividing by zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b != 0);
        return a % b;
    }
}

// File: openzeppelin-eth/contracts/math/Math.sol

pragma solidity ^0.5.2;

/**
 * @title Math
 * @dev Assorted math operations
 */
library Math {
    /**
     * @dev Returns the largest of two numbers.
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    /**
     * @dev Returns the smallest of two numbers.
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Calculates the average of two numbers. Since these are integers,
     * averages of an even and odd number cannot be represented, and will be
     * rounded down.
     */
    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        // (a + b) / 2 can overflow, so we distribute
        return (a / 2) + (b / 2) + ((a % 2 + b % 2) / 2);
    }
}

// File: contracts/interface/IPriceProvider.sol

pragma solidity 0.5.8;

/**
 * @notice Get price of a Token. See https://github.com/money-on-chain/OMoC-Decentralized-Oracle
 * @dev Interface of OMoC-Decentralized-Oracle, compatible with MOC.
 */
interface IPriceProvider {
  function peek() external view returns (bytes32, bool);
}

// File: contracts/interface/IMoCDecentralizedExchange.sol

pragma solidity 0.5.8;


contract IMoCDecentralizedExchange {

  function getTokenPairStatus(address _baseToken, address _secondaryToken)
    external
    view
    returns (
      uint256 emergentPrice,
      uint256 lastBuyMatchId,
      uint256 lastBuyMatchAmount,
      uint256 lastSellMatchId,
      uint64 tickNumber,
      uint256 nextTickBlock,
      uint256 lastTickBlock,
      uint256 lastClosingPrice,
      bool disabled,
      uint256 emaPrice,
      uint256 smoothingFactor,
      uint256 marketPrice
    );

  function getLastClosingPrice(address _baseToken, address _secondaryToken) external view returns (uint256 lastClosingPrice) ;

  function getEmergentPrice(address _baseToken, address _secondaryToken)
    public
    view
    returns (
      uint256 emergentPrice,
      uint256 lastBuyMatchId,
      uint256 lastBuyMatchAmount,
      uint256 lastSellMatchId
    );

  function getMarketPrice(address _baseToken, address _secondaryToken) public view returns (uint256);

}

// File: contracts/price-providers/PriceProviderFallback.sol

pragma solidity 0.5.8;



/**
  @notice if the main price source is not available, falls back to dex
          getLastClosingPrice method for the given pair
  @dev This is an abstract contract as failablePeek() should be overriten
  FIXME: if bumping to solidity 0.6, add "abstract" and "virtual" reserved words for readability
*/
contract PriceProviderFallback is IPriceProvider {
  IMoCDecentralizedExchange public dex;
  address public baseToken;
  address public secondaryToken;

  /**
    @param _dex contract to query for getLastClosingPrice fo the given pair
    @param _baseToken base token of the pair to get the price from
    @param _secondaryToken secondary token of the pair to get the price from
  */
  constructor(
    IMoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public {
    dex = _dex;
    baseToken = _baseToken;
    secondaryToken = _secondaryToken;
  }

  /**
    @dev quesries for failablePeek, and if get's and not valid price
         falls back to the getLastClosingPrice price
    @return the price, always true.
  */
  function peek() external view returns (bytes32, bool) {
    (bytes32 price, bool isValid) = failablePeek();
    bytes32 finalPrice = isValid ? price : fallbackPrice();
    return (finalPrice, finalPrice != 0);
  }

  /**
    @notice main source of this pair price
    @return the price and true/false whether it's valid or not
  */
  function failablePeek() internal view returns (bytes32, bool);

  function fallbackPrice() internal view returns (bytes32) {
    uint256 lastClosingPrice = dex.getLastClosingPrice(baseToken, secondaryToken);
    return bytes32(lastClosingPrice);
  }

}

// File: contracts/interface/IMocState.sol

pragma solidity 0.5.8;

/**
 * @notice Interface for MocState price providers relevant methods
 */
interface IMocState {

  /**
  * @dev BPro USD PRICE
  * @return the BPro USD Price [using mocPrecision]
  */
  function bproUsdPrice() external view returns(uint256);

  /**
  * @dev BTC price of BPro
  * @return the BPro Tec Price [using reservePrecision]
  */
  function bproTecPrice() external view returns(uint256);

  /**
  * @dev Gets the BTCPriceProviderAddress
  * @return btcPriceProvider blocks there are in a day
  **/
  function getBtcPriceProvider() external view returns(address);
}

// File: contracts/price-providers/TexMocBtcPriceProviderFallback.sol

pragma solidity 0.5.8;





/**
  @notice gets the Bitcoin Price from MocState contract
*/
contract TexMocBtcPriceProviderFallback is PriceProviderFallback {
  using SafeMath for uint256;
  IMocState public mocState;
  address public baseTokenDocMoc;
  address public secondaryTokenDocMoc;
  uint256 public constant RATE_PRECISION = uint256(10**18);

  constructor(
    IMocState _mocState,
    IMoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken,
    address _baseTokenDocMoc,
    address _secondaryTokenDocMoc
  ) public PriceProviderFallback(_dex, _baseToken, _secondaryToken) {
    mocState = _mocState;
    baseTokenDocMoc = _baseTokenDocMoc;
    secondaryTokenDocMoc = _secondaryTokenDocMoc;
  }

  function failablePeek() internal view returns (bytes32, bool) {
    // MocState BtcPriceProvider is complient with IPriceProvider interface
    IPriceProvider priceProvider = IPriceProvider(mocState.getBtcPriceProvider());
    (bytes32 btcPrice, bool isValid) = priceProvider.peek();
    // Only if MocState BtcPriceProvider has a valid price
    if (isValid && btcPrice != bytes32(0)) {
      uint256 lastClosingPriceDoCMoc = dex.getLastClosingPrice(baseTokenDocMoc, secondaryTokenDocMoc);
      //uint256 mocPriceBtc = lastClosingPriceDoCMoc.div(uint256(btcPrice));
      uint256 mocPriceBtc = lastClosingPriceDoCMoc.mul(RATE_PRECISION).div(uint256(btcPrice));
      return (bytes32(mocPriceBtc), mocPriceBtc != 0);
    }
    return (0, false);
  }
}
