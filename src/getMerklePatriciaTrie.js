"use strict";
const rlp = require('rlp');
const Trie = require('merkle-patricia-tree');
const async = require('async');
const EthereumTx = require('ethereumjs-tx');
const EthereumBlock = require('ethereumjs-block/from-rpc')

let Web3 = require('web3'); // npm install web3@0.19
let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8222'));

const { GetAndVerify, GetProof, VerifyProof } = require('eth-proof');
let getProof = new GetProof("http://localhost:8222");

// const { Account, Header, Log, Proof, Receipt, Transaction } = require('eth-object')
const { keccak, encode, decode, toBuffer, toWord } = require('eth-util-lite')

async function getTxProofInfo(num, untrustedTxHash) {
  try {
    console.log("About to merkle proof " + num);
    var block = await web3.eth.getBlock(num);
    if (block === null) {
      return await merkleProof(num);
    }

    getProof.transactionProof(untrustedTxHash).then((res) => {
      var txIndex = res.txIndex;
      var txProof = res.txProof;
      // console.log(res.header);

      console.log(txIndex);
      console.log(txProof.hex);
    })

  } catch (e) {
    console.error(e);
  }
}

// main
getTransactionProof(
  "0x25d62673c0be981a8a0b88ea78f157510324b68085303af97740374de54e65a8"
).then((res) => {
  let txProof = web3ify(res);
  console.log(txProof);
})
/*
  transactions: [
    "0x23e426641c12756a83234e4bddaeb175d0806984032dbfc2c53168c7bddb7c90",
    "0x1f4dab013092bec50ddbef04257f88ef2bc328ffc918674985fea5fbd3d5ca24",
    "0x25d62673c0be981a8a0b88ea78f157510324b68085303af97740374de54e65a8",
    "0x6a07f24bf96aef676dbb40c011c992d6b66584b17483a689a7bd4c4a6645dcff"],
  transactionsRoot: "0x25101f9cbcaa227bfb7d23fa7ffd10ef0a3d2f2a9bd22d4db39eaf16b0ff94d5",
*/

// getTransactionProof
/**
 * Get blockHash, header, parentNodes, path, and value of Tx.
 * @method getTransactionProof
 * @param {String} txHash
 * @private
 */
function getTransactionProof(txHash) {
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
