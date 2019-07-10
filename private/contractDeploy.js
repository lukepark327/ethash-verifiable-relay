/*
* Deploy contract on Private network.
* Relay testnet blockchain whose consensus is Ethash.
*/

"use strict";
const fs = require("fs");
const Web3 = require("web3"); // npm install web3@0.19

const web3 = new Web3();
// See https://github.com/twodude/eth-proof-sol/issues/2
const provider = "http://147.46.116.57:8002" // private
web3.setProvider(new web3.providers.HttpProvider(provider));

// personal.unlockAccount(eth.accounts[0], "12341234");
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
    const source = fs.readFileSync(jsonFileLoca);
    const contracts = JSON.parse(source)["contracts"];

    const key = solidityName + ':' + contractName;

    const abi = JSON.parse(contracts[key].abi); // ABI description as JSON structure
    const code = '0x' + contracts[key].bin;     // Smart contract EVM bytecode as hex

    return {
        abi: abi,
        code: code
    };
}

async function asyncDeploy(abi, code, ADDRESS, parameters) {
    var myContract = await deploy(abi, code, ADDRESS, parameters);
    return myContract;
}

function deploy(abi, code, ADDRESS, parameters) {
    return new Promise(function (resolve, reject) {
        var MyContract = web3.eth.contract(abi);

        // Gas estimate
        var contractData = MyContract.new.getData(
            parameters[0],
            parameters[1],
            parameters[2],
            {
                data: code
            }
        );
        var estimate = web3.eth.estimateGas({ data: contractData });
        console.log("   > Estimate Gas: " + estimate);

        MyContract.new(
            parameters[0],
            parameters[1],
            parameters[2],
            {
                from: ADDRESS,
                gas: estimate,
                data: code
            },
            function (err, myContract) {
                if (!err) {
                    if (!myContract.address) {
                        console.log("   > Tx Hash: " + myContract.transactionHash); // The hash of the transaction, which deploys the contract
                    } else {
                        // console.log("> CA Addr: " + myContract.address); // the contract address
                        resolve(myContract);
                    }
                }
            }
        );
    })
}

function readConfig(jsonFileLoca) {
    const configFile = fs.readFileSync(jsonFileLoca);
    const config = JSON.parse(configFile);
    return config;
}

// main
var     config          = readConfig("private/config.json");
const   OWNER           = config.owner;
const   GENESISBLOCK    = config.genesisBlock;

console.log("> Unlocking an account");
unlockAccount(OWNER.address, OWNER.password);

// console.log("> Get contracts info");
// sh private/deps.sh
const contractInfos = getABIandCode(
    "private/contracts/RelayEthash.json",    // jsonFileLoca
    "RelayEthash.sol",                        // solidityName
    "RelayEthash"                             // contractName
);
const abi   = contractInfos.abi;
const code  = contractInfos.code;

console.log("> Deploy contracts ...");
var parameters = [
    GENESISBLOCK.blockHash,
    GENESISBLOCK.UncleBlockHashes,
    GENESISBLOCK.rlpHeader
];
asyncDeploy(abi, code, OWNER.address, parameters).then(function (myContract) {
    // console.log("   > Tx Hash: " + myContract.transactionHash);    // The hash of the transaction, which deploys the contract
    console.log("   > CA Addr: " + myContract.address);            // the contract address

    // test
    // console.log(myContract.genesisBlockHash());

    var CONTRACT = new Object();
    CONTRACT.transaction    = myContract.transactionHash;
    CONTRACT.address        = myContract.address;
    config.contract = CONTRACT;

    // console.log(config);
    // Write file
    fs.writeFileSync("private/config.json", JSON.stringify(config, null, 2));  
});
