pragma solidity 0.5.8;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./OwnerBurnableToken.sol";

contract TestToken is ERC20Mintable, ERC20Detailed, OwnerBurnableToken {

  string _name = "Test Dollar on Chain";
  string _symbol = "TDOC";
  uint8 _decimals = 15;

  constructor() Ownable() ERC20Detailed(_name, _symbol, _decimals) public {

  }

  //Fallback
  function() external {
  }
}
