pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "../interface/IMocState.sol";
import "../interface/IPriceProvider.sol";

contract MocStateFake is IMocState {

  using SafeMath for uint256;
  uint256 constant PRECISION = uint256(10**18);

  uint256 public nB;
  uint256 public nDoc;
  uint256 public nTP;

  IPriceProvider btcPriceProvider;

  constructor(address _btcPriceProvider, uint256 _nB, uint256 _nDoc, uint256 _nTP) public {
    btcPriceProvider = IPriceProvider(_btcPriceProvider);
    nB = _nB;
    nDoc = _nDoc;
    nTP = _nTP;
  }

  /** @dev Only for test purposes, not actual part of MocState */
  function setNB(uint256 _nB) external {
    nB = _nB;
  }

  /**
  * @dev Gets the BTCPriceProviderAddress
  * @return btcPriceProvider blocks there are in a day
  **/
  function getBtcPriceProvider() external view returns(address) {
    return address(btcPriceProvider);
  }

  function getBitcoinPrice() public view returns(uint256) {
    (bytes32 price, bool has) = btcPriceProvider.peek();
    require(has, "Oracle have no Bitcoin Price");

    return uint256(price);
  }

  /**
  * @dev BPro USD PRICE
  * @return the BPro USD Price [using mocPrecision]
  */
  function bproUsdPrice() public view returns(uint256) {
    uint256 bproBtcPrice = bproTecPrice();
    uint256 btcPrice = getBitcoinPrice();

    return btcPrice.mul(bproBtcPrice).div(PRECISION);
  }

  /**
  * @dev BTC price of BPro
  * @return the BPro Tec Price [using reservePrecision]
  */
  function bproTecPrice() public view returns(uint256) {
    uint256 lb = lockedBitcoin();

    // Liquidation happens before this condition turns true
    if (nB < lb) {
      return 0;
    }

    if (nTP == 0) {
      return PRECISION;
    }
    // ([RES] - [RES]) * [MOC] / [MOC]
    return nB.sub(lb).mul(PRECISION).div(nTP);
  }

  function lockedBitcoin() public view returns(uint256) {
    return nDoc.mul(PRECISION).div(getBitcoinPrice());
  }
}
