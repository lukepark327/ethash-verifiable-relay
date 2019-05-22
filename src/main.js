"use strict";
let fs = require("fs");
let Web3 = require('web3'); // npm install web3@0.19

// Create a web3 connection to a running geth node over JSON-RPC running at ~
let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8222'));

// const PRIVATE_KEY = "75F8343E57BD410673A4A770C25EA7651CB8CD6BC3068DDF915945BDA320A134";
// let privateKey = new Buffer(PRIVATE_KEY, 'hex')
function unlockAccount(address, password) {
  // Unlock the coinbase account to make transactions out of it
  console.log("> Unlocking coinbase account");
  try {
    web3.personal.unlockAccount(address, password);
  } catch (e) {
    console.log(e);
    return;
  }
}

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
    console.log(block);
    console.log("> RlpEncoding:" + rlped);
    console.log("> Keccak256  :" + utils.keccak256(rlped));

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

relay(459);
