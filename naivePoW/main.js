/*
* Deploy contract on Ropsten testnet.
* Relay Private blockchain whose consensus is naïve PoW.
*/
// npm run-script naivePoW

"use strict";
let fs = require("fs");
let Web3 = require("web3"); // npm install web3@0.19

let web3 = new Web3();
const provider = "http://147.46.116.57:8545" // testnet 
web3.setProvider(new web3.providers.HttpProvider(provider));

function unlockAccount(address, password) {
    // Unlock the coinbase account to make transactions out of it
    // console.log("> Unlocking coinbase account");
    try {
        web3.personal.unlockAccount(address, password);
    } catch (e) {
        console.log(e);
        return;
    }
}

function getABIandCode(jsonFileLoca, solidityName, contractName) {
    // Read the compiled contract code
    let source = fs.readFileSync(jsonFileLoca);
    let contracts = JSON.parse(source)["contracts"];

    const key = solidityName + ':' + contractName;

    let abi = JSON.parse(contracts[key].abi); // ABI description as JSON structure
    let code = '0x' + contracts[key].bin; // Smart contract EVM bytecode as hex

    return {
        abi: abi,
        code: code
    };
}

async function asyncDeploy(abi, code, ADDRESS) {
    var myContract = await deploy(abi, code, ADDRESS);
    return myContract;
}

function deploy(abi, code, ADDRESS) {
    return new Promise(function (resolve, reject) {
        var MyContract = web3.eth.contract(abi);
        
        // Gas estimate
        var contractData = MyContract.new.getData(
            "0x4bfe008076593e87e8f1a42fecfc05b6c2e21ae394fe35f329b5486b2dd08a4a",
            [],
            "0xf90212a0dc7c2436884290fced0a006c73492a4f3d1271c21070ea17dc90d38acfca5eb4a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347946282ad5f86c03726722ec397844d2f87ced3af89a082ae2ee2cb2c534f51a07d8bf7288483a9c5ee008c3c91292a8d8e3b2f4ce544a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000840131d8b58196835c410080845cfa116099d88301080c846765746887676f312e392e378664617277696ea059b7bb5af58184186f8acd7cd93c45ce7d160565c2d3a6483e544987f4d5d4f3886108f0e061767545",
            {
                data: code
            }
        );
        var estimate = web3.eth.estimateGas({ data: contractData });
        // console.log("> Estimate Gas: " + estimate);

        MyContract.new(
            "0x4bfe008076593e87e8f1a42fecfc05b6c2e21ae394fe35f329b5486b2dd08a4a",
            [],
            "0xf90212a0dc7c2436884290fced0a006c73492a4f3d1271c21070ea17dc90d38acfca5eb4a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347946282ad5f86c03726722ec397844d2f87ced3af89a082ae2ee2cb2c534f51a07d8bf7288483a9c5ee008c3c91292a8d8e3b2f4ce544a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000840131d8b58196835c410080845cfa116099d88301080c846765746887676f312e392e378664617277696ea059b7bb5af58184186f8acd7cd93c45ce7d160565c2d3a6483e544987f4d5d4f3886108f0e061767545",
            {
                from: ADDRESS,
                gas: estimate,
                data: code
            },
            function (err, myContract) {
                if (!err) {
                    if (!myContract.address) {
                        // console.log("> Tx Hash: " + myContract.transactionHash); // The hash of the transaction, which deploys the contract
                    } else {
                        // console.log("> CA Addr: " + myContract.address); // the contract address
                        resolve(myContract);
                    }
                }
            }
        );
    })
}

// main
const ADDRESS = "0x4e54a5df2b1431f33de5e34a7ef6a1e59a9b4934";

console.log("> Unlocking an account");
unlockAccount(
    ADDRESS,
    "12341234" // password
);

console.log("> Get contracts info");
// cd naivePoW/contracts
// solc --combined-json abi,bin RelayNaivePoW.sol > RelayNaivePoW.json
// cd ../..
// /* or */
// sh naivePoW/deps.sh
var contractInfos = getABIandCode(
    "naivePoW/contracts/RelayNaivePoW.json",  // jsonFileLoca
    "RelayNaivePoW.sol",                        // solidityName
    "RelayNaivePoW"                             // contractName
);
var abi = contractInfos.abi;
var code = contractInfos.code;

console.log("> Deploy contracts");
asyncDeploy(abi, code, ADDRESS).then(function(myContract){
    console.log("> Tx Hash: " + myContract.transactionHash);    // The hash of the transaction, which deploys the contract
    console.log("> CA Addr: " + myContract.address);            // the contract address
    
    // test
    console.log(myContract.genesisBlockHash());
});
