pragma solidity ^0.5.0;

import "./utils/RLPReader.sol";
import "./utils/MerklePatriciaProof.sol";

contract Relay {
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;
    
    struct BlockHeader {
        bytes32   prevBlockHash; // 0
        bytes32   stateRoot;     // 3
        bytes32   txRoot;        // 4
        bytes32   receiptRoot;   // 5
        // blockNumber // 8
    }
  
    mapping (bytes32 => BlockHeader) public blocks;

    function submitBlock(
        bytes32 blockHash,
        bytes memory rlpHeader
    ) public {
        BlockHeader memory header = parseBlockHeader(rlpHeader);

        blocks[blockHash] = header;
    }

    // parse block header
    function parseBlockHeader(bytes memory rlpHeader) internal pure returns (BlockHeader memory) {
        RLPReader.RLPItem[] memory ls = rlpHeader.toRlpItem().toList(); // must convert to an rlpItem first!

        BlockHeader memory header;
        header.prevBlockHash = bytes32(ls[0].toUint());
        header.stateRoot = bytes32(ls[3].toUint());
        header.txRoot = bytes32(ls[4].toUint());
        header.receiptRoot = bytes32(ls[5].toUint());
        return header;
    }

    function getStateRoot(bytes32 blockHash) public view returns (bytes32) {
        return blocks[blockHash].stateRoot;
    }

    function getTxRoot(bytes32 blockHash) public view returns (bytes32) {
        return blocks[blockHash].txRoot;
    }

    function getReceiptRoot(bytes32 blockHash) public view returns (bytes32) {
        return blocks[blockHash].receiptRoot;
    }

    function checkTxProof(
        bytes memory value,
        bytes32 blockHash,
        bytes memory path,
        bytes memory parentNodes
    ) public view returns (bool) {
        bytes32 txRoot = blocks[blockHash].txRoot;
        return trieValue(value, path, parentNodes, txRoot);
    }

    function checkStateProof(
        bytes memory value,
        bytes32 blockHash,
        bytes memory path,
        bytes memory parentNodes
    ) public view returns (bool) {
        bytes32 stateRoot = blocks[blockHash].stateRoot;
        return trieValue(value, path, parentNodes, stateRoot);
    }
    
    function checkReceiptProof(
        bytes memory value,
        bytes32 blockHash,
        bytes memory path,
        bytes memory parentNodes
    ) public view returns (bool) {
        bytes32 receiptRoot = blocks[blockHash].receiptRoot;
        return trieValue(value, path, parentNodes, receiptRoot);
    }
    
    function trieValue(
        bytes memory value,
        bytes memory encodedPath,
        bytes memory parentNodes,
        bytes32 root
    ) internal pure returns (bool) {
        return MerklePatriciaProof.verify(value, encodedPath, parentNodes, root);
    }
}
