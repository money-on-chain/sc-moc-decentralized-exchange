#!/usr/bin/env bash
echo "Starting to flatten our contracts"
node_modules/.bin/truffle-flattener contracts/MoCDecentralizedExchange.sol > scripts/contract_flatten/MoCDecentralizedExchange_flat.sol
node_modules/.bin/truffle-flattener contracts/CommissionManager.sol > scripts/contract_flatten/CommissionManager_flat.sol
node_modules/.bin/truffle-flattener contracts/libs/MoCExchangeLib.sol > scripts/contract_flatten/MoCExchangeLib_flat.sol
node_modules/.bin/truffle-flattener contracts/price-providers/TexMocBtcPriceProviderFallback.sol > scripts/contract_flatten/TexMocBtcPriceProviderFallback.sol
echo "Finish successfully! Take a look in folder scripts/contract_flatten/..."