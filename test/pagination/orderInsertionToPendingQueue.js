const { BN, expectEvent, expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('../testHelpers/testHelper');

let testHelper;
let wadify;
let pricefy;

describe('Insertion of orders to a pending queue when the tick is being run', function() {
  let dex;
  let base;
  let secondary;
  let baseAddress;
  let secondaryAddress;
  let pair;
  let assertBig;
  const initContractsAndAllowance = (accounts, tickParams = {}) => async () => {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, assertBig } = testHelper);
    await testHelper.createContracts(
      Object.assign(
        {},
        {
          ordersForTick: 2,
          maxBlocksForTick: 2,
          minBlocksForTick: 1,
          owner: accounts[0],
          tokenPair: {}
        },
        tickParams
      )
    );
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    [baseAddress, secondaryAddress] = [base.address, secondary.address];
    pair = [baseAddress, secondaryAddress];
    const userData = {
      // buyer
      '1': {
        baseAllowance: 100000,
        baseBalance: 100000
      },
      // seller
      '2': {
        secondaryBalance: 100000,
        secondaryAllowance: 100000
      }
    };
    await testHelper.setBalancesAndAllowances({ userData, accounts });
    dex = testHelper.decorateOrderInsertions(dex, accounts, { base, secondary });
  };

  contract(
    'Orders inserted to a pair during matching are not considered for the current tick',
    function(accounts) {
      const [, buyer, seller] = accounts;
      before(initContractsAndAllowance(accounts));

      describe('GIVEN there are 2 buy and 2 sell orders (requires 2 steps to match)', function() {
        before(async function() {
          return Promise.all([
            dex.insertBuyOrder({ from: buyer }),
            dex.insertBuyOrder({ from: buyer }),
            dex.insertSellOrder({ from: seller }),
            dex.insertSellOrder({ from: seller })
          ]);
        });

        describe('WHEN matching is run with three steps(2 for the simulation, 1 for the first matching)', function() {
          before(function() {
            return dex.matchOrders(...pair, 3);
          });
          it('THEN the tick is running', function() {
            return assertBig(dex.getTickStage(...pair), testHelper.tickStages.RUNNING_MATCHING);
          });
          it('AND both orderbooks have length 1 (one order pair matched already)', function() {
            return Promise.all([
              assertBig(dex.buyOrdersLength(...pair), 1, 'buy Orders Length'),
              assertBig(dex.sellOrdersLength(...pair), 1, 'sell Orders Length')
            ]);
          });

          describe('WHEN a sell order is inserted', function() {
            let pensingOrderEvent;
            before(async function() {
              pensingOrderEvent = await dex.insertSellOrder({ from: seller, pending: true });
            });
            it('THEN sell orderbook length is not affected', function() {
              return assertBig(dex.sellOrdersLength(...pair), 1, 'sell Orders Length');
            });
            it('AND a special event for the insertion to a pending queue is emmitted', function() {
              return assertBig(pensingOrderEvent.id, 5, 'Pending order Id');
            });
            it('AND the order was inserted to the sell pending queue', function() {
              return assertBig(
                dex.pendingSellOrdersLength(...pair),
                1,
                'sell pending Orders Length'
              );
            });
            it('AND the buy pending queue is still empty', function() {
              return assertBig(dex.pendingBuyOrdersLength(...pair), 0, 'buy pending Orders Length');
            });
          });
        });
      });
    }
  );

  contract('Orders inserted with hint during matching', function(accounts) {
    const [, buyer, seller] = accounts;
    before(initContractsAndAllowance(accounts));

    describe('GIVEN there are 2 buy and 2 sell orders', function() {
      before(function() {
        return Promise.all([
          dex.insertBuyOrder({ from: buyer }),
          dex.insertBuyOrder({ from: buyer }),
          dex.insertSellOrder({ from: seller }),
          dex.insertSellOrder({ from: seller })
        ]);
      });

      describe('WHEN a buy order is inserted with an incorrect hinting', function() {
        it('THEN it reverts', function() {
          return expectRevert(
            dex.insertBuyOrderAfter(...pair, wadify(1), pricefy(1), 5, 1, {
              from: buyer
            }),
            'Order should go after'
          );
        });
        describe('BUT GIVEN matching is running', function() {
          before(function() {
            return dex.matchOrders(...pair, 1);
          });
          describe('WHEN the same order is inserted', function() {
            let logs;
            before(async function() {
              ({ logs } = await dex.insertBuyOrderAfter(...pair, wadify(1), pricefy(1), 5, 1, {
                from: buyer
              }));
            });
            it('THEN the event for the insertion to a pending queue is emmitted', function() {
              return expectEvent.inLogs(logs, 'NewOrderAddedToPendingQueue', {
                id: new BN(5)
              });
            });
            it('AND the order was inserted to the pending queue', function() {
              return assertBig(dex.pendingBuyOrdersLength(...pair), 1, 'buy Orders Length');
            });
          });
        });
      });
    });
  });
});
