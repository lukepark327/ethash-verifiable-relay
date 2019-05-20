# Install

```bash
npm install web3@0.19
```

# How to Use

## Start Geth
```bash
> build/bin/geth --datadir ./mydata/ --networkid 950327 --rpc --rpccorsdomain="*" --rpcapi="db,eth,net,web3,personal,web3" --nodiscover console
```

## Make JSON File
```bash
> cd solexam
> ~/Desktop/solidity-breakdown/solidity/build/solc/solc realEthash.sol --combined-json abi,asm,ast,bin,bin-runtime,devdoc,interface,opcodes,srcmap,srcmap-runtime,userdoc > contracts.json
```

## Start Web3.js
```
> npm start
Unlocking coinbase account
Deploying the contract
Transaction Hash: "0x688b1d646f81d0b545bc72eadde1cd2a52e302be965fe73c4f5320b206d2c546"
Waiting a mined block to include your contract... currently in block 103
Waiting a mined block to include your contract... currently in block 103
Waiting a mined block to include your contract... currently in block 103
Contract Address: "0xc9f9ff0967c18c4912f1d26436dd4c0e8f335533"
```
You should start mining in geth console right after deploying the contract.

## Get Results
```bash
> eth.getStorageAt("0xc9f9ff0967c18c4912f1d26436dd4c0e8f335533", 5)
"0x0000000000000000000000000000000000000000000000000000000000000001"
```

## References
[1] https://github.com/ethereum/wiki/wiki/JavaScript-API   
[2] https://ethereum.stackexchange.com/questions/7255/deploy-contract-from-nodejs-using-web3   
