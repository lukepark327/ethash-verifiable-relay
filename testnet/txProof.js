/*
* Deploy contract on Ropsten testnet.
* Relay Private blockchain whose consensus is naïve PoW.
*/

"use strict";
const Trie = require('merkle-patricia-tree');
const EthereumTx = require('ethereumjs-tx');
const fs = require("fs");
const rlp = require('rlp');
const async = require('async');
const EthereumBlock = require('ethereumjs-block/from-rpc');
const Web3 = require("web3"); // npm install web3@0.19

// See https://github.com/twodude/eth-proof-sol/issues/2
// build/bin/geth console --datadir ./mydata/ --networkid 950327 --port 32222 --rpc --rpcport "8002" --rpcaddr "0.0.0.0" --rpccorsdomain "*" --rpcapi db,eth,net,web3,personal --nodiscover
const to = new Web3();
const provider_testnet = "http://localhost:8003" // testnet
to.setProvider(new to.providers.HttpProvider(provider_testnet));

// build/bin/geth console --testnet --port 33333 --rpc --rpcport "8003" --rpcaddr "0.0.0.0" --rpccorsdomain "*" --rpcapi db,eth,net,web3,personal --allow-insecure-unlock
const from = new Web3();
const provider_private = "http://localhost:8002" // private
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
const config = readConfig("testnet/config.json");
const OWNER = config.owner;
const CONTRACT = config.contract;

// console.log("> Get contracts info");
const contractInfos = getABIandCode(
    "testnet/contracts/RelayNaivePoW.json",    // jsonFileLoca
    "RelayNaivePoW.sol",                        // solidityName
    "RelayNaivePoW"                             // contractName
);
const abi = contractInfos.abi;
// const code = contractInfos.code;

var MyContract = to.eth.contract(abi);
var myContract = MyContract.at(CONTRACT.address);

console.log("> Unlocking an account");
unlockAccount(to, OWNER.address, OWNER.password);

// 3rd Tx in block(719)
// "0x8b68b49ea234880ea061803aae2322ba3ac57a2ae8a5feac4e13a4b3f67622f1"
let targetTx = process.argv[2];

getTransactionProof(
    from,
    targetTx
  ).then((res) => {
    let data = web3ify(res);
    // console.log(data);

    txProof(data).then((res) => {
        console.log("> CheckTxProof: " + res);
    });
    
    async function txProof(data) {
        try {
            // checkTxProof
            let res = await checkTxProof(data);
            return res;
        } catch (e) {
            console.error(e);
        }
        
        async function checkTxProof(data) {
            let res = await myContract.checkTxProof(
                data["value"], data["blockHash"], data["path"], data["parentNodes"],
                {
                    from: OWNER.address
                    // gas: 21000
                }
            )
            return res;
        }
    }
  })
  
  // getTransactionProof
  /**
   * Get blockHash, header, parentNodes, path, and value of Tx.
   * @method getTransactionProof
   * @param {String} txHash
   * @private
   */
  function getTransactionProof(web3, txHash) {
    return new Promise((accept, reject) => {
      try {
        web3.eth.getTransaction(txHash, function (e, transaction) {
          if (e || !transaction) { return reject(e || "transaction not found") }
          web3.eth.getBlock(transaction.blockHash, true, function (e, block) {
            if (e || !block) { return reject(e || "block not found") }
            var txTrie = new Trie();
            var b = block;
            async.map(block.transactions, function (siblingTx, cb2) {//need siblings to rebuild trie
              var path = rlp.encode(siblingTx.transactionIndex)
              var rawSignedSiblingTx = new EthereumTx(squanchTx(siblingTx)).serialize()
              txTrie.put(path, rawSignedSiblingTx, function (error) {
                if (error != null) { cb2(error, null); } else { cb2(null, true) }
              })
            }, function (e, r) {
              txTrie.findPath(rlp.encode(transaction.transactionIndex), function (e, rawTxNode, remainder, stack) {
                var prf = {
                  blockHash: Buffer.from(transaction.blockHash.slice(2), 'hex'),
                  header: getRawHeader(block),
                  parentNodes: rawStack(stack),
                  path: rlp.encode(transaction.transactionIndex),
                  value: rlp.decode(rawTxNode.value)
                }
                return accept(prf)
              })
            });
          })
        })
      } catch (e) { return reject(e) }
    })
  }
  
  var squanchTx = (tx) => {
    tx.gasPrice = '0x' + tx.gasPrice.toString(16)
    tx.value = '0x' + tx.value.toString(16)
    return tx;
  }
  
  var getRawHeader = (_block) => {
    if (typeof _block.difficulty != 'string') {
      _block.difficulty = '0x' + _block.difficulty.toString(16)
    }
    var block = new EthereumBlock(_block)
    return block.header.raw
  }
  
  var rawStack = (input) => {
    var output = []
    for (var i = 0; i < input.length; i++) {
      output.push(input[i].raw)
    }
    return output
  }
  
  function web3ify(input) {
    var output = {}
    output.value = '0x' + rlp.encode(input.value).toString('hex')
    output.header = '0x' + rlp.encode(input.header).toString('hex')
    output.path = '0x00' + input.path.toString('hex')
    //output.path = (output.path.length%2==0 ? '0x00' : '0x1') + output.path
    output.parentNodes = '0x' + rlp.encode(input.parentNodes).toString('hex')
    output.txRoot = '0x' + input.header[4].toString('hex')
    output.blockHash = '0x' + input.blockHash.toString('hex')
    return output
  }
  
  // Nibble
  /**
   * Converts a string OR a buffer to a nibble array.
   * @method stringToNibbles
   * @param {Buffer| String} key
   * @private
   */
  function stringToNibbles(key) {
    const bkey = new Buffer(key)
    let nibbles = []
  
    for (let i = 0; i < bkey.length; i++) {
      let q = i * 2
      nibbles[q] = bkey[i] >> 4
      ++q
      nibbles[q] = bkey[i] % 16
    }
  
    return nibbles
  }
  
  /**
   * Converts a nibble array into a buffer.
   * @method nibblesToBuffer
   * @param {Array} Nibble array
   * @private
   */
  function nibblesToBuffer(arr) {
    let buf = new Buffer(arr.length / 2)
    for (let i = 0; i < buf.length; i++) {
      let q = i * 2
      buf[i] = (arr[q] << 4) + arr[++q]
    }
    return buf
  }
  
  /**
   * Returns the number of in order matching nibbles of two give nibble arrays.
   * @method matchingNibbleLength
   * @param {Array} nib1
   * @param {Array} nib2
   * @private
   */
  function matchingNibbleLength(nib1, nib2) {
    let i = 0
    while (nib1[i] === nib2[i] && nib1.length > i) {
      i++
    }
    return i
  }
  
  /**
   * Compare two nibble array keys.
   * @param {Array} keyA
   * @param {Array} keyB
   */
  function doKeysMatch(keyA, keyB) {
    const length = matchingNibbleLength(keyA, keyB)
    return length === keyA.length && length === keyB.length
  }
  