const { deployGovernanceSetChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[3] || 'rskTestnet',
  newGovernor: '0x4eAC4518e81B3A5198aADAb998D2610B46aAA609',
  newProxyAdmin: '0xffb65F6E24806B7e1A988EeD1Ad07BB2654fF695',
  newStopper: '0x5bCdf8A2E61BD238AEe43b99962Ee8BfBda1Beca'
};

const execute = async () => {
  const contractAddress = await deployGovernanceSetChanger(
    input.network,
    input.newGovernor,
    input.newStopper,
    input.newProxyAdmin
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};
execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
