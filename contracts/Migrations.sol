pragma solidity 0.5.8;


contract Migrations {
  address public owner;
  // solium-disable-next-line
  uint256 public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  constructor() public {
    owner = msg.sender;
  }

  function setCompleted(uint256 completed) public restricted {
    last_completed_migration = completed;
  }

  function upgrade(address newAddress) public restricted {
    Migrations upgraded = Migrations(newAddress);
    upgraded.setCompleted(last_completed_migration);
  }
}
