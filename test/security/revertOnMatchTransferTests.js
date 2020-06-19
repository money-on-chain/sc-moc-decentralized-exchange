const _ = require('lodash');
const { expectEvent } = require('openzeppelin-test-helpers');
const { orderBookMatcherBothTypes } = require('../testHelpers/orderBookMatcher');
const testHelperBuilder = require('../testHelpers/testHelper');

// base scenario setup for both situations
const baseScenario = {
  description: 'one sell order matches against two buy orders',
  accounts: [1, 2, 3, 4].reduce(
    (acc, it) => ({
      ...acc,
      [it]: { baseBalance: 200, baseAllowance: 200, secondaryBalance: 200, secondaryAllowance: 200 }
    }),
    {}
  ),
  buyOrders: {
    description: 'GIVEN there are tree buy orders from different users',
    orders: [
      {
        lockingAmount: 120, // Locked Base Token, to get 12 Secondary
        price: 10,
        accountIndex: 1
      },
      {
        lockingAmount: 60, // Locked Base Token, to get 3 Secondary
        price: 20,
        accountIndex: 2
      },
      // This Order should not be matched, as previous has a more convenient price
      {
        lockingAmount: 30, // Locked Base Token, to get 3 Secondary
        price: 10,
        accountIndex: 3
      }
    ]
  },
  sellOrders: {
    description: 'AND a sell order that fills 15',
    orders: [
      {
        lockingAmount: 15, // Secondary lockingAmount to sell
        price: 10,
        accountIndex: 4
      }
    ]
  }
};

const expectedScenario = {
  ...baseScenario,
  buyerMatches: {
    description:
      'AND the first buyer matches at 10 with 30 change, the second at 10 without change',
    matches: [
      {
        orderId: 2,
        amountSent: 30,
        change: 30,
        filled: true,
        received: 3,
        commission: 0,
        matchPrice: 10
      },
      {
        orderId: 1,
        amountSent: 120,
        change: 0,
        filled: true,
        received: 12,
        commission: 0,
        matchPrice: 10
      }
    ]
  },
  sellerMatches: {
    description: 'AND the seller matches at 10 both times, without surplus',
    matches: [
      {
        orderId: 4,
        amountSent: 3,
        commission: 0,
        received: 30,
        surplus: 0,
        remainingAmount: 12,
        matchPrice: 10
      },
      {
        orderId: 4,
        amountSent: 12,
        commission: 0,
        received: 120,
        surplus: 0,
        filled: true,
        matchPrice: 10
      }
    ]
  },
  remainingSellOrders: {
    description: 'AND the sell orderbook is empty',
    orders: []
  },
  remainingBuyOrders: {
    description: 'AND the 3ed buy order remains in the orderbook',
    orders: [{ id: 3, lockedAmount: 30, price: 10 }]
  }
};

describe.skip('Security: ERC20 Transfer revert', function() {
  this.timeout(5000);
  const getTestHelper = accounts => async () => {
    const testHelper = testHelperBuilder();
    await testHelper.createContracts({
      owner: accounts[0],
      useBlacklist: true,
      tokenPair: {}
    });
    return testHelper;
  };

  // Works as a control case
  contract('Dex: GIVEN all users are able to operate', function(accounts) {
    return orderBookMatcherBothTypes(getTestHelper(accounts), expectedScenario, accounts);
  });

  contract('Dex: GIVEN a user gets black-listed from secondary Token', function(accounts) {
    const getTestHelperAndBlackList = async () => {
      const testHelper = await getTestHelper(accounts)();
      const dex = await testHelper.getDex();
      const secondary = await testHelper.getSecondary();
      const base = await testHelper.getBase();
      await testHelper.setOracleMarketPrice(dex, doc.address, secondary.address, 1);
      await secondary.blacklist(accounts[2]);
      return testHelper;
    };
    const blacklistedScenario = _.cloneDeep(expectedScenario);
    // As #2 order could not be transfer
    // dex still has Secondary balance
    blacklistedScenario.remainingSellOrders.dexSecondaryBalance = 3;
    // And totalReceived is zero
    blacklistedScenario.buyerMatches.matches[0].received = 0;
    // And there is no Secondary Transfer
    blacklistedScenario.buyerMatches.matches[0].skipSecondaryTransfer = true;

    blacklistedScenario.custom = [
      {
        description: 'AND a TransferFailed event is emitted for the user and the blacklisted Token',
        it: getContext => async () => {
          const { transaction, testHelper, secondaryToken } = getContext();
          expectEvent.inLogs(transaction.logs, 'TransferFailed', {
            _tokenAddress: secondaryToken.address,
            _to: accounts[2],
            _amount: testHelper.wadify(3),
            _isRevert: true
          });
        }
      }
    ];
    return orderBookMatcherBothTypes(getTestHelperAndBlackList, blacklistedScenario, accounts);
  });
});
