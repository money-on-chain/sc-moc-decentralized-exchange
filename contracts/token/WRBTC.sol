// FIXME: this is licensed under gplv3, check that we respect it when releasing the source code
// https://kovan.etherscan.io/address/0xd0A1E359811322d97991E03f863a0C30C2cF029C#contracts

pragma solidity 0.5.8;

contract WRBTC {
  string public name = "Wrapped RSK Bitcoin";
  string public symbol = "WRBTC";
  uint8  public decimals = 18;

  event  Approval(address indexed src, address indexed guy, uint wad);
  event  Transfer(address indexed src, address indexed dst, uint wad);
  event  Deposit(address indexed dst, uint wad);
  event  Withdrawal(address indexed src, uint wad);

  mapping (address => uint) public  balanceOf;
  mapping (address => mapping (address => uint)) public  allowance;

  function() external payable {
    deposit();
  }

  function deposit() public payable {
    balanceOf[msg.sender] += msg.value;
    emit Deposit(msg.sender, msg.value);
  }

  function withdraw(uint wad) public {
    require(balanceOf[msg.sender] >= wad);
    balanceOf[msg.sender] -= wad;
    msg.sender.transfer(wad);
    emit Withdrawal(msg.sender, wad);
  }

  function totalSupply() public view returns (uint) {
    return address(this).balance;
  }

  function approve(address guy, uint wad) public returns (bool) {
    allowance[msg.sender][guy] = wad;
    emit Approval(msg.sender, guy, wad);
    return true;
  }

  function transfer(address dst, uint wad) public returns (bool) {
    return transferFrom(msg.sender, dst, wad);
  }

  function transferFrom(address src, address dst, uint wad)
    public
    returns (bool)
  {
    require(balanceOf[src] >= wad);

    if (src != msg.sender && allowance[src][msg.sender] != uint(-1)) {
      require(allowance[src][msg.sender] >= wad);
      allowance[src][msg.sender] -= wad;
    }

    balanceOf[src] -= wad;
    balanceOf[dst] += wad;

    emit Transfer(src, dst, wad);

    return true;
  }
}
