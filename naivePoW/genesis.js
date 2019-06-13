/*
* Deploy contract on Ropsten testnet.
* Relay Private blockchain whose consensus is naïve PoW.
*/

"use strict";
const fs = require("fs");
const rlp = require('rlp');
const EthereumBlock = require('ethereumjs-block/from-rpc');
const Web3 = require("web3"); // npm install web3@0.19

const web3 = new Web3();
// See https://github.com/twodude/eth-proof-sol/issues/2
const provider = "http://localhost:8222" // private
web3.setProvider(new web3.providers.HttpProvider(provider));

function readConfig(jsonFileLoca) {
    const configFile = fs.readFileSync(jsonFileLoca);
    const config = JSON.parse(configFile);
    return config;
}

// main
// TODO: Get blockNumber from cli arguments.
getBlock(125).then(function(data) {
    var config = readConfig("naivePoW/config.json");

    var GENESIS = new Object();
    GENESIS.blockHash           = data[0];
    GENESIS.UncleBlockHashes    = data[1];
    GENESIS.rlpHeader           = data[2];
    config.genesisBlock = GENESIS;

    fs.writeFileSync("naivePoW/config.json", JSON.stringify(config, null, 2));  
});

async function getBlock(num) {
    try {
        var block = await web3.eth.getBlock(num);
        if (block === null) {
            return await getBlock(num);
        }
        var rlped = '0x' + rlp.encode(getRawHeader(block)).toString('hex');
        var methodData = [block['hash'], block['uncles'], rlped];
        return methodData;
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
}
