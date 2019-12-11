pragma solidity 0.5.8;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


/** This ERC20 contract is only for testing purposes, it allows to
 * force a revert when an specif user is involved on a transfer
 * opeartcion as receipient
 */
contract ERC20WithBlacklist is ERC20Mintable, ERC20Detailed, Ownable {

  string _name = "Test Blacklist";
  string _symbol = "BKL";
  uint8 _decimals = 18;

  mapping (address => bool) private blacklistedUsers;

  constructor() ERC20Detailed(_name, _symbol, _decimals) public {

  }

  modifier notBlacklistedListed(address userAddress) {
    require(!blacklistedUsers[userAddress]);
    _;
  }

  function blacklist(address toBlacklist) public onlyOwner() {
    blacklistedUsers[toBlacklist] = true;
  }

  function transfer(address to, uint256 value) public notBlacklistedListed(to) returns (bool) {
    return super.transfer(to, value);
  }

  function transferFrom(address from, address to, uint256 value) public notBlacklistedListed(to) returns (bool) {
    return super.transferFrom(from, to, value);
  }
}