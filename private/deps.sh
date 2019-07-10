# sh ethash/deps.sh
cd private/contracts
solc --combined-json abi,bin RelayEthash.sol > RelayEthash.json
cd ../..
