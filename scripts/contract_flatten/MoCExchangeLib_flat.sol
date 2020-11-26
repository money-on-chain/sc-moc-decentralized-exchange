// SPDX-License-Identifier: 
// File: openzeppelin-eth/contracts/token/ERC20/IERC20.sol

pragma solidity ^0.5.2;

/**
 * @title ERC20 interface
 * @dev see https://eips.ethereum.org/EIPS/eip-20
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);

    function approve(address spender, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address who) external view returns (uint256);

    function allowance(address owner, address spender) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// File: openzeppelin-eth/contracts/math/SafeMath.sol

pragma solidity ^0.5.2;

/**
 * @title SafeMath
 * @dev Unsigned math operations with safety checks that revert on error
 */
library SafeMath {
    /**
     * @dev Multiplies two unsigned integers, reverts on overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b);

        return c;
    }

    /**
     * @dev Integer division of two unsigned integers truncating the quotient, reverts on division by zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Subtracts two unsigned integers, reverts on overflow (i.e. if subtrahend is greater than minuend).
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Adds two unsigned integers, reverts on overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a);

        return c;
    }

    /**
     * @dev Divides two unsigned integers and returns the remainder (unsigned integer modulo),
     * reverts when dividing by zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b != 0);
        return a % b;
    }
}

// File: openzeppelin-eth/contracts/math/Math.sol

pragma solidity ^0.5.2;

/**
 * @title Math
 * @dev Assorted math operations
 */
library Math {
    /**
     * @dev Returns the largest of two numbers.
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    /**
     * @dev Returns the smallest of two numbers.
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Calculates the average of two numbers. Since these are integers,
     * averages of an even and odd number cannot be represented, and will be
     * rounded down.
     */
    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        // (a + b) / 2 can overflow, so we distribute
        return (a / 2) + (b / 2) + ((a % 2 + b % 2) / 2);
    }
}

// File: zos-lib/contracts/Initializable.sol

pragma solidity >=0.4.24 <0.6.0;


/**
 * @title Initializable
 *
 * @dev Helper contract to support initializer functions. To use it, replace
 * the constructor with a function that has the `initializer` modifier.
 * WARNING: Unlike constructors, initializer functions must be manually
 * invoked. This applies both to deploying an Initializable contract, as well
 * as extending an Initializable contract via inheritance.
 * WARNING: When used with inheritance, manual care must be taken to not invoke
 * a parent initializer twice, or ensure that all initializers are idempotent,
 * because this is not dealt with automatically as with constructors.
 */
contract Initializable {

  /**
   * @dev Indicates that the contract has been initialized.
   */
  bool private initialized;

  /**
   * @dev Indicates that the contract is in the process of being initialized.
   */
  bool private initializing;

  /**
   * @dev Modifier to use in the initializer function of a contract.
   */
  modifier initializer() {
    require(initializing || isConstructor() || !initialized, "Contract instance has already been initialized");

    bool isTopLevelCall = !initializing;
    if (isTopLevelCall) {
      initializing = true;
      initialized = true;
    }

    _;

    if (isTopLevelCall) {
      initializing = false;
    }
  }

  /// @dev Returns true if and only if the function is running in the constructor
  function isConstructor() private view returns (bool) {
    // extcodesize checks the size of the code stored in an address, and
    // address returns the current address. Since the code is still not
    // deployed when running a constructor, any checks on its code size will
    // yield zero, making it an effective way to detect if a contract is
    // under construction or not.
    uint256 cs;
    assembly { cs := extcodesize(address) }
    return cs == 0;
  }

  // Reserved storage space to allow for layout changes in the future.
  uint256[50] private ______gap;
}

// File: openzeppelin-eth/contracts/ownership/Ownable.sol

pragma solidity ^0.5.2;


/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable is Initializable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    function initialize(address sender) public initializer {
        _owner = sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @return the address of the owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner());
        _;
    }

    /**
     * @return true if `msg.sender` is the owner of the contract.
     */
    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    /**
     * @dev Allows the current owner to relinquish control of the contract.
     * It will not be possible to call the functions with the `onlyOwner`
     * modifier anymore.
     * @notice Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    uint256[50] private ______gap;
}

// File: areopagus/contracts/Governance/ChangeContract.sol

pragma solidity 0.5.8;

/**
  @title ChangeContract
  @notice This interface is the one used by the governance system.
  @dev If you plan to do some changes to a system governed by this project you should write a contract
  that does those changes, like a recipe. This contract MUST not have ANY kind of public or external function
  that modifies the state of this ChangeContract, otherwise you could run into front-running issues when the governance
  system is fully in place.
 */
interface ChangeContract {

  /**
    @notice Override this function with a recipe of the changes to be done when this ChangeContract
    is executed
   */
  function execute() external;
}

// File: areopagus/contracts/Governance/IGovernor.sol

pragma solidity 0.5.8;


/**
  @title Governor
  @notice Governor interface. This functions should be overwritten to
  enable the comunnication with the rest of the system
  */
interface IGovernor{

  /**
    @notice Function to be called to make the changes in changeContract
    @dev This function should be protected somehow to only execute changes that
    benefit the system. This decision process is independent of this architechture
    therefore is independent of this interface too
    @param changeContract Address of the contract that will execute the changes
   */
  function executeChange(ChangeContract changeContract) external;

  /**
    @notice Function to be called to make the changes in changeContract
    @param _changer Address of the contract that will execute the changes
   */
  function isAuthorizedChanger(address _changer) external view returns (bool);
}

// File: areopagus/contracts/Governance/Governed.sol

pragma solidity 0.5.8;



/**
  @title Governed
  @notice Base contract to be inherited by governed contracts
  @dev This contract is not usable on its own since it does not have any _productive useful_ behaviour
  The only purpose of this contract is to define some useful modifiers and functions to be used on the
  governance aspect of the child contract
  */
