pragma solidity 0.5.8;

import "../interface/IPriceProvider.sol";

contract TokenPriceProviderMock is IPriceProvider {
  bytes32 tokenPrice;
  bool has;

  constructor(uint256 _initialTokenPrice) public {
    tokenPrice = bytes32(_initialTokenPrice);
    has = true;
  }

  function peek() external view returns (bytes32, bool) {
    return (tokenPrice, has);
  }

  function poke(uint128 _tokenPrice) external {
    tokenPrice = bytes32(uint256(_tokenPrice));
  }
}