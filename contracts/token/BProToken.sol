pragma solidity 0.5.8;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "./OwnerBurnableToken.sol";


contract BProToken is ERC20Mintable, ERC20Detailed, ERC20Pausable, OwnerBurnableToken {
  string _name = "BITPRO";
  string _symbol = "BITPRO";
  uint8 _decimals = 18;

  constructor() public Ownable() ERC20Detailed(_name, _symbol, _decimals) {}

  //Fallback
  function() external {}
}
