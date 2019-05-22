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

function getABIandCode(jsonFileLoca, jsonFileName, solidityName, contractName) {
  // Read the compiled contract code
  // Compile with
  // build/solc/solc realEthash.sol --combined-json abi,asm,ast,bin,bin-runtime,devdoc,interface,opcodes,srcmap,srcmap-runtime,userdoc > contracts.json
  let source = fs.readFileSync(jsonFileLoca);
  let contracts = JSON.parse(source)[jsonFileName];

  const key = solidityName + ':' + contractName;

  let abi = JSON.parse(contracts[key].abi); // ABI description as JSON structure
  let code = '0x' + contracts[key].bin; // Smart contract EVM bytecode as hex

  return {
    abi: abi,
    code: code
  };
}

// main
const ADDRESS = "0x6282ad5f86c03726722ec397844d2f87ced3af89";

unlockAccount(
  ADDRESS,
  "12341234" // password
);

var contractInfos = getABIandCode(
  "./solexam/contracts.json", // jsonFileLoca
  "contracts", // jsonFileName
  "realEthash.sol", // solidityName
  "realEthash" // contractName
);

var abi = contractInfos.abi;
var code = contractInfos.code;

// Create Contract proxy class
var MyContract = web3.eth.contract(abi);

var myContractReturned = MyContract.new({
  from: ADDRESS,
  gas: 1000000,
  data: code
}, function (err, myContract) {
  if (!err) {
    if (!myContract.address) {
      console.log("> Tx Hash: " + myContract.transactionHash); // The hash of the transaction, which deploys the contract
    } else {
      console.log("> CA Addr: " + myContract.address); // the contract address

      console.log(myContract.getEthash());
    }
  }
});