contract Governed is Initializable {

  /**
    @notice The address of the contract which governs this one
   */
  IGovernor public governor;

  string constant private NOT_AUTHORIZED_CHANGER = "not_authorized_changer";

  /**
    @notice Modifier that protects the function
    @dev You should use this modifier in any function that should be called through
    the governance system
   */
  modifier onlyAuthorizedChanger() {
    checkIfAuthorizedChanger();
    _;
  }

  /**
    @notice Initialize the contract with the basic settings
    @dev This initialize replaces the constructor but it is not called automatically.
    It is necessary because of the upgradeability of the contracts
    @param _governor Governor address
   */
  function initialize(address _governor) public initializer {
    governor = IGovernor(_governor);
  }

  /**
    @notice Change the contract's governor. Should be called through the old governance system
    @param newIGovernor New governor address
   */
  function changeIGovernor(IGovernor newIGovernor) public onlyAuthorizedChanger {
    governor = newIGovernor;
  }

  /**
    @notice Checks if the msg sender is an authorized changer, reverts otherwise
   */
  function checkIfAuthorizedChanger() internal view {
    require(governor.isAuthorizedChanger(msg.sender), NOT_AUTHORIZED_CHANGER);
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}

// File: contracts/CommissionManager.sol

pragma solidity 0.5.8;








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
  mapping(address => uint256) public exchangeCommissions;

  address public beneficiaryAddress;
  uint256 public commissionRate;
  uint256 public cancelationPenaltyRate;
  uint256 public expirationPenaltyRate;
  uint256 public constant RATE_PRECISION = uint256(10**18);
  uint256 public minimumCommission;

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
    external
    onlyOwner
    returns (uint256)
  {
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
  function chargeExceptionalCommission(uint256 _commission, address _tokenAddress, bool _isExpiration) external onlyOwner returns (uint256) {
    return chargeCommission(_commission, _isExpiration ? expirationPenaltyRate : cancelationPenaltyRate, _tokenAddress);
  }

  /**
    @notice Calculates the commission to be reserved in the insertion of an order
    IT DOESN'T KEEP THE FUNDS NOR MOVES ANY NOR TRACKS THE RETURNED AS CHARGED COMMISSION(IT IS JUST RESERVED)
    @param _amount Order locked amount
    @param _price Price equivalent to 1 DOC
   */
  function calculateInitialFee(uint256 _amount, uint256 _price) external view returns (uint256) {
    uint256 _minimumFixed = minimumCommission.mul(RATE_PRECISION).div(_price);
    uint256 _initialFee = _amount.mul(commissionRate).div(RATE_PRECISION);
    return _minimumFixed.add(_initialFee);
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
    @param _minimumCommission is the minimum commission in DOC reserved in commission
  */
  function setMinimumCommission(uint256 _minimumCommission) external onlyAuthorizedChanger  {
    minimumCommission = _minimumCommission;
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
    address _owner,
    uint256 _minimumCommission
  )
    external
    initializer
    isValidAddress(_beneficiaryAddress, "beneficiaryAddress cannot be null")
    isValidAddress(_governor, "governor cannot be null")
    isValidAddress(_owner, "owner cannot be null")
  {
    require(_commissionRate <= RATE_PRECISION, "commissionRate should to be in relation to 1");
    require(_cancelationPenaltyRate <= RATE_PRECISION, "cancelationPenaltyRate should to be in relation to 1");
    require(_expirationPenaltyRate <= RATE_PRECISION, "expirationPenaltyRate should to be in relation to 1");

    beneficiaryAddress = _beneficiaryAddress;
    commissionRate = _commissionRate;
    minimumCommission = _minimumCommission;
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
  function chargeCommission(uint256 _fullCommission, uint256 _rate, address _tokenAddress) private returns (uint256) {
    uint256 finalCommission = _fullCommission.mul(_rate).div(RATE_PRECISION);
    exchangeCommissions[_tokenAddress] = exchangeCommissions[_tokenAddress].add(finalCommission);
    return finalCommission;
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}

// File: contracts/interface/IPriceProvider.sol

pragma solidity 0.5.8;

/**
 * @notice Get price of a Token. See https://github.com/money-on-chain/OMoC-Decentralized-Oracle
 * @dev Interface of OMoC-Decentralized-Oracle, compatible with MOC.
 */
interface IPriceProvider {
  function peek() external view returns (bytes32, bool);
}

// File: contracts/libs/SafeTransfer.sol

pragma solidity 0.5.8;



library SafeTransfer {
  event TransferFailed(address indexed _tokenAddress, address indexed _to, uint256 _amount, bool _isRevert);

  /**
   * @dev Wraps an RRC20 transfer with a low level call to handle revert secenario
   * Emits TransferFailed with _isRevert flag on in case it actually revert, false on case the call result is false
   * @param _token ERC20 token to transfer from.
   * @param _to receipint address
   * @param _amount to be transfere
   * @return true if completed, false if reverted or token returns false
   */
  function doTransfer(IERC20 _token, address _to, uint256 _amount) internal returns (bool) {
    // This creates a low level call to the _token
    // solium-disable-next-line security/no-low-level-calls
    (bool success, bytes memory returnData) = address(_token).call(
      abi.encodePacked( // This encodes the function to call and the parameters to pass to that function
        _token.transfer.selector, // This is the function identifier of the function we want to call
        abi.encode(_to, _amount) // This encodes the parameter we want to pass to the function
      )
    );
    if (success) {
      // transfer completed successfully (did not revert)
      bool callResult = abi.decode(returnData, (bool));
      // transfer could have return false thou, indicating the operation was not completed
      if (!callResult) emit TransferFailed(address(_token), _to, _amount, false);
      return callResult;
    } else {
      // transfer reverted
      emit TransferFailed(address(_token), _to, _amount, true);
      return false;
    }
  }
}

// File: contracts/libs/TickState.sol

pragma solidity 0.5.8;




/**
  @notice This library manages the inter-tick state(not intra-tick)
 */
library TickState {
  using SafeMath for uint256;

  /**
    @notice notifies the start of the tick
    @param baseTokenAddress the base token of the pair
    @param secondaryTokenAddress the secondary token of the pair
    @param number the tick number that just started
 */
  event TickStart(address indexed baseTokenAddress, address indexed secondaryTokenAddress, uint64 number);

  /**
    @notice notifies the end of the tick and its result
    @param baseTokenAddress the base token of the pair
    @param secondaryTokenAddress the secondary token of the pair
    @param number the tick number that just finished
    @param nextTickBlock the block number after wich one it can be excecuted the next tick
    @param closingPrice the price [using priceComparisonPrecision] used to match the orders this tick
 */
  event TickEnd(
    address indexed baseTokenAddress,
    address indexed secondaryTokenAddress,
    uint64 indexed number,
    uint256 nextTickBlock,
    uint256 closingPrice
  );

  /**
    @param expectedOrdersForTick amount of orders expected to match in each tick
    @param maxBlocksForTick the max amount of blocks to await until allowing to run the tick
    @param minBlocksForTick the min amount of blocks to await until allowing to run the tick
 */
  struct Config {
    uint256 expectedOrdersForTick;
    uint256 maxBlocksForTick;
    uint256 minBlocksForTick;
  }

  /**
    @param number the current tick number
    @param nextTickBlock the block number after wich one it can be excecuted the next tick
    @param lastTickBlock the block number in which one the last tick was executed
    @param blockNumberWhenTickStarted 0 when the contract is reciving orders,
      the block number in which one the tick was executed as the tick started
  */
  struct Data {
    uint256 nextTickBlock;
    uint256 lastTickBlock;
    uint256 blockNumberWhenTickStarted;
    uint64 number;
  }

  /**
    @dev reverts if the block since which this tick matching can be executed has not been reached yet
  */
  function startTick(Data storage _self, address _baseTokenAddress, address _secondaryTokenAddress) internal {
    require(block.number >= _self.nextTickBlock, "Next tick not reached");
    _self.blockNumberWhenTickStarted = block.number;
    emit TickStart(_baseTokenAddress, _secondaryTokenAddress, _self.number);
  }

  /**
    @dev Given Tick processing is completed, nextTick calculates and sets the tick state for the
    following execution. Also emitts the TickEnd event.
    @param _baseTokenAddress the base token of the pair involved in this tick
    @param _secondaryTokenAddress the secondary token of the pair involved in this tick
    @param _config ticks confirguration
    @param _closingPrice emergent price resulted from this ticks matching
    @param _actualOrders amount of orders matched on this ticks execution
  */
  function nextTick(
    Data storage _self,
    address _baseTokenAddress,
    address _secondaryTokenAddress,
    Config memory _config,
    uint256 _closingPrice,
    uint256 _actualOrders
  ) internal {
    assert(_self.blockNumberWhenTickStarted != 0);
    uint64 previousTickNumber = _self.number;

    // Calculate the minimum amount of blocks until the contract allows to run the tick again
    uint256 blocksUntilNextTick = calculateBlocks(
      _config.expectedOrdersForTick,
      _self.lastTickBlock,
      _config.maxBlocksForTick,
      _config.minBlocksForTick,
      Math.max(_actualOrders, 1),
      _self.blockNumberWhenTickStarted
    );

    _self.lastTickBlock = _self.blockNumberWhenTickStarted;
    _self.nextTickBlock = _self.blockNumberWhenTickStarted + blocksUntilNextTick;
    _self.number = _self.number + 1;
    _self.blockNumberWhenTickStarted = 0;

    emit TickEnd(_baseTokenAddress, _secondaryTokenAddress, previousTickNumber, _self.nextTickBlock, _closingPrice);
  }

  /**
    @notice Calculate the block that should pass until the next tick is available
    @param _expectedOrdersForTick Ideal amount of matching orders per tick
    @param _lastTickBlock The block in which the last tick was run
    @param _maxBlocksForTick The max blocks between two ticks
    @param _minBlocksForTick The mix blocks between two ticks
    @param _actualOrders The amount of matched orders
    @param _currentBlockNumber The current block number
    @return Blocks that should pass until the next tick
  */
  function calculateBlocks(
    uint256 _expectedOrdersForTick,
    uint256 _lastTickBlock,
    uint256 _maxBlocksForTick,
    uint256 _minBlocksForTick,
    uint256 _actualOrders,
    uint256 _currentBlockNumber
  ) private pure returns (uint256) {
    // The amount of blocks since the previous tick until the current one
    uint256 blocksForLastTick = _currentBlockNumber - _lastTickBlock;

    // The minimum amount of blocks until the next tick, given by linear regression
    uint256 tentativeBlocksUntilNextTick = _expectedOrdersForTick.mul(blocksForLastTick).div(_actualOrders);

    // if the tentativeBlocksUntilNextTick is greater than the max tolerated, sets it as _maxBlocksForTick
    tentativeBlocksUntilNextTick = Math.min(tentativeBlocksUntilNextTick, _maxBlocksForTick);

    // if the tentativeBlocksUntilNextTick is lower than the min tolerated, sets it as _minBlocksForTick
    tentativeBlocksUntilNextTick = Math.max(tentativeBlocksUntilNextTick, _minBlocksForTick);

    return tentativeBlocksUntilNextTick;
  }
}

// File: contracts/libs/MoCExchangeLib.sol

pragma solidity 0.5.8;









/**
  @notice A library that manages the orderbook and pending queue of the pairs listed in the MoCDecentralizedExchange
 */
library MoCExchangeLib {
  using TickState for TickState.Data;
  using SafeMath for uint256;
  uint256 constant RATE_PRECISION = uint256(10**18);
  /**
    @notice Posible types of a match depending on which order is filled
    @dev At least one order has to be filled in any match in our exchange
   */
  enum MatchType {BUYER_FILL, SELLER_FILL, DOUBLE_FILL}

  /**
    @notice Posible types of a match depending on which order is filled
    @dev At least one order has to be filled in any match in our exchange
   */
  enum OrderType {LIMIT_ORDER, MARKET_ORDER}

  /**
    @notice Posible states of a tick. RECEIVING_ORDERS can be seen as the
    non-running tick state as there is no computation pending yet, the exchange is
    waiting for orders to come
   */
  enum TickStage {RECEIVING_ORDERS, RUNNING_SIMULATION, RUNNING_MATCHING, MOVING_PENDING_ORDERS}

  // intentionally using the biggest possible uint256
  // so it doesn't conflict with valid ids
  uint256 constant NO_HINT = ~uint256(0);

  /**
    @notice A new order has been inserted in the orderbook, and it is ready to be matched
    @param id Id of the order
    @param sender Address owner of the order
    @param baseTokenAddress Address of the token used as base in the pair(it is the token being used as currency,
    to pay the good, the secondary token)
    @param secondaryTokenAddress Address of the token used as secondary in the pair(it is the good
    being exchanged in this pair)
    @param exchangeableAmount Amount that was left to be exchanged
    @param reservedCommission Commission reserved to be charged later
    @param price Target price of the order[base/secondary] or priceMultiplier [dimentionless] [pricePrecision]
    @param expiresInTick Number of tick in which the order can no longer be matched
    @param isBuy The order is a buy order
    @param orderType The order's type; LIMIT_ORDER or MARKET_ORDER
   */
  event NewOrderInserted(
    uint256 indexed id,
    address indexed sender,
    address baseTokenAddress,
    address secondaryTokenAddress,
    uint256 exchangeableAmount,
    uint256 reservedCommission,
    uint256 price,
    uint256 multiplyFactor,
    uint64 expiresInTick,
    bool isBuy,
    MoCExchangeLib.OrderType orderType
  );

  /**
    @notice All the charged commission for a given token was withdrawn
    @param token The address of the withdrawn tokens
    @param commissionBeneficiary Receiver of the tokens
    @param withdrawnAmount Amount that was withdrawn
   */
  event CommissionWithdrawn(address token, address commissionBeneficiary, uint256 withdrawnAmount);

  /**
    @notice A new order has been inserted in the pending queue. It is waiting to be moved to the orderbook
    @dev On the RSK network, having an event with only one parameter which is indexed breaks the web3
    importer, so a dummy argument is added.
   */
  event NewOrderAddedToPendingQueue(uint256 indexed id, uint256 notIndexedArgumentSoTheThingDoesntBreak);

  /**
    @notice emitted when and expired Order has been process and it funds returned
    @param orderId id of the expired order processed
    @param owner the secondary token of the pair
    @param returnedAmount actual token amount returned to the owner
    @param commission applied as penalizacion for the expiration
    @param returnedCommission the commission returned as the expiration does not consume the whole commission
  */
  event ExpiredOrderProcessed(
    uint256 indexed orderId,
    address indexed owner,
    uint256 returnedAmount,
    uint256 commission,
    uint256 returnedCommission
  );

  /**
    @notice notifies the buyer that their order matched
    @param orderId the buyer's order
    @param amountSent the amount of baseToken [using baseTokenDecimals] sent to the seller
    @param commission the amount of baseToken [using baseTokenDecimals] that was charged as commission
    @param change the amount of baseToken [using baseTokenDecimals] sent back to the buyer
    @param received the amount of secondaryToken [using secondaryTokenDecimals] received in exchange
    @param remainingAmount = totalOrderAmount - (amountSent + change), if remainingAmount is 0, the order is filled and removed from the orderbook.
    @param matchPrice the price [using priceComparisonPrecision] at which the order matched
    @param tickNumber the tick's number in witch the order matched
  */
  event BuyerMatch(
    uint256 indexed orderId,
    uint256 amountSent,
    uint256 commission,
    uint256 change,
    uint256 received,
    uint256 remainingAmount,
    uint256 matchPrice,
    uint64 tickNumber
  );

  /**
    @notice notifies the seller that their order matched
    @param orderId the seller's order
    @param amountSent the amount of secondaryToken [using secondaryTokenDecimals] sent to the buyer
    @param commission the amount of secondaryToken [using baseTokenDecimals] that was charged as commission
    @param received the total amount the seller recieved == expected + surplus.
    @param surplus the amount of baseToken [using baseTokenDecimals] the seller recieved additional to the expected.
    @param remainingAmount = totalOrderAmount - amountSent, if remainingAmount is 0, the order is filled and removed from the orderbook.
    @param matchPrice the price [using priceComparisonPrecision] at which the order matched
    @param tickNumber the tick's number in witch the order matched
  */
  event SellerMatch(
    uint256 indexed orderId,
    uint256 amountSent,
    uint256 commission,
    uint256 received,
    uint256 surplus,
    uint256 remainingAmount,
    uint256 matchPrice,
    uint64 tickNumber
  );

  /**
    @notice Struct representing one of the token of a pair. If it's a base Token, orderbook will have buy Orders
   */
  struct Token {
    Data orderbook;
    IERC20 token;
  }

  /**
    @notice Struct representing a pair being exchanged in this exchange
   */
  struct Pair {
    Token baseToken;
    Token secondaryToken;
    IPriceProvider priceProvider;
    TickState.Data tickState;
    TickPaginationMemory pageMemory;
    TickStage tickStage;
    uint256 priceComparisonPrecision;
    uint256 lastClosingPrice;
    bool disabled;
    uint256 emaPrice;
    uint256 smoothingFactor;
  }

  /**
    @notice Struct used as an auxiliar storage to keep the cross-tick necessary data i.e. data that is volatile between two
    different ticks but has to be persisted for a given tick
   */
  struct TickPaginationMemory {
    uint256 emergentPrice;
    uint256 matchesAmount;
    uint256[] hintIds;
    uint256 hintIdsIndex;
    Order lastBuyMatch;
    Order lastSellMatch;
    uint256 lastBuyLimitOrderId;
    uint256 lastBuyMarketOrderId;
    uint256 lastSellLimitOrderId;
    uint256 lastSellMarketOrderId;
    uint256 marketPrice;
  }

  /**
    @notice Struct that contains all the order of the same type(buy or sell) of a given pair. It has two internal structures,
    the orderbook itself and a pendinQueue.
    @dev The decision to merge the orderbook and pendingQueue into a single struct was made to be able to have both types of
    orders in the same mapping making the movement between the two structs much cheaper
   */
  struct Data {
    mapping(uint256 => Order) orders;
    uint256 firstId;
    uint256 firstMarketOrderId;
    uint256 length;
    uint256 marketOrderLength;
    uint256 limitOrderLength;
    uint256 firstPendingToPopId;
    uint256 lastPendingToPopId;
    uint256 firstPendingMarketOrderToPopId;
    uint256 lastPendingMarketOrderToPopId;
    uint256 amountOfPendingOrders;
    uint256 amountOfPendingMarketOrders;
    bool orderDescending;
  }

  /**
    @notice Struct representing a single order
    @dev The next attribute is a reference to the next order in the structure this order.
    There are two types: MarketOrder (with multiplyFactor and volumen) and LimitOrder
  */
  struct Order {
    OrderType orderType;
    uint256 id;
    uint256 exchangeableAmount;
    uint256 reservedCommission;
    uint256 price;
    uint256 multiplyFactor;
    uint256 next;
    address owner;
    uint64 expiresInTick;
  }

  /**
    @notice Inserts an order in an orderbook without a hint
    @dev The type of the order is given implicitly by the data structure where it is saved
    @param self The data structure in where the order will be inserted
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount Amount that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _price Target price of the order[base/secondary]
    @param _expiresInTick Number of tick in which the order can no longer be matched
  */
  function insertLimitOrder(
    Data storage self,
    uint256 _orderId,
    address _sender,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _price,
    uint64 _expiresInTick
  ) public {
    insertLimitOrder(
      self,
      _orderId,
      _sender,
      _exchangeableAmount,
      _reservedCommission,
      _price,
      _expiresInTick,
      findPreviousOrderToPrice(self, _price)
    );
  }

  /**
    @notice Inserts a market order in an orderbook without a hint
    @dev The type of the order is given implicitly by the data structure where it is saved
    @param self The data structure in where the order will be inserted
    @param _orderId Id of the order to be inserted
    @param _exchangeableAmount Quantity of tokens to addd
    @param _reservedCommission Commission reserved to be charged later
    @param _multiplyFactor Target price of the order[base/secondary]
    @param _expiresInTick Number of tick in which the order can no longer be matched
  */
  function insertMarketOrder(
    Data storage self,
    uint256 _orderId,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _multiplyFactor,
    uint64 _expiresInTick
  ) public {
    insertMarketOrder(
      self,
      _orderId,
      _exchangeableAmount,
      _reservedCommission,
      _multiplyFactor,
      _expiresInTick,
      findPreviousMarketOrderToMultiplyFactor(self, _multiplyFactor)
    );
  }

  /**
    @notice Withdraws all the already charged(because of a matching, a cancellation or an expiration)
    commissions of a given token
    @param token Address of the token to withdraw the commissions from
  */
  function withdrawCommissions(address token, CommissionManager _commissionManager) public {
    uint256 amountToWithdraw = _commissionManager.exchangeCommissions(token);
    _commissionManager.clearExchangeCommissions(token);
    address commissionBeneficiary = _commissionManager.beneficiaryAddress();
    bool success = IERC20(token).transfer(commissionBeneficiary, amountToWithdraw);
    require(success, "Transfer failed");
    emit CommissionWithdrawn(token, commissionBeneficiary, amountToWithdraw);
  }


  /**
    @notice Inserts an order in an orderbook with a hint
    @dev The type of the order is given implicitly by the data structure where it is saved
    @param self The data structure in where the order will be inserted
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount Amount that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _price Target price of the order[base/secondary]
    @param _expiresInTick Number of tick in which the order can no longer be matched
    @param  _intendedPreviousOrderId Hint id of the order to be before the new order in the orderbook
  */
  function insertLimitOrder(
    Data storage self,
    uint256 _orderId,
    address _sender,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _price,
    uint64 _expiresInTick,
    uint256 _intendedPreviousOrderId
  ) public {
    validatePreviousOrder(self, _price, _intendedPreviousOrderId);
    createOrder(self, _orderId, _sender, _exchangeableAmount, _reservedCommission, _price, _expiresInTick);
    positionOrder(self, _orderId, _intendedPreviousOrderId);
  }

  /**
    @notice Inserts an order in an orderbook with a hint
    @dev The type of the order is given implicitly by the data structure where it is saved
    @param self The data structure in where the order will be inserted
    @param _orderId Id of the order to be inserted
    @param _exchangeableAmount Amount that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _expiresInTick Number of tick in which the order can no longer be matched
    @param  _intendedPreviousOrderId Hint id of the order to be before the new order in the orderbook
  */
  function insertMarketOrder(
    Data storage self,
    uint256 _orderId,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _multiplyFactor,
    uint64 _expiresInTick,
    uint256 _intendedPreviousOrderId
  ) public {
    validatePreviousMarketOrder(self, _multiplyFactor, _intendedPreviousOrderId);
    createMarketOrder(self, _orderId, msg.sender, _exchangeableAmount, _reservedCommission, _multiplyFactor, _expiresInTick);
    positionMarketOrder(self, _orderId, _intendedPreviousOrderId);
  }

  /**
    @notice Inserts an order in a pending queue
    @dev The type of the order is given implicitly by the data structure where it is saved
    @param self The data structure in where the order will be inserted
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount Amount that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _price Target price of the order[base/secondary]
    @param _expiresInTick Number of tick in which the order can no longer be matched
  */
  function insertLimitOrderAsPending(
    Data storage self,
    uint256 _orderId,
    address _sender,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _price,
    uint64 _expiresInTick
  ) public {
    self.orders[_orderId] = Order(
      OrderType.LIMIT_ORDER,
      _orderId,
      _exchangeableAmount,
      _reservedCommission,
      _price,
      0,
      0,
      _sender,
      _expiresInTick
    );
    positionOrderAsPending(self, _orderId);
  }

  /**
  @notice Hook that gets triggered when the tick of a given pair finishes.
  @dev Marks the state of the tick as finished(it is receiving orders again),
  sets the nextTick configs and cleans the pageMemory
  @param _pair The group of tokens
  @param _tickConfig The tick configuration
  for the execution of a tick of a given pair
  */
  function onTickFinish(Pair storage _pair, TickState.Config storage _tickConfig) public {
    assert(_pair.tickStage == TickStage.MOVING_PENDING_ORDERS);
    _pair.tickStage = TickStage.RECEIVING_ORDERS;
    _pair.tickState.nextTick(
      address(_pair.baseToken.token),
      address(_pair.secondaryToken.token),
      _tickConfig,
      _pair.pageMemory.emergentPrice,
      _pair.pageMemory.matchesAmount
    );

    // make sure nothing from this page is reused in the next
    delete (_pair.pageMemory);
  }

  /**
    @notice returns the corresponding user amount. Emits the CancelOrder event
    @param _pair Token Pair involved in the canceled Order
    @param _orderId Order id to cancel
    @param _previousOrderIdHint previous order in the orderbook, used as on optimization to search for.
    @param _isBuy true if it's a buy order, meaning the funds should be from base Token
  */
  function doCancelOrder(
    Pair storage _pair,
    uint256 _orderId,
    uint256 _previousOrderIdHint,
    bool _isBuy
    )
    public returns (uint256, uint256)
  {
    Token storage token = _isBuy ? _pair.baseToken : _pair.secondaryToken;
    Order storage toRemove = get(token.orderbook, _orderId);
    require(toRemove.id != 0, "Order not found");
    // Copy order needed values before deleting it
    (uint256 exchangeableAmount, uint256 reservedCommission, address owner) = (
      toRemove.exchangeableAmount,
      toRemove.reservedCommission,
      toRemove.owner
    );
    removeOrder(token.orderbook, toRemove, _previousOrderIdHint);
    require(owner == msg.sender, "Not order owner");
    return (exchangeableAmount, reservedCommission);
  }

  /**
    @notice Inserts a market order in a pending queue
    @dev The type of the order is given implicitly by the data structure where it is saved
    @param self The data structure in where the order will be inserted
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount The quantity of tokens that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _multiplyFactor Multiply factor to compute the the price of a market order
    @param _expiresInTick Number of tick in which the order can no longer be matched
  */
  function insertMarketOrderAsPending(
    Data storage self,
    uint256 _orderId,
    address _sender,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _multiplyFactor,
    uint64 _expiresInTick
  ) public {
    self.orders[_orderId] = Order(
      OrderType.MARKET_ORDER,
      _orderId, _exchangeableAmount,
      _reservedCommission,
      0,
      _multiplyFactor,
      0,
      _sender,
      _expiresInTick
    );
    positionMarketOrderAsPending(self, _orderId);
  }

  /**
    @notice Checks that the order should be in the place where it is trying to be inserted, reverts otherwise
    @param _price Target price of the new order
    @param _intendedPreviousOrderId Id of the order which is intended to be the order before the new one being inserted,
    if 0 it is asumed to be put at the start
   */
  function validatePreviousOrder(Data storage self, uint256 _price, uint256 _intendedPreviousOrderId) public view {
    if (_intendedPreviousOrderId == 0) {
      // order is intended to be the first in the Data
      validateIntendedFirstOrderInTheData(self, _price);
    } else {
      validateOrderIntendedPreviousOrder(self, _intendedPreviousOrderId, _price);
    }
  }

    /**
    @notice Checks that the order should be in the place where it is trying to be inserted, reverts otherwise
    @param _multiplyFactor Target multiplyFactor of the new order
    @param _intendedPreviousOrderId Id of the order which is intended to be the order before the new one being inserted,
    if 0 it is asumed to be put at the start
   */
  function validatePreviousMarketOrder(Data storage self, uint256 _multiplyFactor, uint256 _intendedPreviousOrderId) public view {
    if (_intendedPreviousOrderId == 0) {
      // order is intended to be the first in the Data
      validateIntendedFirstMarketOrderInTheData(self, _multiplyFactor);
    } else {
      validateMarketOrderIntendedPreviousOrder(self, _intendedPreviousOrderId, _multiplyFactor);
    }
  }

  /**
    @notice Checks that the order should be in the first place of the orderbook where it is trying to be inserted
    @param _price Target price of the new order
   */
  function validateIntendedFirstOrderInTheData(Data storage self, uint256 _price) private view {
    if (self.limitOrderLength != 0) {
      // there is one or more orders in the Data, so the price should be the most competitive
      Order storage firstOrder = first(self);
      require(priceGoesBefore(self, _price, firstOrder.price), "Price doesnt belong to start");
    }
  }

  /**
    @notice Checks that the market order should be in the first place of the orderbook where it is trying to be inserted
    @param _multiplyFactor Target multiplyFactor of the new order
  */
  function validateIntendedFirstMarketOrderInTheData(Data storage self, uint256 _multiplyFactor) private view {
    if (self.marketOrderLength != 0) {
      // there is one or more orders in the Data, so the price should be the most competitive
      Order storage firstOrder = firstMarketOrder(self);
      require(multiplyFactorGoesBefore(self, _multiplyFactor, firstOrder.multiplyFactor), "Multiply factor doesnt belong to start");
    }
  }

  /**
    @notice Checks that the order should be in the place where it is trying to be inserted, reverts otherwise
    @param _price Target price of the new order
    @param _intendedPreviousOrderId Id of the order which is intended to be the order before the new one being inserted
   */
  function validateOrderIntendedPreviousOrder(Data storage self, uint256 _intendedPreviousOrderId, uint256 _price) private view {
    Order storage previousOrder = get(self, _intendedPreviousOrderId);
    // the order for the _intendedPreviousOrderId provided exist
    require(previousOrder.id != 0, "PreviousOrder doesnt exist");

    require(previousOrder.orderType == OrderType.LIMIT_ORDER, "Hint is not limit order");

    // the price goes after the intended previous order
    require(!priceGoesBefore(self, _price, previousOrder.price), "Order should go before");
    Order storage nextOrder = get(self, previousOrder.next);
    // the price goes before the next order, if there is a next order
    require(nextOrder.id == 0 || priceGoesBefore(self, _price, nextOrder.price), "Order should go after");


  }

  /**
  @notice Checks that the market order should be in the place where it is trying to be inserted, reverts otherwise
  @param _multiplyFactor Target multiplyOrder of the new order
  @param _intendedPreviousOrderId Id of the order which is intended to be the order before the new one being inserted
  */
  function validateMarketOrderIntendedPreviousOrder(Data storage self, uint256 _intendedPreviousOrderId, uint256 _multiplyFactor) private view {
    Order storage previousOrder = get(self, _intendedPreviousOrderId);
    // the order for the _intendedPreviousOrderId provided exist
    require(previousOrder.id != 0, "PreviousOrder doesnt exist");

    require(get(self, _intendedPreviousOrderId).orderType == OrderType.MARKET_ORDER, "Hint is not market order");

    // the price goes after the intended previous order
    require(!multiplyFactorGoesBefore(self, _multiplyFactor, previousOrder.multiplyFactor), "Market Order should go before");
    Order storage nextOrder = get(self, previousOrder.next);
    // the price goes before the next order, if there is a next order
    require(nextOrder.id == 0 || multiplyFactorGoesBefore(self, _multiplyFactor, nextOrder.multiplyFactor), "Market Order should go after");
  }


  /**
    @notice drops first element and returs the new top
    @dev deleted first Order, replacin it wi the following one and shrinks the orderbook size
    @return new orderbook top (first)
   */
  function popAndGetNewTop(Pair storage _pair, Data storage self) internal returns (Order storage) {
    Order storage orderToPop = mostCompetitiveOrder(_pair.pageMemory.marketPrice, self, first(self), firstMarketOrder(self));
    Order storage newTop = get(self, orderToPop.next);
    if (orderToPop.orderType == OrderType.LIMIT_ORDER){
      self.firstId = newTop.id;
    }
    else{
      self.firstMarketOrderId = newTop.id;
    }
    decreaseQueuesLength(self, orderToPop.orderType != OrderType.LIMIT_ORDER);
    delete (self.orders[orderToPop.id]);
    return mostCompetitiveOrder(_pair.pageMemory.marketPrice, self, first(self), firstMarketOrder(self));
  }

  /**
    @notice decreases the size of the orders queue
   */
  function decreaseQueuesLength(Data storage _self, bool _isMarketOrder) internal {
    _self.length = _self.length.sub(1);
    if (_isMarketOrder) {
      _self.marketOrderLength = _self.marketOrderLength.sub(1);
     } else {
      _self.limitOrderLength = _self.limitOrderLength.sub(1);
    }
  }

  /**
    @notice Checks if the order is the last of the orderbook where it is saved
    @param _order Order to be checked
   */
  function isLastOfOrderbook(Order storage _order) internal view returns (bool) {
    return _order.next == 0;
  }

  /**
    @notice Checks if the order is the first of the orderbook where it is saved
    @param self Orderbook where the _order is supposed to be stored(we dont actually check if it is stored there)
    @param _order Order to be checked
   */
  function isFirstOfOrderbook(Data storage self, Order storage _order) internal view returns (bool) {
    return (_order.orderType == OrderType.LIMIT_ORDER && self.firstId == _order.id);
  }


  /**
    @notice Checks if the market order is the first of the orderbook where it is saved
    @param self Orderbook where the _order is supposed to be stored(we dont actually check if it is stored there)
    @param _order Order to be checked
   */
  function isFirstOfMarketOrderbook(Data storage self, Order storage _order) internal view returns (bool) {
    return (_order.orderType == OrderType.MARKET_ORDER && self.firstMarketOrderId == _order.id);
  }

  /**
    @notice removes an order from the self collection
    @dev copy any Order value before removing it as it will be cleared
    @param self Data struct to remove the order from
    @param _toRemove Order to remove
    @param _startFromId previous hint to look for (if zero, starts from beggining)
  */
  function removeOrder(Data storage self, Order storage _toRemove, uint256 _startFromId) public {
    if (isFirstOfOrderbook(self, _toRemove)) {
      // If first limit order, re-assing the linked list start to next
      self.firstId = _toRemove.next;
    }
    else if (isFirstOfMarketOrderbook(self, _toRemove)){
      // If first market order, re-assing the linked list start to next
      self.firstMarketOrderId = _toRemove.next;
    }
    else {
      (bool found, Order storage previousOrder) = findPreviousOrder(self, _toRemove, _startFromId);
      require(found, "Previous order not found");

      if (isLastOfOrderbook(_toRemove)) {
        // If last Order, and not only, tails previous
        previousOrder.next = 0;
      } else {
        // if in the middle, link prevoius to next
        previousOrder.next = _toRemove.next;
      }
    }
    // In any case, the item should be deleted and the list resized
    bool isMarketOrder = _toRemove.orderType == OrderType.MARKET_ORDER;
    delete (self.orders[_toRemove.id]);
    decreaseQueuesLength(self, isMarketOrder);
  }

  /**
    @notice Creates a new order to be positioned later in the orderbook or a pendingQueue
    @param self Container of the data structure in where the order will be positioned later
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount Amount that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _price Target price of the order[base/secondary]
    @param _expiresInTick Number of tick in which the order can no longer be matched
  */
  function createOrder(
    Data storage self,
    uint256 _orderId,
    address _sender,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _price,
    uint64 _expiresInTick
  ) private {
    // Next order is a position attribute so it should be set in another place
    self.orders[_orderId] = Order(
      OrderType.LIMIT_ORDER,
      _orderId,
      _exchangeableAmount,
      _reservedCommission,
      _price,
      0,
      0,
      _sender,
      _expiresInTick
    );
  }

  /**
    @notice Creates a new market order to be positioned later in the orderbook or a pendingQueue
    @param self Container of the data structure in where the market order will be positioned later
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount Quantity of tokens to exchange
    @param _reservedCommission Commission reserved to be charged later
    @param _multiplyFactor The factor to manage the final price of the market order
    @param _expiresInTick Number of tick in which the order can no longer be matched
  */
  function createMarketOrder(
    Data storage self,
    uint256 _orderId,
    address _sender,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _multiplyFactor,
    uint64 _expiresInTick
  ) private {
    // Next order is a position attribute so it should be set in another place
    self.orders[_orderId] = Order(
      OrderType.MARKET_ORDER,
      _orderId,
      _exchangeableAmount,
      _reservedCommission,
      0,
      _multiplyFactor,
      0,
      _sender,
      _expiresInTick);
  }

  /**
    @notice Positions an order in the provided orderbook
    @param self Container of the orderbook
    @param _orderId Id of the order to be positioned
    @param _previousOrderId Id of the order that should be immediately before the newly positioned order, 0 if should go at the start
   */
  function positionOrder(Data storage self, uint256 _orderId, uint256 _previousOrderId) private {
    Order storage order = get(self, _orderId);
    self.length = self.length.add(1);
    self.limitOrderLength = self.limitOrderLength.add(1);
    if (_previousOrderId != 0) {
      Order storage previousOrder = get(self, _previousOrderId);
      order.next = previousOrder.next;
      previousOrder.next = _orderId;
    } else {
      order.next = self.firstId;
      self.firstId = _orderId;
    }
  }

  /**
    @notice Positions an order in the provided orderbook
    @param self Container of the orderbook
    @param _orderId Id of the order to be positioned
    @param _previousOrderId Id of the order that should be immediately before the newly positioned order, 0 if should go at the start
   */
  function positionMarketOrder(Data storage self, uint256 _orderId, uint256 _previousOrderId) private {
    Order storage order = get(self, _orderId);
    self.length = self.length.add(1);
    self.marketOrderLength = self.marketOrderLength.add(1);
    if (_previousOrderId != 0) {
      Order storage previousOrder = get(self, _previousOrderId);
      order.next = previousOrder.next;
      previousOrder.next = _orderId;
    } else {
      order.next = self.firstMarketOrderId;
      self.firstMarketOrderId = _orderId;
    }
  }

  /**
    @notice Positions an order in the provided pendingQueue
    @param self Container of the pendingQueue
    @param _orderId Id of the order to be positioned as pending
   */
  function positionOrderAsPending(Data storage self, uint256 _orderId) private {
    if (self.amountOfPendingOrders != 0) {
      Order storage previousLastOrder = self.orders[self.lastPendingToPopId];
      require(previousLastOrder.orderType == OrderType.LIMIT_ORDER, "It isn't a limit order");
      previousLastOrder.next = _orderId;
    } else {
      self.firstPendingToPopId = _orderId;
    }
    self.lastPendingToPopId = _orderId;
    self.amountOfPendingOrders = self.amountOfPendingOrders.add(1);
  }

  /**
    @notice Positions a market order in the provided pendingQueue
    @param self Container of the pendingQueue
    @param _orderId Id of the market order to be positioned as pending
   */
  function positionMarketOrderAsPending(Data storage self, uint256 _orderId) private {
    if (self.amountOfPendingMarketOrders != 0) {
      Order storage previousLastOrder = self.orders[self.lastPendingMarketOrderToPopId];
      require(previousLastOrder.orderType == OrderType.MARKET_ORDER, "It isn't a market order");
      previousLastOrder.next = _orderId;
    } else {
      self.firstPendingMarketOrderToPopId = _orderId;
    }
    self.lastPendingMarketOrderToPopId = _orderId;
    self.amountOfPendingMarketOrders = self.amountOfPendingMarketOrders.add(1);
  }

  /**
    @notice Finds previous order for a new order with a given price in a given orderbook
    @param self Container of the orderbook
    @param _price Price of the order to possition
   */
  function findPreviousOrderToPrice(Data storage self, uint256 _price) public view returns (uint256) {
    if (self.limitOrderLength == 0) {
      return 0;
    }

    Order storage pivotOrder = first(self);

    bool newPriceGoesFirst = priceGoesBefore(self, _price, pivotOrder.price);
    if (newPriceGoesFirst) {
      return 0;
    }
    if (pivotOrder.next != 0) {
      Order storage nextOrder = get(self, pivotOrder.next);
      newPriceGoesFirst = priceGoesBefore(self, _price, nextOrder.price);

      while (!newPriceGoesFirst && pivotOrder.next != 0) {
        pivotOrder = nextOrder;

        if (pivotOrder.next != 0) {
          nextOrder = get(self, pivotOrder.next);
          newPriceGoesFirst = priceGoesBefore(self, _price, nextOrder.price);
        }
      }
    }
    return pivotOrder.id;
  }

  /**
    @notice Finds previous market order for a new order with a given price in a given orderbook
    @param self Container of the orderbook
    @param _price Price of the order to possition. It's equal to exchangableAmount * multiplyFactor
   */
  function findPreviousMarketOrderToMultiplyFactor(Data storage self, uint256 _price) public view returns (uint256) {
    if (self.marketOrderLength == 0) {
      return 0;
    }

    Order storage pivotOrder = firstMarketOrder(self);

    bool newMultiplyFactorGoesBefore = multiplyFactorGoesBefore(self, _price, pivotOrder.multiplyFactor);
    if (newMultiplyFactorGoesBefore) {
      return 0;
    }
    if (pivotOrder.next != 0) {
      Order storage nextOrder = get(self, pivotOrder.next);
      newMultiplyFactorGoesBefore = multiplyFactorGoesBefore(self, _price, nextOrder.multiplyFactor);

      while (!newMultiplyFactorGoesBefore && pivotOrder.next != 0) {
        pivotOrder = nextOrder;

        if (pivotOrder.next != 0) {
          nextOrder = get(self, pivotOrder.next);
          newMultiplyFactorGoesBefore = multiplyFactorGoesBefore(self, _price, nextOrder.multiplyFactor);
        }
      }
    }
    return pivotOrder.id;
  }

  /**
    @dev Iterates though self Order collection starting from _startFromId until finding order with id _targetId
    @param self collection where to look for
    @param _toRemove Order to remove
    @param _startFromId hint id to start iterating from, if zero, will search from begining
    @return true if found
    @return the Orders starage pointer, should not be used if not found
  */
  function findPreviousOrder(Data storage self, Order storage _toRemove, uint256 _startFromId)
    public
    view
    returns (bool found, Order storage prevOrder)
  {
    uint256 firstId = (_toRemove.orderType == OrderType.LIMIT_ORDER) ? self.firstId : self.firstMarketOrderId;
    uint256 startFromId = _startFromId == 0 ? firstId : _startFromId;
    Order storage pivotOrder = get(self, startFromId);
    found = pivotOrder.next == _toRemove.id;

    while (!found && !isLastOfOrderbook(pivotOrder)) {
      pivotOrder = get(self, pivotOrder.next);
      found = pivotOrder.next == _toRemove.id;
    }
    return (found, pivotOrder);
  }

  /**
    @notice Returns true if an order with a _price should go before a prexistent order with _existingPrice in an orderbook
    @param _price New price to compare
    @param _existingPrice Existing order's price to compare
   */
  function priceGoesBefore(Data storage self, uint256 _price, uint256 _existingPrice) private view returns (bool) {
    return (self.orderDescending && (_price > _existingPrice)) || (!self.orderDescending && (_price < _existingPrice));
  }

  /**
    @notice Returns true if an order with a _multiplyFactor should go before a prexistent order with _existingMultiplyFactor in an orderbook
    @param _multiplyFactor New multiplyFactor to compare
    @param _existingMultiplyFactor Existing order's multiplyFactor to compare
  */
  function multiplyFactorGoesBefore(Data storage self, uint256 _multiplyFactor, uint256 _existingMultiplyFactor) private view returns (bool) {
    return (
      self.orderDescending && (_multiplyFactor > _existingMultiplyFactor)) || (!self.orderDescending && (_multiplyFactor < _existingMultiplyFactor)
    );
  }

  /**
    @notice Returns an order by its _id in a given orderbook/pendingQueue container(self)
    @param self Container of the orderbook/pendingQueue
    @param _id Id of the order to get
   */
  function get(Data storage self, uint256 _id) internal view returns (Order storage) {
    return self.orders[_id];
  }

  /**
    Returns the next valid order. It can be MO or LO.
    @notice returns the next valid Order for the given _orderbook
    @dev gets the next Order, if not valid, recursivelly calls itself until finding the first valid or reaching the end.

    @return next valid Order, id = 0 if no valid order found
   */
  function getNextValidOrder(
    Data storage _orderbook,
    uint64 _tickNumber,
    uint256 _limitOrderId,
    uint256 _marketOrderId,
    uint256 _marketPrice
  ) public view returns (Order storage, uint256, uint256) {
    Order storage nextLO = getNextValidLimitOrder(_orderbook, _tickNumber, _limitOrderId);
    Order storage nextMO = getNextValidMarketOrder(_orderbook, _tickNumber, _marketOrderId);
    Order storage nextOrder = mostCompetitiveOrder(_marketPrice, _orderbook, nextLO, nextMO);
    (uint256 newCurrentLimitOrderId, uint256 newCurrentMarketOrderId) = nextOrder.orderType == OrderType.LIMIT_ORDER ?
      (nextOrder.id, _marketOrderId) :
      (_limitOrderId, nextOrder.id);
    return (mostCompetitiveOrder(_marketPrice, _orderbook, nextLO, nextMO), newCurrentLimitOrderId, newCurrentMarketOrderId);
  }

  /**
    Returns the next valid order. It can be MO or LO.
    @notice returns the next valid Order for the given _orderbook
    @dev gets the next Order, if not valid, recursivelly calls itself until finding the first valid or reaching the end.
    @param _self the pair of tokens
    @param _isBuy true to get a buy order, false otherwise.
    @return next valid Order, id = 0 if no valid order found
   */
  function getNextValidOrder(
    Pair storage _self,
    bool _isBuy
  ) public view returns (Order storage nextValidOrder, uint256 newCurrentLimitOrderId, uint256 newCurrentMarketOrderId) {
    uint64 tickNumber = _self.tickState.number;
    MoCExchangeLib.Data storage orderbook = _isBuy ? _self.baseToken.orderbook : _self.secondaryToken.orderbook;
    uint256 limitOrderId = _isBuy ? _self.pageMemory.lastBuyLimitOrderId : _self.pageMemory.lastSellLimitOrderId;
    uint256 marketOrderId = _isBuy ? _self.pageMemory.lastBuyMarketOrderId : _self.pageMemory.lastSellMarketOrderId;

    return  getNextValidOrder(
      orderbook,
      tickNumber,
      limitOrderId,
      marketOrderId,
      _self.pageMemory.marketPrice
    );
  }

  /**
    Returns the next valid order. It can be MO or LO.
    @notice returns the next valid Order for the given _orderbook
    @dev gets the next Order, if not valid, recursivelly calls itself until finding the first valid or reaching the end.
    @param _self the pair of tokens
    @param _isBuy true to get a buy order, false otherwise.
    @param _limitOrderId previous id of LO.
    @param _marketOrderId previous id of MO.
    @return next valid Order, id = 0 if no valid order found
   */
  function getNextValidOrderEP(
    Pair storage _self,
    bool _isBuy,
    uint256 _limitOrderId,
    uint256 _marketOrderId
  ) public view returns (Order storage nextValidOrder, uint256 newCurrentLimitOrderId, uint256 newCurrentMarketOrderId) {
    MoCExchangeLib.Data storage orderbook = _isBuy ? _self.baseToken.orderbook : _self.secondaryToken.orderbook;

    return  getNextValidOrder(
      orderbook,
      _self.tickState.number,
      _limitOrderId,
      _marketOrderId,
      getMarketPrice(_self)
    );
  }

  /**
    @notice returns the next valid Order for the given _orderbook
    @dev gets the net Order, if not valid, recursivelly calls itself until finding the first valid or reaching the end
    @param _orderbook where the _orderId is from
    @param _tickNumber for current tick
    @param _orderId id of the order from with obtain the next one, zero if beginging
    @return next valid Order, id = 0 if no valid order found
   */
  function getNextValidLimitOrder(Data storage _orderbook, uint64 _tickNumber, uint256 _orderId) public view returns (Order storage) {
    Order storage next = _orderId == 0 ? first(_orderbook) : getNext(_orderbook, _orderId);
    if (next.id == 0 || !isExpired(next, _tickNumber)) return next;
    else return getNextValidLimitOrder(_orderbook, _tickNumber, next.id);
  }

  /**
    @notice returns the next valid Order for the given _orderbook
    @dev gets the net Order, if not valid, recursivelly calls itself until finding the first valid or reaching the end
    @param _orderbook where the _orderId is from
    @param _tickNumber for current tick
    @param _orderId id of the order from with obtain the next one, zero if beginging
    @return next valid Order, id = 0 if no valid order found
   */
  function getNextValidMarketOrder(Data storage _orderbook, uint64 _tickNumber, uint256 _orderId) public view returns (Order storage) {
    Order storage next = _orderId == 0 ? firstMarketOrder(_orderbook) : getNext(_orderbook, _orderId);

    if (next.id == 0 || !isExpired(next, _tickNumber)) return next;
    else return getNextValidMarketOrder(_orderbook, _tickNumber, next.id);
  }

  /**
    @notice returns the most competitive order using curring market price.
    @dev LOs have higher priority to be processed because they have a TTL (lifespan).
    @param _marketPrice The market price in base token
    @param _orderbook the orderbook
    @param _limitOrder The Limit Order to compare
    @param _marketOrder The Market Order to compare
    @return next valid Order, id = 0 if no valid order found
  */
  function mostCompetitiveOrder(
    uint256 _marketPrice,
    Data storage _orderbook,
    Order storage _limitOrder,
    Order storage _marketOrder
    ) public view returns (Order storage) {
    // Both are empty. Return first LO empty order
    if (_limitOrder.id == 0 && _marketOrder.id == 0){
      return _limitOrder;
    }
    // There is only a Limit Order
    else if (_limitOrder.id != 0 && _marketOrder.id == 0){
      return _limitOrder;
    }
    // There is only a Market Order
    else if (_limitOrder.id == 0 && _marketOrder.id != 0){
      return _marketOrder;
    }
    // There is a limit order and a market order.
    // The price to compare MO with LO is computed: multiplyFactor * current market price.
    // LOs have priority to be processed in case of same price.
    // Descending orderbooks => Buy Orders
    else {
      uint256 currentMOPrice = marketOrderSpotPrice(_marketPrice, _marketOrder.multiplyFactor);
      if (_limitOrder.price == currentMOPrice || priceGoesBefore(_orderbook, _limitOrder.price, currentMOPrice)){
        return _limitOrder;
      }
      return _marketOrder;
    }
  }
  /**
    @notice Returns the order following an order which id is _id in a given orderbook/pendingQueue container(self)
    @param self Container of the orderbook
    @param _id Id of the order to get the next from
   */
  function getNext(Data storage self, uint256 _id) internal view returns (Order storage) {
    return self.orders[(self.orders[_id]).next];
  }

  /**
    @notice Returns the first of order of an orderbook
    @param self Container of the orderbook
   */
  function first(Data storage self) internal view returns (Order storage) {
    return self.orders[self.firstId];
  }

  /**
    @notice Returns the first of market order of an orderbook
    @param self Container of the orderbook
   */
  function firstMarketOrder(Data storage self) internal view returns (Order storage) {
    return self.orders[self.firstMarketOrderId];
  }

  /**
    @notice Returns the first order to be popped from the pendingQueue
    @param self Container of the pendingQueue
   */
  function firstPending(Data storage self) internal view returns (Order storage) {
    return self.orders[self.firstPendingToPopId];
  }

  /**
    @notice Returns the first market order to be popped from the pendingQueue
    @param self Container of the pendingQueue
   */
  function firstPendingMarketOrder(Data storage self) internal view returns (Order storage) {
    return self.orders[self.firstPendingMarketOrderToPopId];
  }


  /**
    @notice Returns true if the given order is expired
    @param _order Order to be checked
    @param _tickNumber Current tick number
   */
  function isExpired(Order storage _order, uint128 _tickNumber) internal view returns (bool) {
    require(_order.id != 0, "tried to see expiration of a null order");
    return _order.expiresInTick <= _tickNumber;
  }

  /** TokenPair **/

  /**
    @notice Returns the status of a pair
    @param _self Struct pair to be seen
    @return tickNumber Number of the current tick
    @return nextTickBlock Block in which the next tick will be able to run
    @return lastTickBlock Block in which the last tick started to run
    @return lastClosingPrice Emergent price of the last tick
    @return disabled True if the pair is disabled(it can not be inserted any orders); false otherwise
    @return emaPrice The last calculated emaPrice of the last tick
    @return smoothingFactor The current smoothing factor
   */
  function getStatus(Pair storage _self)
    internal
    view
    returns (
      uint64 tickNumber,
      uint256 nextTickBlock,
      uint256 lastTickBlock,
      uint256 lastClosingPrice,
      bool disabled,
      uint256 emaPrice,
      uint256 smoothingFactor
    )
  {
    tickNumber = _self.tickState.number;
    nextTickBlock = _self.tickState.nextTickBlock;
    lastTickBlock = _self.tickState.lastTickBlock;
    lastClosingPrice = _self.lastClosingPrice;
    disabled = _self.disabled;
    emaPrice = _self.emaPrice;
    smoothingFactor = _self.smoothingFactor;
  }

  /**
    @notice inserts a new Order. Emits the NewOrderInserted event
    @dev the _exchangeableAmount + _reservedCommission of the corresponding Token will be locked in the _receiver address, by making an RRC20 transferFrom,
    note that the address will need to have allowance and the necesary balance.
    @param _self Pair (Base & Secondary Token) to insert Order for
    @param _id Id of the new order
    @param _exchangeableAmount Order amount to be inserted, baseToken when buy, secondary when sell
    @param _reservedCommission Commission reserved to allow to charge it later(at expiration/)
    @param _price price the user is willing to bid/ask for this order.
    @param _lifespan the amount of ticks that the order is going to ve available to match.
    @param _previousOrderIdHint previous order in the orderbook, used as on optimization to search for.
    @param _sender address of the account executing the insertion
    @param _isBuy true if it's a buy order, meaning the funds should be from base Token
  */
  function doInsertLimitOrder(
    Pair storage _self,
    uint256 _id,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint,
    address _sender,
    address _receiver,
    bool _isBuy
  ) public returns (uint256) {
    require(!_self.disabled, "Pair has been disabled");

    Token storage token = _isBuy ? _self.baseToken : _self.secondaryToken;

    require(token.token.transferFrom(_sender, _receiver, _exchangeableAmount.add(_reservedCommission)), "Token transfer failed");

    bool goesToPendingQueue = _self.tickStage != TickStage.RECEIVING_ORDERS;
    uint64 expiresInTick = _self.tickState.number + _lifespan;

    if (goesToPendingQueue) {
      insertLimitOrderAsPending(token.orderbook, _id, _sender, _exchangeableAmount, _reservedCommission, _price, expiresInTick);
      emit NewOrderAddedToPendingQueue(_id, 0);
    } else {
      if (_previousOrderIdHint == NO_HINT) {
        insertLimitOrder(token.orderbook, _id, _sender, _exchangeableAmount, _reservedCommission, _price, expiresInTick);
      } else {
        insertLimitOrder(token.orderbook, _id, _sender, _exchangeableAmount, _reservedCommission, _price, expiresInTick, _previousOrderIdHint);
      }
      emitNewOrderEventForLimitOrder(_id, _self, _sender, _exchangeableAmount, _reservedCommission, _price, expiresInTick, _isBuy);
    }
  }

  /**
    @notice inserts a new Market Order. Emits the NewOrderInserted event
    @dev the _exchangeableAmount is the quantity of tokens,
    note that the address will need to have allowance and the necesary balance.
    @param _self Pair (Base & Secondary Token) to insert Order for
    @param _id Id of the new order
    @param _exchangeableAmount The quantity of tokens to insert, baseToken when buy, secondary when sell
    @param _reservedCommission Commission reserved to allow to charge it later(at expiration/)
    @param _multiplyFactor The multiplier factor to calculate the market order price.
    @param _lifespan the amount of ticks that the order is going to ve available to match.
    @param _previousOrderIdHint previous order in the orderbook, used as on optimization to search for.
    @param _sender address of the account executing the insertion
    @param _isBuy true if it's a buy order, meaning the funds should be from base Token
  */
  function doInsertMarketOrder(
    Pair storage _self,
    uint256 _id,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _multiplyFactor,
    uint64 _lifespan,
    uint256 _previousOrderIdHint,
    address _sender,
    bool _isBuy
  ) public returns (uint256) {
    require(!_self.disabled, "Pair has been disabled");
    //It is not a modifier because of stack to deep
    require(_multiplyFactor != 0, "MultiplyFactor cannot be zero");
    //It is not a modifier because of stack to deep
    require(_exchangeableAmount != 0, "Exchangeable amount cannot be zero");

    Token storage token = _isBuy ? _self.baseToken : _self.secondaryToken;

    uint256 toTransfer = _exchangeableAmount.add(_reservedCommission);

    require(token.token.allowance(_sender, address(this)) >= toTransfer, "Allowance too low");
    require(token.token.transferFrom(_sender, address(this), toTransfer), "Token transfer failed");

    bool goesToPendingQueue = _self.tickStage != TickStage.RECEIVING_ORDERS;
    uint64 expiresInTick = _self.tickState.number + _lifespan;

    if (goesToPendingQueue) {
      insertMarketOrderAsPending(token.orderbook, _id, _sender, _exchangeableAmount, _reservedCommission, _multiplyFactor, expiresInTick);
      emit NewOrderAddedToPendingQueue(_id, 0);
    } else {
      if (_previousOrderIdHint == NO_HINT) {
        insertMarketOrder(token.orderbook, _id, _exchangeableAmount, _reservedCommission, _multiplyFactor, expiresInTick);
      } else {
        insertMarketOrder(token.orderbook, _id, _exchangeableAmount, _reservedCommission,  _multiplyFactor, expiresInTick, _previousOrderIdHint);
      }
      emitNewOrderEventForMarketOrder(_id, _self, _sender, _exchangeableAmount, _reservedCommission, _multiplyFactor, expiresInTick, _isBuy);
    }
  }

  /**
    @notice Converts an amount in secondary token currency to base token currency
    @param _secondary Amount to be converted[secondary]
    @param _price Price used to convert[base/secondary]
    @param _priceComparisonPrecision Fixed point used precision of _price
    @return _base Amount converted[base]
   */
  function convertToBase(uint256 _secondary, uint256 _price, uint256 _priceComparisonPrecision) internal pure returns (uint256) {
    return _secondary.mul(_price).div(_priceComparisonPrecision);
  }


  /**
    @notice Computes the prices of a market order
    @param _marketPrice The market price
    @param _multiplyFactor multiplyFactor
    @return price
   */
  function marketOrderSpotPrice(uint256 _marketPrice, uint256 _multiplyFactor) private pure returns (uint256) {
    return _multiplyFactor.mul(_marketPrice).div(RATE_PRECISION);
  }

  /**
    @notice Returns true if the pair is valid i.e. it is initialized, false otherwise
   */
  function isValid(Pair storage _self) internal view returns (bool) {
    return
      address(_self.baseToken.token) != address(0) && address(_self.secondaryToken.token) != address(0) && _self.priceComparisonPrecision != 0;
  }

  /**
    @notice Calculates the new EMA using the exponential smoothing formula:
        newEMA = (smoothingFactor * newValue) + ((1 - smoothingFactor) * oldEma)
      where newValue is the lastClosingPrice of current tick, and 0 < smoothingFactor < 1.
      All values are weighted with the appropiate precision.
    @param _oldEMA the previous calculated EMA
    @param _newValue the newValue to smooth, it represents the new lastClosingPrice
    @param _smoothingFactor the smoothing factor of the exponential smoothing
    @param _factorPrecision the smoothing factor's precision
    */
  function calculateNewEMA(uint256 _oldEMA, uint256 _newValue, uint256 _smoothingFactor, uint256 _factorPrecision)
    public
    pure
    returns (uint256)
  {
    uint256 weightedNewValue = _newValue.mul(_smoothingFactor).div(_factorPrecision);
    uint256 oldEMAWeighted = _oldEMA.mul(_factorPrecision.sub(_smoothingFactor)).div(_factorPrecision);
    uint256 newEMA = oldEMAWeighted.add(weightedNewValue);
    return newEMA;
  }

  /**
    @dev this wrapp responds more to a "stack-too-deep" problem than a desire function break drown
  */
  function emitNewOrderEventForLimitOrder(
    uint256 _orderId,
    Pair storage _self,
    address _sender,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _price,
    uint64 _expiresInTick,
    bool _isBuy
  ) private {
    emit NewOrderInserted(
      _orderId,
      _sender,
      address(_self.baseToken.token),
      address(_self.secondaryToken.token),
      _exchangeableAmount,
      _reservedCommission,
      _price,
      0,
      _expiresInTick,
      _isBuy,
      OrderType.LIMIT_ORDER
    );
  }

  /**
    @dev this wrapp responds more to a "stack-too-deep" problem than a desire function break drown
  */
  function emitNewOrderEventForMarketOrder(
    uint256 _orderId,
    Pair storage _self,
    address _sender,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    uint256 _multiplyFactor,
    uint64 _expiresInTick,
    bool _isBuy
  ) private {
    emit NewOrderInserted(
      _orderId,
      _sender,
      address(_self.baseToken.token),
      address(_self.secondaryToken.token),
      _exchangeableAmount,
      _reservedCommission,
      0,
      _multiplyFactor,
      _expiresInTick,
      _isBuy,
      OrderType.MARKET_ORDER
    );
  }

  /**
    @notice Gets the ids of the last sell and buy matching orders.
    @dev iterates over the pair orderbook, simulating the match to obtain the final matching orders
    @return lastBuyMatchId Id of the last Buy order to match
    @return lastSellMatchId Id of the last Sell order to match
  */
  function getLastMatchingOrders(Pair storage _self)
    internal
    view
    returns (uint256, uint256)
  {

    Order memory lastBuyMatch;
    Order memory lastSellMatch;
    uint256 marketPrice = getMarketPrice(_self);
    Order memory buy;
    Order memory sell;

    uint256 lastBuyLimitOrderId;
    uint256 lastBuyMarketOrderId;
    uint256 lastSellLimitOrderId;
    uint256 lastSellMarketOrderId;

    uint256 pricePrecision = _self.priceComparisonPrecision;

    (buy, lastBuyLimitOrderId, lastBuyMarketOrderId) = getNextValidOrderEP(_self, true, lastBuyLimitOrderId, lastBuyMarketOrderId);
    (sell, lastSellLimitOrderId, lastSellMarketOrderId) = getNextValidOrderEP(_self, false, lastSellLimitOrderId, lastSellMarketOrderId);

    while (shouldMatchMemory(marketPrice, buy, sell)) {
      lastBuyMatch = buy;
      lastSellMatch = sell;
      (uint256 limitingAmount, MatchType matchType) = compareIntents(
        buy.exchangeableAmount,
        getOrderPrice(marketPrice, buy),
        sell.exchangeableAmount,
        pricePrecision);

      if (matchType == MatchType.DOUBLE_FILL) {
        (buy, lastBuyLimitOrderId, lastBuyMarketOrderId) = getNextValidOrderEP(_self, true, lastBuyLimitOrderId, lastBuyMarketOrderId);
        (sell, lastSellLimitOrderId,lastSellMarketOrderId) = getNextValidOrderEP(_self, false, lastSellLimitOrderId, lastSellMarketOrderId);
      } else if (matchType == MatchType.BUYER_FILL) {
        (buy, lastBuyLimitOrderId, lastBuyMarketOrderId) = getNextValidOrderEP(_self, true, lastBuyLimitOrderId, lastBuyMarketOrderId);
        sell.exchangeableAmount = sell.exchangeableAmount.sub(limitingAmount);
      } else if (matchType == MatchType.SELLER_FILL) {
        (sell, lastSellLimitOrderId, lastSellMarketOrderId) = getNextValidOrderEP(_self, false, lastSellLimitOrderId, lastSellMarketOrderId);
        uint256 moPrice = getOrderPrice(marketPrice, buy);
        uint256 buyerExpectedSend = convertToBase(limitingAmount, moPrice, pricePrecision);

        buy.exchangeableAmount = buy.exchangeableAmount.sub(buyerExpectedSend);
      } else {
        // TODO
        require(false, "wow this is a bad implementation");
      }
    }

    return (lastBuyMatch.id, lastSellMatch.id);
  }

  /**
    @dev iterates over the pair orderbook, simulating the match to obtain the emergent price
    @return emergentPrice: AVG price of the last matched Orders
    @return lastBuyMatchId Id of the last Buy order to match
    @return lastBuyMatchAmount Amount of the last Buy order to match
    @return lastSellMatchId Id of the last Sell order to match
  */
  function getEmergentPrice(Pair storage _self)
    public
    view
    returns (uint256 emergentPrice, uint256 lastBuyMatchId, uint256 lastBuyMatchAmount, uint256 lastSellMatchId)
  {

    (uint256 lastBuyMatchedId, uint256 lastSellMatchedId) = getLastMatchingOrders(_self);
    Order storage lastBuyMatch = get(_self.baseToken.orderbook, lastBuyMatchedId);
    Order storage lastSellMatch = get(_self.secondaryToken.orderbook, lastSellMatchedId);

    if (lastBuyMatch.id == 0) return (0, 0, 0, 0);
    emergentPrice = Math.average(getOrderPrice(getMarketPrice(_self), lastBuyMatch), getOrderPrice(getMarketPrice(_self), lastSellMatch));
    return (emergentPrice, lastBuyMatch.id, lastBuyMatch.exchangeableAmount, lastSellMatch.id);

  }
  function compareIntents(uint256 _buyAmount, uint256 _buyPrice, uint256 _sellAmount, uint256 _priceComparisonPrecision)
    public
    pure
    returns (uint256 limitingAmount, MatchType matchType)
  {
    uint256 buyerIntent = _buyAmount.mul(_priceComparisonPrecision).div(_buyPrice);
    if (_sellAmount > buyerIntent) {
      return (buyerIntent, MatchType.BUYER_FILL);
    } else if (_sellAmount < buyerIntent) {
      return (_sellAmount, MatchType.SELLER_FILL);
    } else {
      return (_sellAmount, MatchType.DOUBLE_FILL);
    }
  }

  /**
    @notice Calculate the different amounts in the process of exchanging a buy order
    @param _commissionManager contract responsible for resolving commissions
    @param _pair the pair where the order exist
    @param _buy the buy order to operate with
    @param _sell the sell order to operate with
    @param _limitingAmount the amount in secondary token to be exchanged
    @param _price the emergent price to use when doing the calculuses
  */
  function executeMatch(
    CommissionManager _commissionManager,
    Pair storage _pair,
    Order storage _buy,
    Order storage _sell,
    uint256 _limitingAmount,
    uint256 _price,
    bool _fillsBuy
  ) internal {
    executeBuyerMatch(_fillsBuy, _commissionManager, _pair, _buy, _limitingAmount, _price);
    executeSellerMatch(_commissionManager, _pair, _sell, _limitingAmount, _price);
  }

  /**
    @notice Returns true if the orders should match taking into account its prices
    false otherwise
    @dev It is identical to shouldMatchMemory but it receives its params as storage
    It was done this way to save some gas
    @param _marketPrice The market price
    @param _buy Struct of buy order to be checked
    @param _sell Struct of sell order to be checked
  */
  function shouldMatchStorage(uint256 _marketPrice, Order storage _buy, Order storage _sell) private view returns (bool) {
    return _sell.id != 0 && _buy.id != 0 && getOrderPrice(_marketPrice, _buy) >= getOrderPrice(_marketPrice, _sell);
  }

  /**
    @notice Returns true if the orders should match taking into account its prices
    false otherwise
    @dev It is identical to shouldMatchStorage but it receives its params as memory
    It was done this way to save some gas
    @param _marketPrice The market price
    @param _buy Struct of buy order to be checked
    @param _sell Struct of sell order to be checked
  */
  function shouldMatchMemory(uint256 _marketPrice, Order memory _buy, Order memory _sell) private pure returns (bool) {
    return _sell.id != 0 && _buy.id != 0 && getOrderPrice(_marketPrice, _buy) >= getOrderPrice(_marketPrice, _sell);
  }

  /**
    @notice Returns the price on an order
    @dev Checks the OrderType to compute the current price
    @param _marketPrice Market price
    @param _order The order with price
  */
  function getOrderPrice(uint256 _marketPrice, Order memory _order) private pure returns (uint256) {
    return (_order.orderType == OrderType.LIMIT_ORDER) ? _order.price : marketOrderSpotPrice(_marketPrice, _order.multiplyFactor);
  }
  /**
    @notice Operates the buy order, doing modifications in the orderbook and the respecting transfers
    @param _commissionManager contract responsible for resolving commissions
    @param _pair the pair where the order exist
    @param _buy the buy order to operate
    @param _limitingAmount the amount in secondary token to be exchanged
    @param _price the emergent price to use when doing the calculuses
  */
  function executeBuyerMatch(
    bool _fillsBuy,
    CommissionManager _commissionManager,
    Pair storage _pair,
    Order storage _buy,
    uint256 _limitingAmount,
    uint256 _price
  ) private {
    // calculates the amouts to exchange, the one to sent to the seller and the change that its going back to the buyer
    (uint256 buyerExpectedSend, uint256 buyerSent) = calculateAmountToExchange(_pair, _buy, _limitingAmount, _price);

    // Send the whole order if we are filling to avoid dust
    buyerExpectedSend = _fillsBuy ? _buy.exchangeableAmount : buyerExpectedSend;

    // calculates and retains the propotional commission for the exchange
    uint256 exchangeCommission = _commissionManager.chargeCommissionForMatch(
      _buy.exchangeableAmount,
      buyerSent,
      _buy.reservedCommission,
      address(_pair.baseToken.token)
    );

    // transfer the change back to the buyer, has the commission change in it
    // change created by the price difference favorable to the customer
    uint256 changeTransferred = transferChange(_pair, _buy, buyerSent, buyerExpectedSend, exchangeCommission);

    // edits the order according to the exchanged amount
    subtractAmount(_buy, buyerExpectedSend);

    emit BuyerMatch(
      _buy.id,
      buyerSent,
      exchangeCommission,
      changeTransferred,
      // transfer the buyed amount, 0 if the transfer failed
      SafeTransfer.doTransfer(_pair.secondaryToken.token, _buy.owner, _limitingAmount) ? _limitingAmount : 0,
      _buy.exchangeableAmount,
      _price,
      _pair.tickState.number
    );
  }

  /**
    @notice Calculate the two amounts in the process of exchanging a buy order
    @param _pair the pair where the order exist
    @param _buy the buy order to operate
    @param _limitingAmount the amount in secondary token to be exchanged
    @param _price the emergent price to use when doing the calculuses
    @return buyerSent, the amount to send to the seller
    @return change, the amount to send back to the buyer
  */
  function calculateAmountToExchange(Pair storage _pair, Order storage _buy, uint256 _limitingAmount, uint256 _price)
    private
    view
    returns (uint256, uint256)
  {
    uint256 buyerExpectedSend = convertToBase(
      _limitingAmount,
      getOrderPrice(_pair.pageMemory.marketPrice, _buy),
      _pair.priceComparisonPrecision
    );
    uint256 buyerSent = convertToBase(_limitingAmount, _price, _pair.priceComparisonPrecision);
    return (buyerExpectedSend, buyerSent);
  }

  /**
    @notice Transfers the change of the buyers transaction. It is the surplus that it is resent to the
    buyer but in base token currency
    @param _pair Struct of the pair that it is being exchanged
    @param _order Order that should have the change transfered
    @param _amountSent Amount already sent to the buyer[seconady]
    @param _expectedSend Amount expected from the buyer[secondary]
    @param _commission Charged commission[secondary]
  */
  function transferChange(Pair storage _pair, Order storage _order, uint256 _amountSent, uint256 _expectedSend, uint256 _commission)
    private
    returns (uint256)
  {
    // adding to the change the reserved commission to be returned proportional to the change
    uint256 buyerExpectedCommission = _expectedSend.mul(_order.reservedCommission).div(_order.exchangeableAmount);
    uint256 changeToTransfer = _expectedSend.sub(_amountSent).add(buyerExpectedCommission.sub(_commission));
    // For Token transfer, we use SafeTransfer to protect loop against individual reverts
    return SafeTransfer.doTransfer(_pair.baseToken.token, _order.owner, changeToTransfer) ? changeToTransfer : 0;
  }

  /**
    @notice Calculate the different amounts in the process of exchanging a sell order
    @param _commissionManager contract responsible for resolving commissions
    @param _pair the pair where the order exist
    @param _sell the sell order to operate
    @param _limitingAmount the amount in secondary token to be exchanged
    @param _price the emergent price to use when doing the calculuses
  */
  function executeSellerMatch(
    CommissionManager _commissionManager,
    Pair storage _pair,
    Order storage _sell,
    uint256 _limitingAmount,
    uint256 _price
  ) private {
    uint256 exchangeCommission = _commissionManager.chargeCommissionForMatch(
      _sell.exchangeableAmount,
      _limitingAmount,
      _sell.reservedCommission,
      address(_pair.secondaryToken.token)
    );


    uint256 sellerExpectedReturn = convertToBase(
      _limitingAmount,
      getOrderPrice(_pair.pageMemory.marketPrice, _sell),
      _pair.priceComparisonPrecision
    );
    uint256 buyerSent = convertToBase(_limitingAmount, _price, _pair.priceComparisonPrecision);

    uint256 surplus = buyerSent.sub(sellerExpectedReturn);

    // For Token transfer, we use SafeTransfer to protect loop against individual reverts
    if (!SafeTransfer.doTransfer(_pair.baseToken.token, _sell.owner, buyerSent)) buyerSent = 0;

    subtractAmount(_sell, _limitingAmount);

    emit SellerMatch(
      _sell.id,
      _limitingAmount,
      exchangeCommission,
      buyerSent,
      surplus,
      _sell.exchangeableAmount,
      _price,
      _pair.tickState.number
    );
  }

  /**
    @notice Reduce Order amount by amount and the reservedCommission proportionally
    @param _order The order to reduce amount of
    @param _sent amount to be substracted. Must be smaller than order's current amount
   */
  function subtractAmount(MoCExchangeLib.Order storage _order, uint256 _sent) private {
    uint256 expectedCommission = _sent.mul(_order.reservedCommission).div(_order.exchangeableAmount);
    _order.reservedCommission = _order.reservedCommission.sub(expectedCommission);
    _order.exchangeableAmount = _order.exchangeableAmount.sub(_sent);
  }

  /**
@notice Process expired Orders for the given orderbook, returning funds to the owner while applying commission
@dev iterates _steps times over the orderbook starting from _orderId and process any encountered expired order
@param _pair Pair of tokens
@param _commissionManager CommisionManager from MocDecentralizedExchange
@param _isBuy true if buy order, needed to identify the orderbook
@param _orderId Order id to start expiring process. If zero, will start from ordebook top.
@param _previousOrderIdHint previous order id hint in the orderbook to _orderId, used as on optimization to search for.
If zero, will start from ordebook top.
@param _steps Number of iterations to look for expired orders to process. Use one, if just looking to process _orderId only
@param _orderType Order type to expire
*/
  function processExpired(
    Pair storage _pair,
    CommissionManager _commissionManager,
    bool _isBuy,
    uint256 _orderId,
    uint256 _previousOrderIdHint,
    uint256 _steps,
    OrderType _orderType
  ) public {
    require(_orderType == OrderType.LIMIT_ORDER || _orderType == OrderType.MARKET_ORDER, "Invalid order type to expire");
    MoCExchangeLib.Token storage token = _isBuy ? _pair.baseToken : _pair.secondaryToken;
    MoCExchangeLib.Order storage toEvaluate = _orderId == 0 ?
      getFirstOrderToExpire(token.orderbook, _orderType) :
      get(token.orderbook, _orderId);
    if (toEvaluate.id != 0) {
      require(toEvaluate.orderType == _orderType, "The order to expire does not correspond to the specified OrderType");
    }
    uint256 nextOrderId = toEvaluate.next;
    uint256 previousOrderId = _previousOrderIdHint;
    uint256 currStep = 0;
    bool hasProcess = false;
    while (currStep < _steps && toEvaluate.id != 0) {
      currStep++;
      if (isExpired(toEvaluate, _pair.tickState.number)) {
        // Event if process expiring could return fail as transaction fails, the behaviour is the same,
        // order needs to be removed and the process must continue.
        processExpiredOrder(
          _commissionManager,
          token,
          toEvaluate.id,
          toEvaluate.exchangeableAmount,
          toEvaluate.reservedCommission,
          toEvaluate.owner
        );
        nextOrderId = toEvaluate.next;
        // TODO: Given this is a loop, we could track the actual prev instead of just the id
        removeOrder(token.orderbook, toEvaluate, previousOrderId);
        hasProcess = true;
      } else {
        previousOrderId = toEvaluate.id;
        nextOrderId = toEvaluate.next;
      }
      toEvaluate = get(token.orderbook, nextOrderId);
    }
    require(hasProcess, "No expired order found");
  }

   /**
    @notice Checks if there is any order to expire in an orderbook of a pair
    @dev iterates _steps times over the orderbook starting from _orderId and process any encountered expired order
    @param _pair Pair of tokens to be evaluated
    @param _evaluateBuyOrders true if buy orders have to be evaluated, false if sell orderrs have to
    */
  function areOrdersToExpire(
    Pair storage _pair,
    bool _evaluateBuyOrders
  ) public view returns (bool) {
    MoCExchangeLib.Token storage token = _evaluateBuyOrders ? _pair.baseToken : _pair.secondaryToken;
    return
      areOrdersToExpire(_pair.tickState.number, token.orderbook, first(token.orderbook)) ||
      areOrdersToExpire(_pair.tickState.number, token.orderbook, firstMarketOrder(token.orderbook));
  }


   /**
    @notice Checks if there is any order to expire in any orderbook given an initial order
    @dev iterates _steps times over the orderbook starting from _firstOrderToEvaluate and returns true on the first expired order
    @param _tickNumber Number of the current tick
    @param _orderbook Orderbook where the tokens
    @param _firstOrderToEvaluate the initial order that will be evaluated, all of the following will be evaluated too
    */
  function areOrdersToExpire(
    uint128 _tickNumber,
    MoCExchangeLib.Data storage _orderbook,
    MoCExchangeLib.Order storage _firstOrderToEvaluate
  ) internal view returns (bool) {
    MoCExchangeLib.Order storage toEvaluate = _firstOrderToEvaluate;

    uint256 nextOrderId;
    while (toEvaluate.id != 0) {
      if (isExpired(toEvaluate, _tickNumber))
        return true;
      nextOrderId = toEvaluate.next;
      toEvaluate = get(_orderbook, nextOrderId);
    }
    return false;
  }

  /**
    @notice returns funds to the owner, paying commission in the process and emits ExpiredOrderProcessed event
    @param _commissionManager commission manager.
    @param _token order Token data
    @param _orderId expired order's id
    @param _exchangeableAmount order's remainin exchangeable amount
    @param _reservedCommission order's reserved commission
    @param _owner order's owner
    @return _transferResult, true if the transfer to _account was successful
   */
  function processExpiredOrder(
    CommissionManager _commissionManager,
    Token storage _token,
    uint256 _orderId,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    address _owner
  ) public returns (bool) {
    (bool transferResult, uint256 returnedAmount, uint256 commission, uint256 returnedCommission) = refundOrder(
      _commissionManager,
      _token.token,
      _exchangeableAmount,
      _reservedCommission,
      _owner,
      true
    );
    // If transfer fails, the order needs to be processed anyway. Just record that no funds where actually returned.
    if (!transferResult) returnedAmount = 0;
    emit ExpiredOrderProcessed(_orderId, _owner, returnedAmount, commission, returnedCommission);
    return transferResult;
  }
  /**
    @notice Hook called when the simulation of the matching of orders starts; marks as so the tick stage
    Initializes the pageMemory with the first valid orders
    Has one discarded param; kept to have a fixed signature
    @dev The initialization of lastBuyMatch/lastSellMatch without checking if they should match can cause
    some inconsistency but it is covered by the matchesAmount attribute in the pageMemory
    @param _pair The pair of tokens
  */
  function onSimulationStart(Pair storage _pair) public {
    _pair.tickStage = TickStage.RUNNING_SIMULATION;
    _pair.pageMemory.marketPrice = getMarketPrice(_pair);
    (
      _pair.pageMemory.lastBuyMatch,
      _pair.pageMemory.lastBuyLimitOrderId,
      _pair.pageMemory.lastBuyMarketOrderId) = getNextValidOrder(_pair, true);
    (
      _pair.pageMemory.lastSellMatch,
      _pair.pageMemory.lastSellLimitOrderId,
      _pair.pageMemory.lastSellMarketOrderId) = getNextValidOrder(_pair, false);
  }

  /**
    @notice Hook called when the simulation of the matching of orders finish; marks as so the tick stage
    Has one discarded param; kept to have a fixed signature
    @param _pair the pair to finish simulation
  */
  function onSimulationFinish(Pair storage _pair) public {
    uint256 factorPrecision = 10**18; // FIXME how do i access this constant from another file?
    assert(_pair.tickStage == MoCExchangeLib.TickStage.RUNNING_SIMULATION);

    if (_pair.pageMemory.matchesAmount > 0) {
      _pair.pageMemory.emergentPrice = Math.average(getOrderPrice(_pair.pageMemory.marketPrice, _pair.pageMemory.lastBuyMatch), getOrderPrice(_pair.pageMemory.marketPrice, _pair.pageMemory.lastSellMatch));
      _pair.lastClosingPrice = _pair.pageMemory.emergentPrice;
      _pair.emaPrice = calculateNewEMA(_pair.emaPrice, _pair.lastClosingPrice, _pair.smoothingFactor, factorPrecision);
    }

  }

  /**
    @notice Match the next two orders to be matched
    @param _self Pair being matched
    @param _commissionManager Commission manager of the MoC Exchange
    @return True if there are more orders to be matched, false otherwise
   */
  function matchOrders(Pair storage _self, CommissionManager _commissionManager) public returns (bool) {
    // If there are no matches, skip everything

    if (_self.pageMemory.matchesAmount == 0) {
      return false;
    }

    /* We're assigning the next order to match (in the case of a complete fill)
     * in these variables, but the new value is never used.
     * It's possible to delete some code and make the execution cheaper by
     * only having the getFirstForMatching functionality, but we believe
     * the stepFunction'll receive the number of steps to run in the near future
     * and then we'll need the next order to match again.
     */
    Order storage buy = getFirstForMatching(_self, _commissionManager, _self.baseToken, _self.tickState.number);
    Order storage sell = getFirstForMatching(_self, _commissionManager, _self.secondaryToken, _self.tickState.number);

    bool isLastMatch = buy.id == _self.pageMemory.lastBuyMatch.id && sell.id == _self.pageMemory.lastSellMatch.id;
    // As last matching orders are known from the simulation, we could use them as loop exit condition
    (uint256 limitingAmount, MatchType matchType) = compareIntents(
      buy.exchangeableAmount,
      getOrderPrice(_self.pageMemory.marketPrice, buy),
      sell.exchangeableAmount,
      _self.priceComparisonPrecision
    );


    executeMatch(_commissionManager, _self, buy, sell, limitingAmount, _self.pageMemory.emergentPrice, matchType != MatchType.SELLER_FILL);
    if (matchType == MatchType.DOUBLE_FILL) {
      onOrderFullMatched(_self, _self.baseToken);
      onOrderFullMatched(_self, _self.secondaryToken);
    } else if (matchType == MatchType.BUYER_FILL) {
      onOrderFullMatched(_self, _self.baseToken);
    } else if (matchType == MatchType.SELLER_FILL) {
      onOrderFullMatched(_self, _self.secondaryToken);
    } else {
      // TODO
      require(false, "Unknown type");
    }
    return !isLastMatch;
  }

  /**
    @notice Simulates a matching step i.e. making one step to make the emergent price
    @param _self Struct that represents the pair
    @return True if there are more orders to be matched, i.e. if the tick should
    call simulateMatchingStep again
   */
  function simulateMatchingStep(Pair storage _self) public returns (bool) {
    assert(_self.tickStage == TickStage.RUNNING_SIMULATION);

    // keep in mind, this is a reference to a struct member, so by modifying it
    // we're not modifying the "real" orders
    Order storage buy = _self.pageMemory.lastBuyMatch;
    Order storage sell = _self.pageMemory.lastSellMatch;
    uint256 pricePrecision = _self.priceComparisonPrecision;
    uint256 marketPrice = _self.pageMemory.marketPrice;

    uint256 lastBuyLimitOrderId = _self.pageMemory.lastBuyLimitOrderId;
    uint256 lastBuyMarketOrderId = _self.pageMemory.lastBuyMarketOrderId;
    uint256 lastSellLimitOrderId = _self.pageMemory.lastSellLimitOrderId;
    uint256 lastSellMarketOrderId = _self.pageMemory.lastSellMarketOrderId;

    if (!shouldMatchStorage(marketPrice, buy, sell)) {
      return false;
    }

    uint256 orderPrice = getOrderPrice(marketPrice, buy);
    (uint256 limitingAmount, MatchType matchType) = compareIntents(
      buy.exchangeableAmount,
      orderPrice,
      sell.exchangeableAmount,
      pricePrecision
    );

    if (matchType == MatchType.DOUBLE_FILL) {
      // the asignments from getNextValidOrder set the references
      // to point to the "real" orders
      (buy, lastBuyLimitOrderId, lastBuyMarketOrderId) = getNextValidOrder(_self, true);
      (sell, lastSellLimitOrderId, lastSellMarketOrderId) = getNextValidOrder(_self, false);
    } else if (matchType == MatchType.BUYER_FILL) {
      (buy, lastBuyLimitOrderId, lastBuyMarketOrderId) = getNextValidOrder(_self, true);
      sell.exchangeableAmount = sell.exchangeableAmount.sub(limitingAmount);

    } else if (matchType == MatchType.SELLER_FILL) {
      uint256 buyerExpectedSend = convertToBase(limitingAmount, orderPrice, pricePrecision);
      (sell, lastSellLimitOrderId, lastSellMarketOrderId) = getNextValidOrder(_self, false);
      buy.exchangeableAmount = buy.exchangeableAmount.sub(buyerExpectedSend);
    } else {
      assert(false);
    }
    uint256 matchToAdd = matchType == MatchType.DOUBLE_FILL ? 2 : 1;
    _self.pageMemory.matchesAmount = _self.pageMemory.matchesAmount.add(matchToAdd);
    if (shouldMatchStorage(marketPrice, buy, sell)) {
      // this assignments copy:
      // https://solidity.readthedocs.io/en/v0.5.11/types.html#reference-types
      _self.pageMemory.lastBuyMatch = buy;
      _self.pageMemory.lastSellMatch = sell;
      _self.pageMemory.lastBuyLimitOrderId = lastBuyLimitOrderId;
      _self.pageMemory.lastBuyMarketOrderId = lastBuyMarketOrderId;
      _self.pageMemory.lastSellLimitOrderId = lastSellLimitOrderId;
      _self.pageMemory.lastSellMarketOrderId = lastSellMarketOrderId;

      return true;
    } else {
      return false;
    }
  }

  /**
    @notice gets the first not expired order of the orderbook, processing expired ones
    @param _pair Token pair
    @param _commissionManager commission manager.
    @param _token order Token data
    @param _tickNumber current tick Number
    @return the first valid order in the orderbook
  */
  function getFirstForMatching(
    Pair storage _pair,
    CommissionManager _commissionManager,
    Token storage _token,
    uint64 _tickNumber
    ) private returns (Order storage) {
    Order storage order = mostCompetitiveOrder(
      _pair.pageMemory.marketPrice,
      _token.orderbook,
      first(_token.orderbook),
      firstMarketOrder(_token.orderbook)
    );
    if (isExpired(order, _tickNumber)) {
      processExpiredOrder(_commissionManager, _token, order.id, order.exchangeableAmount, order.reservedCommission, order.owner);
      return getNextValidOrderForMatching(_pair, _commissionManager, _token, _tickNumber);
    }
    return order;
  }

  /**
    @notice Return the first order to expire.
    @param _orderbook the orderbook with the orders
    @param _orderType Order type to expire
   */
  function getFirstOrderToExpire(Data storage _orderbook, OrderType _orderType) private view returns (Order storage){
    if (_orderType == OrderType.MARKET_ORDER){
      return firstMarketOrder(_orderbook);
    }
    return first(_orderbook);
  }

  /**
    @notice Searchs for the following valid Order
    @param _pair Token pair
    @param _commissionManager commission manager.
    @param _token order Token data
    @param _tickNumber current tick Number
    @return the following valid order in the orderbook
  */
  function getNextValidOrderForMatching(Pair storage _pair, CommissionManager _commissionManager, Token storage _token, uint64 _tickNumber)
    private
    returns (Order storage)
  {
    Order storage order = popAndGetNewTop(_pair, _token.orderbook);
    if (order.id == 0 || !isExpired(order, _tickNumber)) {
      return order;
    } else {
      processExpiredOrder(_commissionManager, _token, order.id, order.exchangeableAmount, order.reservedCommission, order.owner);
      return getNextValidOrderForMatching(_pair, _commissionManager, _token, _tickNumber);
    }
  }

  /**
    @notice emits OrderFullMatch for the given _order and searchs for the following valid one
    @param _pair Token Pair
    @param _token token with the orderbook where the order is placed
    @return the following valid order in the orderbook
  */
  function onOrderFullMatched(
    Pair storage _pair,
    Token storage _token
  ) private {
    // TODO refactor; this code is repeated in popAndGetNewTop

    //just pop the most competitive order

    Order storage orderToPop = mostCompetitiveOrder(
      _pair.pageMemory.marketPrice,
      _token.orderbook,
      first(_token.orderbook),
      firstMarketOrder(_token.orderbook)
    );
    Order storage newTop = get(_token.orderbook, orderToPop.next);

    if (orderToPop.orderType == OrderType.LIMIT_ORDER){
      _token.orderbook.firstId = newTop.id;
      decreaseQueuesLength(_token.orderbook, false);
    }
    else{
      _token.orderbook.firstMarketOrderId = newTop.id;
      decreaseQueuesLength(_token.orderbook, true);
    }
    delete (_token.orderbook.orders[orderToPop.id]);
  }

  /**
    @notice Gives back the corresponding order value to the given _account
    @param _commissionManager commission manager.
    @param _token ERC20 token to transfer from.
    @param _exchangeableAmount Exchangeable amount of the order
    @param _reservedCommission Reserved amount to be potentially used in a commission
    @param _account address of the order funds beneficiary
    @param _isExpiration if true, uses the commission rate for expirations, otherwise uses the cancelation one
    @return transferResult True if the transfer to _account was successful
    @return exchangeableAmount Amount tried to be transfered from the orders to the user
    @return chargedCommission Commission charged as penalization
    @return commissionToReturn Amount tried to be trasfered from the commissions to the user
  */
  function refundOrder(
    CommissionManager _commissionManager,
    IERC20 _token,
    uint256 _exchangeableAmount,
    uint256 _reservedCommission,
    address _account,
    bool _isExpiration
  ) public returns (bool, uint256, uint256, uint256) {
    uint256 chargedCommission = _commissionManager.chargeExceptionalCommission(_reservedCommission, address(_token), _isExpiration);
    uint256 commissionToReturn = _reservedCommission.sub(chargedCommission);
    bool transferResult = SafeTransfer.doTransfer(_token, _account, _exchangeableAmount.add(commissionToReturn));
    return (transferResult, _exchangeableAmount, chargedCommission, commissionToReturn);
  }

  /**
    @notice Moves an order from the pending queue to the orderbook
    Has two discarded param; kept to have a fixed signature
    @dev First it tries to move everything in the buy queue and then goes to the selling queue
    Nevertheless always checks the buy order, no mather if we finished it already in case there is
    a new buy order while we process the sell order.
    It is important that this is the absolute LAST task of the ticks group
    @param _pair The pair of tokens
    @return True if there are still pending orders to move; false otherwise
  */
  function movePendingMarketOrdersStepFunction(Pair storage _pair) public {
    assert(_pair.tickStage == MoCExchangeLib.TickStage.MOVING_PENDING_ORDERS);
    // Cannot return shouldKeepGoing based on movedBuyOrder to avoid DOS attacks where someone
    // inserts new pending orders as soon as we finished inserting the other orders
    bool movedBuyOrder = movePendingMarketOrderFrom(
      _pair.baseToken,
      _pair.pageMemory,
      address(_pair.baseToken.token),
      address(_pair.secondaryToken.token),
      true
    );
    if (!movedBuyOrder) {
      movePendingMarketOrderFrom(
        _pair.secondaryToken,
        _pair.pageMemory,
        address(_pair.baseToken.token),
        address(_pair.secondaryToken.token),
        false
      );
    }
  }

/**
@notice Moves an order from the pending queue to the orderbook
Has two discarded param; kept to have a fixed signature
@dev First it tries to move everything in the buy queue and then goes to the selling queue
Nevertheless always checks the buy order, no mather if we finished it already in case there is
a new buy order while we process the sell order.
It is important that this is the absolute LAST task of the ticks group
@param _pair The pair of tokens
for the execution of a tick of a given pair
@return True if there are still pending orders to move; false otherwise
*/
  function movePendingOrdersStepFunction(Pair storage _pair) public returns (bool shouldKeepGoing) {
    movePendingLimitOrdersStepFunction(_pair);
    bool pendingOrders = _pair.baseToken.orderbook.amountOfPendingOrders != 0 || _pair.secondaryToken.orderbook.amountOfPendingOrders != 0;
    if (!pendingOrders){
      movePendingMarketOrdersStepFunction(_pair);
      pendingOrders = _pair.baseToken.orderbook.amountOfPendingMarketOrders != 0 || _pair.secondaryToken.orderbook.amountOfPendingMarketOrders != 0;
    }

    return pendingOrders;
  }

  /**
    @notice Moves a limit order from the pending queue to the orderbook
    Has two discarded param; kept to have a fixed signature
    @dev First it tries to move everything in the buy queue and then goes to the selling queue
    Nevertheless always checks the buy order, no mather if we finished it already in case there is
    a new buy order while we process the sell order.
    It is important that this is the absolute LAST task of the ticks group
    @param _pair The pair of tokens
    @return True if there are still pending orders to move; false otherwise
  */
  function movePendingLimitOrdersStepFunction(Pair storage _pair) public {
    assert(_pair.tickStage == MoCExchangeLib.TickStage.MOVING_PENDING_ORDERS);
    // Cannot return shouldKeepGoing based on movedBuyOrder to avoid DOS attacks where someone
    // inserts new pending orders as soon as we finished inserting the other orders
    bool movedBuyOrder = movePendingLimitOrderFrom(
      _pair.baseToken,
      _pair.pageMemory,
      address(_pair.baseToken.token),
      address(_pair.secondaryToken.token),
      true
    );
    if (!movedBuyOrder) {
      movePendingLimitOrderFrom(
        _pair.secondaryToken,
        _pair.pageMemory,
        address(_pair.baseToken.token),
        address(_pair.secondaryToken.token),
        false
      );
    }
  }

  /**
    @notice Moves a market order from the pending queue to the corresponding orderbook
    @param _token Struct that containts the orderbook and pendingQueue data structures
    @param pageMemory Page memory of this tick, has auxiliar info to make it run. Hints are useful in this fn
    @param baseTokenAddress Address of the base token of the pair this order belongs to
    @param secondaryTokenAddress Address of the secondary token of the pair this order belongs to
    @param isBuy True if the _token and orderbook/pendingQueue in it are related to buy orders
    False otherwise
   */
  function movePendingMarketOrderFrom(
    Token storage _token,
    TickPaginationMemory storage pageMemory,
    address baseTokenAddress,
    address secondaryTokenAddress,
    bool isBuy
  ) public returns (bool doneWork) {
    if (_token.orderbook.amountOfPendingMarketOrders == 0) return false;
    Order storage orderToMove = firstPendingMarketOrder(_token.orderbook);
    _token.orderbook.firstPendingMarketOrderToPopId = orderToMove.next;
    _token.orderbook.amountOfPendingMarketOrders = _token.orderbook.amountOfPendingMarketOrders.sub(1);

    // position orderToMove
    uint256 previousOrderId;
    //TODO: DAM: Check this
    if (pageMemory.hintIdsIndex < pageMemory.hintIds.length) {
      previousOrderId = pageMemory.hintIds[pageMemory.hintIdsIndex++];
      validatePreviousMarketOrder(_token.orderbook, orderToMove.multiplyFactor, previousOrderId);
    } else {
      previousOrderId = findPreviousMarketOrderToMultiplyFactor(_token.orderbook, orderToMove.multiplyFactor);
    }

    emit NewOrderInserted(
      orderToMove.id,
      orderToMove.owner,
      baseTokenAddress,
      secondaryTokenAddress,
      orderToMove.exchangeableAmount,
      orderToMove.reservedCommission,
      0,
      orderToMove.multiplyFactor,
      orderToMove.expiresInTick,
      isBuy,
      OrderType.MARKET_ORDER
    );

    positionMarketOrder(_token.orderbook, orderToMove.id, previousOrderId);
    return true;
  }

  /**
    @notice Moves an order from the pending queue to the corresponding orderbook
    @param _token Struct that containts the orderbook and pendingQueue data structures
    @param pageMemory Page memory of this tick, has auxiliar info to make it run. Hints are useful in this fn
    @param baseTokenAddress Address of the base token of the pair this order belongs to
    @param secondaryTokenAddress Address of the secondary token of the pair this order belongs to
    @param isBuy True if the _token and orderbook/pendingQueue in it are related to buy orders
    False otherwise
   */
  function movePendingLimitOrderFrom(
    Token storage _token,
    TickPaginationMemory storage pageMemory,
    address baseTokenAddress,
    address secondaryTokenAddress,
    bool isBuy
  ) public returns (bool doneWork) {
    if (_token.orderbook.amountOfPendingOrders == 0) return false;
    // pop from queue
    Order storage orderToMove = firstPending(_token.orderbook);
    _token.orderbook.firstPendingToPopId = orderToMove.next;
    _token.orderbook.amountOfPendingOrders = _token.orderbook.amountOfPendingOrders.sub(1);

    // position orderToMove
    uint256 previousOrderId;
    if (pageMemory.hintIdsIndex < pageMemory.hintIds.length) {
      previousOrderId = pageMemory.hintIds[pageMemory.hintIdsIndex++];
      validatePreviousOrder(_token.orderbook, orderToMove.price, previousOrderId);
    } else {
      previousOrderId = findPreviousOrderToPrice(_token.orderbook, orderToMove.price);
    }

    emit NewOrderInserted(
      orderToMove.id,
      orderToMove.owner,
      baseTokenAddress,
      secondaryTokenAddress,
      orderToMove.exchangeableAmount,
      orderToMove.reservedCommission,
      orderToMove.price,
      0,
      orderToMove.expiresInTick,
      isBuy,
      OrderType.LIMIT_ORDER // TODO This is correct for now; but we might have to change it soon
    );

    positionOrder(_token.orderbook, orderToMove.id, previousOrderId);
    return true;
  }

  /**
   * @notice Get the current market price calling PriceProvider
   * @param _pair The pair of tokens
   */
  function getMarketPrice(Pair storage _pair) public view returns(uint256) {
    (bytes32 binaryPrice, bool success) = _pair.priceProvider.peek();
    require(success, "Price not available");
    return uint256(binaryPrice);
  }
}
