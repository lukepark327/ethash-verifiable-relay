pragma solidity ^0.5.0;

import "./RLPReader.sol";
import "./MerklePatriciaProof.sol";

contract RelayEthash {
    /*
    * Verify private chain's block headers.
    */

    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    struct BlockHeader {
        bytes32     parentHash;     // 0
        bytes32     uncleHash;      // 1
        // bytes32  coinbase;       // 2
        // bytes32  stateRoot;      // 3
        bytes32     txRoot;         // 4
        // bytes32  receiptRoot;    // 5
        // bytes    bloom;          // 6
        uint        difficulty;     // 7
        uint        blockNumber;    // 8
        // uint64   gasLimit;       // 9
        // uint64   gasUsed;        // 10
        uint        time;           // 11
        // bytes    extra;          // 12
        bytes32     mixDigest;      // 13
        uint        nonce;          // 14
    }

    mapping (bytes32 => BlockHeader) public blocks;
    mapping (bytes32 => bytes32[]) internal uncles;

    // bytes32 public genesisBlockHash;
    uint genesisBlockNumber;
    uint highestBlockNumber;

    function getGenesisBlockNumber() public view returns (uint) {
        return genesisBlockNumber;
    }

    function getHighestBlockNumber() public view returns (uint) {
        return highestBlockNumber;
    }

    // TODO: ownership
    constructor(
        bytes32             blockHash,
        bytes32[] memory    uncleBlockHashes,
        bytes memory        rlpHeader) public {
        /*
        * Set a genesis block header.
        */

        BlockHeader memory header;
        bytes32 hashNoNonce;
        (header, hashNoNonce) = parseBlockHeader(rlpHeader);

        blocks[blockHash] = header;
        if (uncleBlockHashes.length != 0) {
            uncles[header.uncleHash] = uncleBlockHashes;
        }

        // genesisBlockHash = blockHash;
        genesisBlockNumber = header.blockNumber;
        highestBlockNumber = genesisBlockNumber;
    }

    function submitBlock(
        bytes32             blockHash,
        // bytes32             blockHashNoNonce,
        bytes32[] memory    uncleBlockHashes,
        bytes memory        rlpHeader) public {
        /*
        * Submit block headers.
        */

        // Verify BlockHash with RLP encoded data
        assert(blockHash == keccak256(rlpHeader));

        BlockHeader memory header;
        bytes32 hashNoNonce;
        (header, hashNoNonce) = parseBlockHeader(rlpHeader);

        if (uncleBlockHashes.length != 0) {
            // TODO: validation test of uncles
            // Require all uncles block header info.
            // Require hash validation check.
            // assert();
            uncles[header.uncleHash] = uncleBlockHashes;
        }

        // Call VerifyHeader
        assert(VerifyHeader(blockHash, header, true, hashNoNonce));

        // Set highestBlockNumber
        blocks[blockHash] = header;
        if (highestBlockNumber < header.blockNumber) {
            highestBlockNumber = header.blockNumber;
        }
    }

    // parse block header
    function parseBlockHeader(
        bytes memory rlpHeader) internal pure
        returns (BlockHeader memory, bytes32) {
        /*
        * rlpParser
        */

        // must convert to an rlpItem first!
        RLPReader.RLPItem[] memory ls = rlpHeader.toRlpItem().toList();

        BlockHeader memory header;
        header.parentHash   = ls[0].toBytes32();
        header.uncleHash    = ls[1].toBytes32();
        // header.coinbase     = ls[2].toBytes32();
        // header.stateRoot    = ls[3].toBytes32();
        header.txRoot       = ls[4].toBytes32();
        // header.bloom        = ls[6].toBytes();
        header.difficulty   = ls[7].toUint();
        header.blockNumber  = ls[8].toUint();
        // header.gasLimit     = uint64(ls[9].toUint());
        // header.gasUsed      = uint64(ls[10].toUint());
        header.time         = ls[11].toUint();
        // header.extra        = ls[12].toBytes();
        header.mixDigest    = ls[13].toBytes32();
        header.nonce        = ls[14].toUint();

        bytes32 hashNoNonce = HashNoNonce(ls);
        return (header, hashNoNonce);
    }

    function HashNoNonce(
        RLPReader.RLPItem[] memory ls
        ) internal pure
        returns (bytes32) {
        
        bytes memory rlpBytes;
        for (uint i = 0; i < ls.length - 2; i++) {
            // Except mixDigest, nonce
            rlpBytes = concatenate(rlpBytes, ls[i].toRlpBytes());
        }
        
        /*
        * Get prefix
        */
        uint rlpLen = rlpBytes.length; // Number of half-bytes
        uint prefix = 0xf7;
        
        uint tmp = rlpLen;
        uint tmp2 = 0;
        while (tmp > 0) {
            tmp /= 16;
            tmp2++;
        }
        prefix += (tmp2 + 1) / 2;
        
        bytes memory prefixHex = toHexString(prefix);
        bytes memory rlpLenHex = toHexString(rlpLen);
        return keccak256(concatenate(concatenate(prefixHex, rlpLenHex), rlpBytes));
    }
    
    function concatenate(
        bytes memory A,
        bytes memory B) internal pure
        returns (bytes memory) {
        /*
        * res = A + B
        */
        bytes memory res = new bytes(A.length + B.length);
        
        uint i;
        for (i = 0; i < A.length; i++) {
            res[i] = A[i];
        }
        
        for (uint j = 0; j < B.length; j++) {
            res[i + j] = B[j];
        }
        
        return res;
    }
    
    function toHexString(uint a) internal pure returns (bytes memory) {
        uint count = 0;
        uint b = a;
        while (b != 0) {
            count++;
            b /= 16;
        }
        count = (count + 1) / 2;
        bytes memory res = new bytes(count);
        for (uint i=0; i<count; ++i) {
            b = a % 256;
            res[count - i - 1] = byte(uint8(b));
            a /= 256;
        }
        return res;
    }

    function getUncleBlockHashes(
        bytes32 blockHash) public view returns (bytes32[] memory) {
        return uncles[blocks[blockHash].uncleHash];
    }

    function getTxRoot(bytes32 blockHash) public view returns (bytes32) {
        return blocks[blockHash].txRoot;
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

    function trieValue(
        bytes memory value,
        bytes memory encodedPath,
        bytes memory parentNodes,
        bytes32 root
    ) internal pure returns (bool) {
        return MerklePatriciaProof.verify(value, encodedPath, parentNodes, root);
    }

    // There are some values.
    uint    MaxBig256               = 2 ** 256 - 1;
    // uint allowedFutureBlockTime = 15 * 60;
    // uint maxUncles              = 2;
    int     big1                    = 1;
    int     big2                    = 2;
    int     big9                    = 9;
    bytes32 EmptyUncleHash          = 0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347; // rlpHash([]*Header(nil))
    int     bigMinus99              = -99;
    int     DifficultyBoundDivisor  = 2048;
    int     MinimumDifficulty       = 131072;
    uint    bombDelay               = 5000000;
    uint    bombDelayFromParent     = bombDelay - uint(big1);
    uint    expDiffPeriod           = 100000;

    function VerifyHeader(
        bytes32 blockHash,
        BlockHeader memory header,
        bool seal,
        bytes32 hashNoNonce) internal view
        returns (bool) {
        /*
        * Verify basic features of block header.
        */

        if (blocks[blockHash].parentHash != 0) {
            revert();
        }
        BlockHeader memory parent = blocks[header.parentHash];
        if (parent.parentHash == 0) {
            revert("consensus.ErrUnknownAncestor");
        }

        return verifyHeader(header, parent, false, seal, hashNoNonce);
    }

    function verifyHeader(
        BlockHeader memory header,
        BlockHeader memory parent,
        bool uncle,
        bool seal,
        bytes32 hashNoNonce) internal view
        returns (bool) {
        /*
        * Verify advanced features of block header.
        */

        // Ensure that the header's extra-data section is of a reasonable size
        // SKIP

        // Verify the header's timestamp
        if (uncle) {
            if (header.time > MaxBig256) {
                revert("errLargeBlockTime");
            }
        }
        else {
            // Skip consensus.ErrFutureBlock test
            // because relayer can upload past block header.
        }

        if (header.time <= parent.time) {
            revert("errZeroBlockTime");
        }

        // Verify the block's difficulty based in it's timestamp and parent's difficulty
        int expected = CalcDifficulty(header.time, parent);
        if (expected != int(header.difficulty)) {
            revert("invalid difficulty");
        }

        // Verify that the block number is parent's +1
        int diff = int(header.blockNumber - parent.blockNumber);
        if (diff != 1) {
            revert("consensus.ErrInvalidNumber");
        }

        if (seal) {
            if (!VerifySeal(header, hashNoNonce)) {
                revert();
            }
        }

        return true;
    }

    function CalcDifficulty(
        uint time,
        BlockHeader memory parent
        ) internal view returns (int) {
        /*
        * Calculating a valid current difficulty.
        */

        // Postulate Constantinople rule only.
        // calcDifficultyByzantium
        int bigTime = int(time);
        int bigParentTime = int(parent.time);

        int x = bigTime - bigParentTime;
        x = x / big9;

        if (parent.uncleHash == EmptyUncleHash) {
            x = big1 - x;
        }
        else {
            x = big2 - x;
        }

        if (x < bigMinus99) {
            x = bigMinus99;
        }

        int y = int(parent.difficulty) / DifficultyBoundDivisor;
        x = y * x;
        x = int(parent.difficulty) + x;

        if (x < MinimumDifficulty) {
            x = MinimumDifficulty;
        }

        uint fakeBlockNumber;
        if (parent.blockNumber >= bombDelayFromParent) {
            fakeBlockNumber = parent.blockNumber - bombDelayFromParent;
        }

        uint periodCount = fakeBlockNumber;
        periodCount = periodCount / expDiffPeriod;

        if (periodCount > uint(big1)) {
            uint t = periodCount - uint(big2);
            y = int(2 ** t);
            x = x + y;
        }

        return x;
    }

    function VerifySeal(
        BlockHeader memory header,
        bytes32 hashNoNonce
        ) internal view returns (bool) {
        /*
        * Main idea of verifying PoW.
        */
        

        // Ensure that we have a valid difficulty for the block
        if (header.difficulty <= 0) {
            revert("errInvalidDifficulty");
        }

        // block.Ethash
        return block.ethash(
            header.blockNumber,
            header.mixDigest,
            hashNoNonce,
            header.difficulty,
            header.nonce
        );
    }
}
