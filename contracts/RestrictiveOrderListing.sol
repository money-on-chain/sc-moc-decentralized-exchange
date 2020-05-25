pragma solidity 0.5.8;

import "./OrderListing.sol";


contract RestrictiveOrderListing is OrderListing {
  uint256 public minOrderAmount;
  uint64 public maxOrderLifespan;

  /**
    @notice Checks if the amount is valid given a maximum in commonBaseToken currency; reverts if not
    @param _tokenAddess Address of the token the amount is in
    @param _amount Amount to be checked
    @param _baseToken Address of the base token in the pair being exchanged
   */
  modifier isValidAmount(
    address _tokenAddess,
    uint256 _amount,
    address _baseToken
  ) {
    uint256 convertedAmount = convertTokenToCommonBase(_tokenAddess, _amount, _baseToken);
    require(convertedAmount >= minOrderAmount, "Amount too low");
    _;
  }

  /**
    @notice Checks if the amount is valid given a minimum; reverts if not
    @param _lifespan Lifespan to be checked
   */
  modifier isValidLifespan(uint64 _lifespan) {
    require(_lifespan <= maxOrderLifespan, "Lifespan too high");
    _;
  }

  /**
    @notice Checks if the _pri a minimum; reverts if not
    @param _price Price to be checked
   */
  modifier isValidPrice(uint256 _price) {
    require(_price != 0, "Price cannot be zero");
    _;
  }

  /* TODO: UNUSED MODIFIER BECAUSE OF CONTRACT SIZE LIMIT
  @notice Checks if the _pri a minimum; reverts if not
  @param _multiplyFactor MultiplyFactor to be checked
  modifier isValidMultiplyFactor(uint256 _multiplyFactor) {
    require(_multiplyFactor != 0, "MultiplyFactor cannot be zero");
    _;
  }

  
  @notice Checks if the _pri a minimum; reverts if not
  @param _exchangeableAmout Exchangeable amount to be checked
  
  modifier isValidExchangeableAmount(uint256 _exchangeableAmout) {
    require(_exchangeableAmout != 0, "Exchangeable amount cannot be zero");
    _;
  } */

  /**
    @notice Sets the minimum order amount in commonBaseToken currency; only callable through governance
    @param _minOrderAmount New minimum
   */
  function setMinOrderAmount(uint256 _minOrderAmount) public onlyAuthorizedChanger {
    minOrderAmount = _minOrderAmount;
  }

  /**
    @notice Sets the maximum lifespan for an order; only callable through governance
    @param _maxOrderLifespan New maximum
   */

  function setMaxOrderLifespan(uint64 _maxOrderLifespan) public onlyAuthorizedChanger {
    maxOrderLifespan = _maxOrderLifespan;
  }

  /**
    @dev This function must initialize every variable in storage, this is necessary because of the proxy
    pattern we are using. The initializer modifier disables this function once its called so it prevents
    that someone else calls it without the deployer noticing. Of course they may block your deploys but that
    would be an extremely unlucky scenario. onlyAuthorizedChanger cannot be used here since the governor is not set yet
    @param _commonBaseTokenAddress address of the common base token, necessary to convert amounts to a known scale
    @param _commissionManager Address of the contract that manages all the fee related things
    @param _expectedOrdersForTick amount of orders expected to match in each tick
    @param _maxBlocksForTick the max amount of blocks to wait until allowing to run the tick
    @param _minBlocksForTick the min amount of blocks to wait until allowing to run the tick
    @param _minOrderAmount the minimal amount in common base that every order should cover
    @param _maxOrderLifespan the maximal lifespan in ticks for an order
    @param _governor Address in charge of determining who is authorized and who is not
    @param _stopper Address that is authorized to pause the contract
 */
  function initialize(
    address _commonBaseTokenAddress,
    CommissionManager _commissionManager,
    uint64 _expectedOrdersForTick,
    uint64 _maxBlocksForTick,
    uint64 _minBlocksForTick,
    uint256 _minOrderAmount,
    uint64 _maxOrderLifespan,
    address _governor,
    address _stopper
  ) public initializer {
    OrderListing.initialize(
      _commonBaseTokenAddress,
      _commissionManager,
      _expectedOrdersForTick,
      _maxBlocksForTick,
      _minBlocksForTick,
      _governor,
      _stopper
    );
    minOrderAmount = _minOrderAmount;
    maxOrderLifespan = _maxOrderLifespan;
  }

  /**
    @notice Inserts an order in the buy orderbook of a given pair with a hint;
    the contract should not be paused. Takes the funds with a transferFrom
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
    @param _amount Amount to be locked[base]; should have enough allowance
    @param _price Maximum price to be paid [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
    @param _previousOrderIdHint Order that comes immediately before the new order;
    0 is considered as no hint and the smart contract must iterate
    INSERT_FIRST is considered a hint to be put at the start
  */
  function insertBuyOrderAfter(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) public isValidAmount(_baseToken, _amount, _baseToken) isValidLifespan(_lifespan) isValidPrice(_price) {
    OrderListing.insertBuyOrderAfter(_baseToken, _secondaryToken, _amount, _price, _lifespan, _previousOrderIdHint);
  }

  /**
    @notice Inserts a market order in the buy orderbook of a given pair with a hint;
    the pair should not be disabled; the contract should not be paused. Takes the funds
    with a transferFrom
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
    @param _amount The quantity of tokens sent
    @param _multiplyFactor Maximum price to be paid [base/secondary]
    @param _previousOrderIdHint Order that comes immediately before the new order;
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
    @param _isBuy true if it is a buy market order    
    0 is considered as no hint and the smart contract must iterate
    INSERT_FIRST is considered a hint to be put at the start
  */
  function insertMarketOrderAfter(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _multiplyFactor,
    uint256 _previousOrderIdHint,
    uint64 _lifespan,
    bool _isBuy
  ) public isValidLifespan(_lifespan) {
    //TODO: ADD Modifiers. It can not be used because contract limit
    //public  isValidLifespan(_lifespan) isValidExchangeableAmount(_exchangeableAmout) isValidMultiplyFactor(_multiplyFactor) {
    OrderListing.insertMarketOrderAfter(_baseToken, _secondaryToken, _amount, _multiplyFactor, _previousOrderIdHint, _lifespan, _isBuy);
  }

  /**
    @notice Inserts an order in the sell orderbook of a given pair with a hint;
    the contract should not be paused. Takes the funds with a transferFrom
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
    @param _amount Amount to be locked[secondary]; should have enough allowance
    @param _price Maximum price to be paid [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
    @param _previousOrderIdHint Order that comes immediately before the new order;
    0 is considered as no hint and the smart contract must iterate
    INSERT_FIRST is considered a hint to be put at the start
   */
  function insertSellOrderAfter(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) public isValidAmount(_secondaryToken, _amount, _baseToken) isValidLifespan(_lifespan) isValidPrice(_price) {
    OrderListing.insertSellOrderAfter(_baseToken, _secondaryToken, _amount, _price, _lifespan, _previousOrderIdHint);
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}
