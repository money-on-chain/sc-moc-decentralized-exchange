pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/math/Math.sol";
import "../MoCDecentralizedExchange.sol";

contract YourInsertOrder {
    using SafeMath for uint256;
    MoCDecentralizedExchange public tex;
    address public baseTokenAddress;
    address public secondaryTokenAddress;
    address public commissionAddress;
    uint256 public buyOperations = 0;
    uint256 public totalAmountOfBuyWithoutCommissions = 0;

    constructor(
        MoCDecentralizedExchange _tex,
        address _base,
        address _secondary,
        address _commissionAddress
        ) public {
        tex = _tex;
        baseTokenAddress = _base;
        secondaryTokenAddress = _secondary;
        commissionAddress = _commissionAddress;
    }

    /**
      @notice Approves a token to use in TEX Platform.
      @param _tokenAddress addrress of the ERC-20 token
      @param _amount The amount to aprove
    */
    function setAllowance(address _tokenAddress, uint256 _amount) public {
      IERC20 token = IERC20(_tokenAddress);
      bool success = token.approve(address(tex), _amount);
      require(success, "Approval not done");
    }

    function yourInsertBuyOrderFirst(uint256 _amount, uint256 _price, uint64 _lifespan) public {
        IERC20 base = IERC20(baseTokenAddress);
        require(base.allowance(msg.sender, address(tex)) > 0, "Base token without allowance");
        //Calc and transfer the commissions of your platform.
        uint256 commissions = calcCommissions(_amount);
        bool success = base.transfer(commissionAddress, commissions);
        require(success, "Commission transfer failed");

        //Insert the new buy order at start
        tex.insertBuyOrder(
            baseTokenAddress,
            secondaryTokenAddress,
            _amount.sub(commissions),
            _price,
            _lifespan);

        //Saves information to platform
        totalAmountOfBuyWithoutCommissions.add(_amount);
        buyOperations.add(1);
    }

    function calcCommissions(uint256 _amount) public view returns (uint256) {
        return _amount.div(100);
    }
}