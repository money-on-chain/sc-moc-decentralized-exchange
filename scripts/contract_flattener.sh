#!/usr/bin/env bash
echo "Starting to flatten our contracts"
node_modules/.bin/truffle-flattener contracts/MoCDecentralizedExchange.sol > scripts/contract_flatten/MoCDecentralizedExchange_flat.sol
node_modules/.bin/truffle-flattener contracts/CommissionManager.sol > scripts/contract_flatten/CommissionManager_flat.sol
node_modules/.bin/truffle-flattener contracts/libs/MoCExchangeLib.sol > scripts/contract_flatten/MoCExchangeLib_flat.sol
node_modules/.bin/truffle-flattener contracts/price-providers/TexMocBtcPriceProviderFallback.sol > scripts/contract_flatten/TexMocBtcPriceProviderFallback.sol
node_modules/.bin/truffle-flattener contracts/price-providers/TokenPriceProviderLastClosingPrice.sol > scripts/contract_flatten/TokenPriceProviderLastClosingPrice.sol
node_modules/.bin/truffle-flattener contracts/price-providers/V2TokenCollateralTecPriceProviderFallback.sol > scripts/contract_flatten/V2TokenCollateralTecPriceProviderFallback.sol
node_modules/.bin/truffle-flattener contracts/price-providers/V2TokenCollateralPeggedPriceProviderFallback.sol > scripts/contract_flatten/V2TokenCollateralPeggedPriceProviderFallback.sol
node_modules/.bin/truffle-flattener contracts/changers/PriceProviderChanger.sol > scripts/contract_flatten/PriceProviderChanger.sol
echo "Finish successfully! Take a look in folder scripts/contract_flatten/..."