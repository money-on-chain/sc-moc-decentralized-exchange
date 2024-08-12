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

// File: contracts/interface/IMoCV2.sol

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;


/**
 * @notice Interface for MocState price providers relevant methods
 */
interface IMoCV2 {

    struct PegContainerItem {
        // total supply of Pegged Token
        uint256 nTP;
        // PegToken PriceFeed address
        IPriceProvider priceProvider;
    }

    struct PeggedTokenIndex {
        // Pegged Token index
        uint256 index;
        // true if Pegged Token exists
        bool exists;
    }

    function peggedTokenIndex(address tp) external view returns (PeggedTokenIndex memory);
    function pegContainer(uint256 index) external view returns (PegContainerItem memory);

    /**
    * @dev get Collateral Token price
    * @return pTCac [PREC]
    */
    function getPTCac() external view returns(uint256);


}

// File: contracts/price-providers/V2TokenCollateralPeggedPriceProviderFallback.sol

pragma solidity 0.5.8;






/**
  @notice gets the technical price from V2 Protocol and covert it to pegged price
  @dev Parameters the MoC V2 address
  The TP address is need to verified if is the protocol has valid price or not
*/
contract V2TokenCollateralPeggedPriceProviderFallback is PriceProviderFallback {

  using SafeMath for uint256;
  uint256 public constant RATE_PRECISION = uint256(10**18);

  IMoCV2 public mocV2;
  address public tpAddress;

  constructor(
    IMoCV2 _mocV2,
    address _tpAddress,
    IMoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public PriceProviderFallback(_dex, _baseToken, _secondaryToken) {
    mocV2 = _mocV2;
    tpAddress = _tpAddress;
  }

  function failablePeek() internal view returns (bytes32, bool) {

    IMoCV2.PeggedTokenIndex memory tpIndex = mocV2.peggedTokenIndex(tpAddress);

    if (!tpIndex.exists) {
      // If not exist is not a valid price
      return (0, false);
    }

    IMoCV2.PegContainerItem memory tpItem = mocV2.pegContainer(tpIndex.index);
    IPriceProvider priceProvider = IPriceProvider(tpItem.priceProvider);
    (bytes32 price, bool isValid) = priceProvider.peek();

    // Only if has a valid price
    if (isValid && price != bytes32(0)) {
      uint256 tecPrice = mocV2.getPTCac();
      bytes32 tecPriceBytes = bytes32(tecPrice);
      if (tecPriceBytes != bytes32(0)) {
        uint256 calculatedPrice = tecPrice.mul(uint256(price)).div(RATE_PRECISION);
        return (bytes32(calculatedPrice), true);
      }
    }

    return (0, false);
  }
}
