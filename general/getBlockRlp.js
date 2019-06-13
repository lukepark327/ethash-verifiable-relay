"use strict";
let Web3 = require('web3'); // npm install web3@0.19

// Create a web3 connection to a running geth node over JSON-RPC running at ~
let web3 = new Web3();
// build/bin/geth --datadir ./mydata/ --networkid 950327 --port 32222 --rpc --rpccorsdomain="*" --rpcport 8222 --rpcapi="db,eth,net,web3,personal" --nodiscover console
const provider = 'http://localhost:8222'
// const provider = 'https://ropsten.infura.io'
web3.setProvider(new web3.providers.HttpProvider(provider));

// Get Block Hash
// Calculate RLP Encoding
// Calculate Keccak256
const rlp = require('rlp');
const EthereumBlock = require('ethereumjs-block/from-rpc');
const utils = require('web3-utils');

async function relay(num) {
  try {
    console.log("About to relay " + num);
    var block = await web3.eth.getBlock(num);
    if (block === null) {
      return await relay(num);
    }

    var rlped = '0x' + rlp.encode(getRawHeader(block)).toString('hex');
    var BN = utils.BN;

    // console.log("> BN         :" + new BN(block.hash).toString());
    // console.log("> BlockHash  :" + block.hash.toString());
    // console.log("> PrevHash   :" + block.parentHash.toString());
    // console.log(block);
    console.log("> Block Hash : \"" + block['hash'] + "\"");
    console.log("> RlpEncoding: \"" + rlped + "\"");
    console.log("> UncleHashes: \"" + block['uncles'] + "\"");
    console.log();
    // console.log("> Keccak256  :" + utils.keccak256(rlped));

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

// relay(5700446); // one uncles in testnet
// relay(1233456); // two uncles in testnet
// relay(100);
// relay(101);
// relay(102);
// relay(103);
// relay(104);
relay(117);
