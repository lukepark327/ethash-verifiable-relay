# sh naivePoW/deps.sh
cd testnet/contracts
solc --combined-json abi,bin RelayNaivePoW.sol > RelayNaivePoW.json
cd ../..
