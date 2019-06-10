# sh naivePoW/deps.sh
cd naivePoW/contracts
solc --combined-json abi,bin RelayNaivePoW.sol > RelayNaivePoW.json
cd ../..
