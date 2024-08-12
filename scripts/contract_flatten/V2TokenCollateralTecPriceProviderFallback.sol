// SPDX-License-Identifier: 
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

// File: contracts/price-providers/V2TokenCollateralTecPriceProviderFallback.sol

pragma solidity 0.5.8;




/**
  @notice gets the technical price from V2 Protocol
  @dev Parameters the MoC V2 address
  The TP address is need to verified if is the protocol has valid price or not
*/
contract V2TokenCollateralTecPriceProviderFallback is PriceProviderFallback {

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
            return (tecPriceBytes, true);
        }
    }

    return (0, false);
  }
}
