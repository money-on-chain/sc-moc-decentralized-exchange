pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "areopagus/contracts/Governance/Governed.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";

/**
  @notice This contract is in charge of keeping track of the charged commissions
  and calculating the commissions to reserve/charge depending on the operation and
  the amount of the order.DESPITE WORKING AS A TRACKER IT DOESN'T KEEP THE FUNDS
  @dev Should only be callable by dex, so this contract inherits from Ownable and should
  have dex as its owner
 */
contract CommissionManager is Governed, Ownable {
  using SafeMath for uint256;

  /** mapping for the commission collected by MOCDEX */
  mapping (address => uint256) public exchangeCommissions;

  address public beneficiaryAddress;
  uint256 public commissionRate;
  uint256 public cancelationPenaltyRate;
  uint256 public expirationPenaltyRate;
  uint256 constant public RATE_PRECISION = uint256(10 ** 18);

  /**
    @notice Checks that _rate is a valid rate, i.e. it is between 1(RATE_PRECISION)
    and 0; fails otherwise
    @param _rate Rate to be checked
  */
  modifier isValidRate(uint256 _rate) {
    require(_rate <= RATE_PRECISION, "rate should to be in relation to 1");
    _;
  }

  /**
    @notice Checks that _address is not zero; fails otherwise
    @param _address Address to be checked
  */
  modifier isValidAddress(address _address, string memory message) {
    require(_address != address(0), message);
    _;
  }

  /**
    @notice Calculates the commission to be charged for an order matching, also adds the said
    amount as a charged commission
    IT DOESN'T KEEP THE FUNDS NOR MOVES ANY
    @param _orderAmount order's exchangeableAmount amount
    @param _matchedAmount the order amount that is being exchanged in this iteration
    @param _commission the order reserved commission
    @param _tokenAddress the token that it's being exchanged
    @return the commission amount that its being charged in this iteration
  */
  function chargeCommissionForMatch(uint256 _orderAmount, uint256 _matchedAmount, uint256 _commission, address _tokenAddress)
    external onlyOwner returns(uint256) {
    assert(_orderAmount >= _matchedAmount);
    uint256 finalCommission = _matchedAmount.mul(_commission).div(_orderAmount);
    exchangeCommissions[_tokenAddress] = exchangeCommissions[_tokenAddress].add(finalCommission);
    return finalCommission;
  }

  /**
    @notice Calculates the commission to be charged for an expiration/cancelation, also adds the said
    amount as a charged commission
    IT DOESN'T KEEP THE FUNDS NOR MOVES ANY
    @param _commission The remaining of the commission reserved at the insertion of the order
    @param _tokenAddress The address of the token
    @param _isExpiration If true order is taken as expired; else is taken as cancelled
    @return the commission amount that its being charged in this iteration
  */
  function chargeExceptionalCommission(uint256 _commission, address _tokenAddress, bool _isExpiration)
    external onlyOwner returns(uint256) {
    return chargeCommission(_commission, _isExpiration ? expirationPenaltyRate : cancelationPenaltyRate, _tokenAddress);
  }

  /**
    @notice Calculates the commission to be reserved in the insertion of an order
    IT DOESN'T KEEP THE FUNDS NOR MOVES ANY NOR TRACKS THE RETURNED AS CHARGED COMMISSION(IT IS JUST RESERVED)
    @param _amount Order locked amount
   */
  function calculateInitialFee(uint256 _amount) external view returns(uint256) {
    return _amount.mul(commissionRate).div(RATE_PRECISION);
  }

  /**
    @param _beneficiaryAddress address to transfer the commission when instructed to
  */
  function setBeneficiaryAddress(address _beneficiaryAddress) external onlyAuthorizedChanger {
    require(_beneficiaryAddress != address(0), "beneficiaryAddress cannot be null");
    beneficiaryAddress = _beneficiaryAddress;
  }

  /**
    @param _commissionRate wad from 0 to 1 that represents the rate of the order amount to be charged as commission
  */
  function setCommissionRate(uint256 _commissionRate) external onlyAuthorizedChanger isValidRate(_commissionRate) {
    commissionRate = _commissionRate;
  }

  /**
    @param _cancelationPenaltyRate wad from 0 to 1 that represents the rate of the commission to charge as cancelation penalty, 1 represents the full commission
  */
  function setCancelationPenaltyRate(uint256 _cancelationPenaltyRate) external onlyAuthorizedChanger isValidRate(_cancelationPenaltyRate) {
    cancelationPenaltyRate = _cancelationPenaltyRate;
  }

  /**
    @param _expirationPenaltyRate wad from 0 to 1 that represents the rate of the commission to charge when the order expire, 1 represents the full commission
  */
  function setExpirationPenaltyRate(uint256 _expirationPenaltyRate) external onlyAuthorizedChanger isValidRate(_expirationPenaltyRate) {
    expirationPenaltyRate = _expirationPenaltyRate;
  }

  /**
    @notice Sets the charged commissions back to 0 for a given token
    It should be called after a withdrawal of the charged commissions
    IT DOESN'T MOVE ANY FUNDS
    @param _tokenAddress Address of the contract which manages the token
    in which the commissions were charged
   */
  function clearExchangeCommissions(address _tokenAddress) external onlyOwner {
    exchangeCommissions[_tokenAddress] = 0;
  }

  /**
    @dev This function must initialize every variable in storage, this is necessary because of the proxy
    pattern we are using. The initializer modifier disables this function once its called so it prevents
    that someone else calls it without the deployer noticing. Of course they may block your deploys but that
    would be an extremely unlucky scenario. onlyAuthorizedChanger cannot be used here since the governor is not set yet
    @param _beneficiaryAddress address to transfer the commission when instructed to
    @param _commissionRate wad from 0 to 1 that represents the rate of the order amount to be charged as commission
    @param _cancelationPenaltyRate wad from 0 to 1 that represents the rate of the commission to charge as cancelation penalty, 1 represents the full commission
    @param _expirationPenaltyRate wad from 0 to 1 that represents the rate of the commission to charge when the order expire, 1 represents the full commission
    @param _governor Address in charge of determining who is authorized and who is not
    @param _owner Dex contract
 */
  function initialize(
    address _beneficiaryAddress,
    uint256 _commissionRate,
    uint256 _cancelationPenaltyRate,
    uint256 _expirationPenaltyRate,
    address _governor,
    address _owner
  ) external initializer isValidRate(_commissionRate)
    isValidRate(_cancelationPenaltyRate) isValidRate(_expirationPenaltyRate)
    isValidAddress(_beneficiaryAddress, "beneficiaryAddress cannot be null")
    isValidAddress(_governor, "governor cannot be null")
    isValidAddress(_owner, "owner cannot be null") {
    beneficiaryAddress = _beneficiaryAddress;
    commissionRate = _commissionRate;
    cancelationPenaltyRate = _cancelationPenaltyRate;
    expirationPenaltyRate = _expirationPenaltyRate;
    Governed.initialize(_governor);
    Ownable.initialize(_owner);
  }

  /**
    @notice Calculates the commission to be charged for a given percentage of the reserved commission,
    also adds the said amount as a charged commission
    IT DOESN'T KEEP THE FUNDS NOR MOVES ANY
    @param _fullCommission The remaining of the commission reserved at the insertion of the order
    @param _tokenAddress The address of the token
    @param _rate Rate of the commission to be charged
    @return the commission amount that its being charged in this iteration
  */
  function chargeCommission(uint256 _fullCommission, uint256 _rate, address _tokenAddress)
    private returns(uint256) {
    uint256 finalCommission = _fullCommission.mul(_rate).div(RATE_PRECISION);
    exchangeCommissions[_tokenAddress] = exchangeCommissions[_tokenAddress].add(finalCommission);
    return finalCommission;
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}
