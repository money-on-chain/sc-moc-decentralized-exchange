const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
const ORDERS_FOR_TICK = 8;
const MAX_BLOCKS_FOR_TICK = 12;
const MIN_BLOCKS_FOR_TICK = 4;

contract('Next Tick Block test', function() {
  let tickStateContract;
  // eslint-disable-next-line mocha/no-top-level-hooks
  before(async function() {
    testHelper = testHelperBuilder();
    await testHelper.createTickStateFake({
      ordersForTick: ORDERS_FOR_TICK,
      maxBlocksForTick: MAX_BLOCKS_FOR_TICK,
      minBlocksForTick: MIN_BLOCKS_FOR_TICK
    });
    tickStateContract = await testHelper.getTickState();
  });
  const testBlocksUntilNextTickFor = function({
    blocksPassed,
    ordersLength,
    expectedBlocksForTick
  }) {
    return function() {
      describe(`GIVEN ORDERS_FOR_TICK: ${ORDERS_FOR_TICK}, MAX_BLOCKS_FOR_TICK: ${MAX_BLOCKS_FOR_TICK}, MIN_BLOCKS_FOR_TICK: ${MIN_BLOCKS_FOR_TICK}`, function() {
        describe('AND the tick state is clean', function() {
          before(function() {
            return tickStateContract.nextTick(0);
          });
          describe(`AND ${blocksPassed} blocks passed`, function() {
            before(function() {
              return testHelper.waitNBlocks(blocksPassed - 1);
            });
            let tx;
            describe(`WHEN getting the next Tick for ${ordersLength} orders`, function() {
              before(async function() {
                tx = await tickStateContract.nextTick(ordersLength);
              });
              it(`THEN the next tick block is ${expectedBlocksForTick}`, async function() {
                const { lastTickBlock, nextTickBlock } = await tickStateContract.tickState();
                const blocksUntilNextTick = nextTickBlock - lastTickBlock;
                return testHelper.assertBig(
                  blocksUntilNextTick,
                  expectedBlocksForTick,
                  'Blocks until next tick'
                );
              });
              it('AND the event emitted it is as expected', function() {
                const [event] = tx.logs.filter(it => it.event === 'TickEnd').map(it => it.args);
                return testHelper.assertTickEnd(tx, event, {
                  blocksForTick: expectedBlocksForTick
                });
              });
            });
          });
        });
      });
    };
  };

  // eslint-disable-next-line mocha/max-top-level-suites
  describe(
    'RULE: then min amount of blocks until the next tick can not be less than MIN_BLOCKS_FOR_TICK',
    testBlocksUntilNextTickFor({
      blocksPassed: 3,
      ordersLength: 12,
      expectedBlocksForTick: MIN_BLOCKS_FOR_TICK
    })
  );

  describe(
    'RULE: then min amount of blocks until the next tick can not be more than MAX_BLOCKS_FOR_TICK',
    testBlocksUntilNextTickFor({
      blocksPassed: 5,
      ordersLength: 2,
      expectedBlocksForTick: MAX_BLOCKS_FOR_TICK
    })
  );

  describe(
    'RULE: then min amount of blocks until the next tick should be the expected',
    testBlocksUntilNextTickFor({
      blocksPassed: 20,
      ordersLength: 16,
      expectedBlocksForTick: 10
    })
  );

  describe(
    'RULE: then min amount of blocks until the next tick should truncate as expected',
    testBlocksUntilNextTickFor({
      blocksPassed: 7,
      ordersLength: 9,
      expectedBlocksForTick: 6
    })
  );
});
