# sh ethash/deps.sh
cd ethash/contracts
solc --combined-json abi,bin RelayEthash.sol > RelayEthash.json
cd ../..
