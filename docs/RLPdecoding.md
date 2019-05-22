# Remix

Use http://remix.ethereum.org
* `https` can cause some errors on Web3 Provider environment.

# RLP Decoding

Decode this:

```
0xf90212a091f4d2e1ad41ae515a3ef9f8d9bd7b080c410eb299138211b547c39dfca87ba3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347946282ad5f86c03726722ec397844d2f87ced3af89a096b9729f3019304f2c1f3f74ef4fe2f3f28f126dd60d27598f8a1f59d9b74fcba056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000830211ac8201cb8347e7c480845ce4f16b99d88301080c846765746887676f312e392e378664617277696ea00000000000000000000000000000000000000000000000000000000000000000880000000000000000
```

which is RLP encoding about:

```Json
{
  difficulty: '0x211ac',
  extraData: '0xd88301080c846765746887676f312e392e378664617277696e',
  gasLimit: 4712388,
  gasUsed: 0,
  hash: '0x03600f15dbbe00d2165e5f21bad5d5a8cc1294c5a4d18a101bf4f112359b8c61',
  logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  miner: '0x6282ad5f86c03726722ec397844d2f87ced3af89',
  mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  nonce: '0x0000000000000000',
  number: 459,
  parentHash: '0x91f4d2e1ad41ae515a3ef9f8d9bd7b080c410eb299138211b547c39dfca87ba3',
  receiptsRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
  sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
  size: 538,
  stateRoot: '0x96b9729f3019304f2c1f3f74ef4fe2f3f28f126dd60d27598f8a1f59d9b74fcb',
  timestamp: 1558507883,
  totalDifficulty: BigNumber { s: 1, e: 7, c: [ 61473347 ] },
  transactions: [],
  transactionsRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
  uncles: []
}
```

## Contracts for decoding

Thanks to https://github.com/hamdiallam/Solidity-RLP

### List Elements

Call `someFunctionThatTakesAnEncodedItem` in `SomeContract`:

```solidity
pragma solidity ^0.5.0;

import "./RLPReader.sol";

contract SomeContract {
    bytes32 prevHash;
    
    // optional way to attach library functions to these data types.
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    // lets assume that rlpBytes is an encoding of [[1, "nested"], 2, 0x<Address>]
    function someFunctionThatTakesAnEncodedItem(bytes memory rlpBytes)
    public {
        RLPReader.RLPItem[] memory ls = rlpBytes.toRlpItem().toList(); // must convert to an rlpItem first!

        prevHash = bytes32(ls[0].toUint()); // prevHash
    }
    
    function get()
    public view
    returns(bytes32) {
        return prevHash;
    }
}
```

with the above RLP encoded string.

* ls[0] is parentHash