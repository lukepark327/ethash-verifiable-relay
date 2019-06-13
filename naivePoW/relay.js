/*
* Deploy contract on Ropsten testnet.
* Relay Private blockchain whose consensus is naïve PoW.
*/

"use strict";
const fs = require("fs");
const rlp = require('rlp');
const EthereumBlock = require('ethereumjs-block/from-rpc');
const Web3 = require("web3"); // npm install web3@0.19

// See https://github.com/twodude/eth-proof-sol/issues/2
// TODO: Get HttpProvider info from cli arguments.
const to = new Web3();
const provider_testnet = "http://localhost:8333" // testnet
to.setProvider(new to.providers.HttpProvider(provider_testnet));

const from = new Web3();
const provider_private = "http://localhost:8222" // private
from.setProvider(new from.providers.HttpProvider(provider_private));

function unlockAccount(web3, address, password) {
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
    const code = '0x' + contracts[key].bin; // Smart contract EVM bytecode as hex

    return {
        abi: abi,
        code: code
    };
}

function readConfig(jsonFileLoca) {
    const configFile = fs.readFileSync(jsonFileLoca);
    const config = JSON.parse(configFile);
    return config;
}

// main
const config = readConfig("naivePoW/config.json");
const OWNER = config.owner;
const CONTRACT = config.contract;

// console.log("> Get contracts info");
const contractInfos = getABIandCode(
    "naivePoW/contracts/RelayNaivePoW.json",    // jsonFileLoca
    "RelayNaivePoW.sol",                        // solidityName
    "RelayNaivePoW"                             // contractName
);
const abi = contractInfos.abi;
// const code = contractInfos.code;

var MyContract = to.eth.contract(abi);
var myContract = MyContract.at(CONTRACT.address);

catchUp();

async function catchUp() {
    myContract.getHighestBlockNumber(function (err, relayedBlockNumber) {
        from.eth.getBlockNumber(function (err, currentBlockNumber) {
            relayedBlockNumber = parseInt(relayedBlockNumber);
            currentBlockNumber = parseInt(currentBlockNumber);
            console.log("> (relayed / current): " + relayedBlockNumber + " / " + currentBlockNumber);

            console.log("   > Unlocking an account");
            unlockAccount(to, OWNER.address, OWNER.password);

            // TODO: Why (relayedBlockNumber < currentBlockNumber - 1)?
            // TODO: Consider confirmation time
            if (relayedBlockNumber < currentBlockNumber - 1) {
                let targetBlockNumber = relayedBlockNumber + 1;
                console.log("   > Relay No." + targetBlockNumber);
                relay(targetBlockNumber).then(function (txHash) {
                    console.log("   > Tx Hash: " + txHash);
                    waitPending(txHash).then(async function (getTx) {
                        // console.log("       > blockHash: " + getTx.blockHash);
                        return await catchUp();
                    });
                });
            }
            else {
                console.log("   > Caught up to 2nd most current block")
                setTimeout(async function() { await catchUp() }, (10000));
            }
        });
    });
}

async function waitPending(txHash) {
    var res = await to.eth.getTransaction(txHash);
    if (res.blockNumber === null) {
        return await waitPending(txHash);
    }
    return res;
}

async function relay(num) {
    try {
        // console.log("> Relay No." + num);
        var block = await from.eth.getBlock(num);
        if (block === null) {
            return await relay(num);
        }
        var rlped = '0x' + rlp.encode(getRawHeader(block)).toString('hex');
        var methodData = await myContract.submitBlock.getData(
            block['hash'],
            block['uncles'],
            rlped
        );

        // Gas estimate
        var estimate = await to.eth.estimateGas({
            to: CONTRACT.address,
            data: methodData
        });
        console.log("   > Estimate Gas: " + estimate);

        // submitBlock
        let hash = await submitBlock([block['hash'], block['uncles'], rlped], estimate);
        return hash;
    } catch (e) {
        console.error(e);
    }

    function getRawHeader(_block) {
        if (typeof _block.difficulty != 'string') {
            _block.difficulty = '0x' + _block.difficulty.toString(16)
        }
        var block = new EthereumBlock(_block)
        return block.header.raw
    }

    async function submitBlock(data, gas) {
        let hash = await myContract.submitBlock(
            data[0], data[1], data[2],
            {
                from: OWNER.address,
                gas: gas
            }
        )
        return hash;
    }
}
