pragma solidity 0.5.8;

import "../interface/IPriceProvider.sol";

contract TokenPriceProviderFake is IPriceProvider {
  bytes32 tokenPrice;
  bool has;

  constructor() public {
    tokenPrice = bytes32(uint(2 * 10 ** 18));
    has = true;
  }

  function peek() external view returns (bytes32, bool) {
    return (tokenPrice, has);
  }

  function poke(uint256 _tokenPrice) external {
    tokenPrice = bytes32(_tokenPrice);
  }
}