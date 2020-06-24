const { expect } = require('chai');
const { expectRevert, expectEvent } = require('openzeppelin-test-helpers');
const { BN } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
let assertBig;
const ORDERS_FOR_TICK = 8;
const MAX_BLOCKS_FOR_TICK = 20;
const MIN_BLOCKS_FOR_TICK = 10;
const ERROR_MSG_EXPECTED_ORDERS_FOR_TICK_TOO_LOW = 'Expected orders for tick too low';
const ERROR_MSG_MAX_LOWER_THAN_MIN_BLOCKS_FOR_TICK = 'min BlockForTick should be lower than max';
const ERROR_MSG_NEXT_TICK_BLOCK_NOT_REACHED = 'Next tick not reached';

describe('Tick State test', function() {
  let getTickState;
  let match;
  let base;
  let secondary;
  let governor;
  let dex;
  before(async function() {
    testHelper = testHelperBuilder();
    ({ assertBig } = testHelper);
    [dex, base, secondary, governor] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary(),
      testHelper.getGovernor()
    ]);
    getTickState = () => dex.getNextTick(base.address, secondary.address);
    match = () =>
      dex.matchOrders(base.address, secondary.address, testHelper.DEFAULT_STEPS_FOR_MATCHING);
    dex = testHelper.decorateGovernedSetters(dex);
  });

  contract('RULE: check initial contract Tick', function() {
    describe('WHEN a new MoCDecentralizedExchange is deployed', function() {
      it('THEN its tick state should be in its initial value', async function() {
        const { '0': tickNumber } = await getTickState();
        assertBig(tickNumber, 1, 'Tick Number');
      });
      it('AND its blocks for tick should be the given in its initialize', async function() {
        const {
          expectedOrdersForTick,
          maxBlocksForTick,
          minBlocksForTick
        } = await dex.tickConfig();
        assertBig(expectedOrdersForTick, ORDERS_FOR_TICK, 'Orders For Tick');
        assertBig(maxBlocksForTick, MAX_BLOCKS_FOR_TICK, 'Max Blocks For Tick');
        assertBig(minBlocksForTick, MIN_BLOCKS_FOR_TICK, 'Min Blocks For Tick');
      });
    });
  });

  contract('RULE: expected orders for tick should be more than 2', function() {
    it('WHEN calling setExpectedOrdersForTick with less than 2, THEN it should revert', function() {
      return expectRevert(
        dex.setExpectedOrdersForTick(1, governor),
        ERROR_MSG_EXPECTED_ORDERS_FOR_TICK_TOO_LOW
      );
    });
    describe('BUT WHEN calling setExpectedOrdersForTick with more than 2', function() {
      it('THEN ordersForTick should be the given', async function() {
        await dex.setExpectedOrdersForTick(5, governor);
        assertBig((await dex.tickConfig()).expectedOrdersForTick, 5, 'Orders For Tick');
      });
    });
  });

  contract(
    'RULE: the Max Blocks for tick should be greater than the Min Blocks for Tick',
    function() {
      it('WHEN calling updateMaxBlocksForTick with less than MIN_BLOCKS_FOR_TICK, THEN it should revert', function() {
        return expectRevert(
          dex.setMaxBlocksForTick(MIN_BLOCKS_FOR_TICK - 2, governor),
          ERROR_MSG_MAX_LOWER_THAN_MIN_BLOCKS_FOR_TICK
        );
      });
      describe('BUT WHEN calling setMaxBlocksForTick with more than MIN_BLOCKS_FOR_TICK', function() {
        it('THEN maxBlocksForTick should be the given', async function() {
          await dex.setMaxBlocksForTick(MIN_BLOCKS_FOR_TICK + 2, governor);
          assertBig(
            (await dex.tickConfig()).maxBlocksForTick,
            MIN_BLOCKS_FOR_TICK + 2,
            'Max Blocks For Tick'
          );
        });
      });
    }
  );

  contract(
    'RULE: the Min Blocks for tick should be lower or equal than the Max Blocks for Tick',
    async function() {
      it('WHEN calling setMinBlocksForTick with more than MAX_BLOCKS_FOR_TICK, THEN it should revert', function() {
        return expectRevert(
          dex.setMinBlocksForTick(MAX_BLOCKS_FOR_TICK + 2, governor),
          ERROR_MSG_MAX_LOWER_THAN_MIN_BLOCKS_FOR_TICK
        );
      });
      describe('BUT WHEN calling setMinBlocksForTick with less than MAX_BLOCKS_FOR_TICK', function() {
        before(function() {
          return dex.setMinBlocksForTick(MAX_BLOCKS_FOR_TICK - 2, governor);
        });
        it('THEN minBlocksForTick should be the given', async function() {
          assertBig(
            (await dex.tickConfig()).minBlocksForTick,
            MAX_BLOCKS_FOR_TICK - 2,
            'Min Blocks For Tick'
          );
        });
      });
      describe('AND WHEN calling setMinBlocksForTick with equal than MAX_BLOCKS_FOR_TICK', function() {
        before(function() {
          return dex.setMinBlocksForTick(MAX_BLOCKS_FOR_TICK, governor);
        });
        it('THEN minBlocksForTick should be the given', async function() {
          assertBig(
            (await dex.tickConfig()).minBlocksForTick,
            MAX_BLOCKS_FOR_TICK,
            'Min Blocks For Tick'
          );
        });
      });
    }
  );

  describe('GIVEN the MAX_BLOCKS_FOR_TICK have passed', function() {
    before(function() {
      return testHelper.waitNBlocks(MAX_BLOCKS_FOR_TICK);
    });

    contract('RULE: Update tick state when running the order matching', function() {
      let tx;
      describe('WHEN calling matchOrders', function() {
        before(async function() {
          tx = await match();
        });
        it('THEN an start of tick event is emitted', function() {
          expectEvent.inLogs(tx.logs, 'TickStart', {
            number: new BN('1'),
            baseTokenAddress: base.address,
            secondaryTokenAddress: secondary.address
          });
        });
        it('AND an end of tick event is emitted', function() {
          expectEvent.inLogs(tx.logs, 'TickEnd', {
            number: new BN('1'),
            baseTokenAddress: base.address,
            secondaryTokenAddress: secondary.address,
            closingPrice: testHelper.pricefy(0)
          });
        });
        it('AND the Tick number has increased', async function() {
          const { '0': tickNumber, '2': lastTickBlock } = await getTickState();
          assertBig(tickNumber, 2, 'Tick Number');
          assertBig(lastTickBlock, tx.receipt.blockNumber, 'Tick Next Block');
        });
      });
    });

    describe('AND matchOrders was called AND the Tick number has increased', function() {
      let txBlockNumber;
      let expectedNextBlock;
      const runMatching = async function() {
        const tx = await match();
        txBlockNumber = tx.receipt.blockNumber;
        const { '0': tickNumber, '1': nextTickBlock, '2': lastTickBlock } = await getTickState();
        expectedNextBlock = nextTickBlock;
        assertBig(tickNumber, 2, 'Tick Number');
        assertBig(lastTickBlock, txBlockNumber, 'Tick Next Block');
      };

      contract(
        'RULE: Running matching long after nextBlockTick should generate a nextBlockTick after the block number when it was runned and not the expected',
        function() {
          before(runMatching);
          it('WHEN more than the expected amount of blocks have passed', function() {
            return testHelper.waitNBlocks(3 * MAX_BLOCKS_FOR_TICK);
          });
          it('AND calling matchOrders', function() {
            return match();
          });
          it('THEN the Tick number has increased', async function() {
            const { '0': tickNumber } = await getTickState();
            assertBig(tickNumber, 3, 'Tick Number');
          });
          it('AND the next tick block is the expected', async function() {
            const { '1': nextTickBlock } = await getTickState();
            const badNextTickBlock = expectedNextBlock.toNumber() + MAX_BLOCKS_FOR_TICK;
            expect(nextTickBlock).to.not.be.equals(badNextTickBlock);
          });
        }
      );

      contract('RULE: Running matching before nextBlockTick should revert', function() {
        // eslint-disable-next-line mocha/no-sibling-hooks
        before(runMatching);
        it('WHEN calling matchOrders right after THEN it should revert', function() {
          return expectRevert(match(), ERROR_MSG_NEXT_TICK_BLOCK_NOT_REACHED);
        });
        it('AND the Tick number should stay the same', async function() {
          const { '0': tickNumber, '2': lastTickBlock } = await getTickState();
          assertBig(tickNumber, 2, 'Tick Number');
          assertBig(lastTickBlock, txBlockNumber, 'Tick Next Block');
        });
      });
    });
  });
});
