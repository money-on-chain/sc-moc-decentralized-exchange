pragma solidity 0.5.8;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./OwnerBurnableToken.sol";


contract DocToken is ERC20Mintable, ERC20Detailed, OwnerBurnableToken {
  string _name = "Dollar on Chain";
  string _symbol = "DOC";
  uint8 _decimals = 18;

  constructor() public Ownable() ERC20Detailed(_name, _symbol, _decimals) {}

  //Fallback
  function() external {}
}
