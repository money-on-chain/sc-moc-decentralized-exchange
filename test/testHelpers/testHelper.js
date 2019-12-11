const contractsBuilder = require('./contractsBuilder');
const functionHelper = require('./functionHelper');
const assertsHelper = require('./assertsHelper');
const networkFunctions = require('./networkHelper');
const eventsHelper = require('./eventsHelper');
const protectedFunctions = require('./protectedFunctions');
const constants = require('./constants');

module.exports = function() {
  return {
    ...assertsHelper({ ...constants, ...functionHelper }),
    ...networkFunctions,
    ...contractsBuilder(),
    ...functionHelper,
    ...eventsHelper,
    ...protectedFunctions,
    ...constants
  };
};
