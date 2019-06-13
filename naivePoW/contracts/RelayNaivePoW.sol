pragma solidity ^0.5.0;

import "./RLPReader.sol";
import "./MerklePatriciaProof.sol";

contract RelayNaivePoW {
    /*
    *
    */

    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    // TODO: Add relayer's address field or mapping.
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
        *
        */

        BlockHeader memory header = parseBlockHeader(rlpHeader);

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
        *
        */

        // Verify BlockHash with RLP encoded data
        assert(blockHash == keccak256(rlpHeader));

        BlockHeader memory header = parseBlockHeader(rlpHeader);

        if (uncleBlockHashes.length != 0) {
            // TODO: validation test of uncles
            // Require all uncles block header info.
            // Require hash validation check.
            // assert();

            uncles[header.uncleHash] = uncleBlockHashes;
        }

        // call VerifyHeader
        assert(VerifyHeader(blockHash, header, true));

        blocks[blockHash] = header;
        if (highestBlockNumber < header.blockNumber) {
            highestBlockNumber = header.blockNumber;
        }
    }

    // parse block header
    function parseBlockHeader(
        bytes memory rlpHeader) internal pure
        returns (BlockHeader memory) {
        /*
        *
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

        return header;
    }

    function getUncleBlockHashes(
        bytes32 blockHash) public view returns (bytes32[] memory) {
        return uncles[blocks[blockHash].uncleHash];
    }

    /*
    function getStateRoot(bytes32 blockHash) public view returns (bytes32) {
        return blocks[blockHash].stateRoot;
    }
    */

    function getTxRoot(bytes32 blockHash) public view returns (bytes32) {
        return blocks[blockHash].txRoot;
    }

    /*
    function getReceiptRoot(bytes32 blockHash) public view returns (bytes32) {
        return blocks[blockHash].receiptRoot;
    }
    */

    function checkTxProof(
        bytes memory value,
        bytes32 blockHash,
        bytes memory path,
        bytes memory parentNodes
    ) public view returns (bool) {
        bytes32 txRoot = blocks[blockHash].txRoot;
        return trieValue(value, path, parentNodes, txRoot);
    }

    /*
    function checkStateProof(
        bytes memory value,
        bytes32 blockHash,
        bytes memory path,
        bytes memory parentNodes
    ) public view returns (bool) {
        bytes32 stateRoot = blocks[blockHash].stateRoot;
        return trieValue(value, path, parentNodes, stateRoot);
    }
    */

    /*
    function checkReceiptProof(
        bytes memory value,
        bytes32 blockHash,
        bytes memory path,
        bytes memory parentNodes
    ) public view returns (bool) {
        bytes32 receiptRoot = blocks[blockHash].receiptRoot;
        return trieValue(value, path, parentNodes, receiptRoot);
    }
    */

    function trieValue(
        bytes memory value,
        bytes memory encodedPath,
        bytes memory parentNodes,
        bytes32 root
    ) internal pure returns (bool) {
        return MerklePatriciaProof.verify(value, encodedPath, parentNodes, root);
    }

    // TODO: Save verifying function in other contracts.

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
    uint    bombDelay               = 3000000; // 5000000; in Constantinople
    uint    bombDelayFromParent     = bombDelay - uint(big1);
    uint    expDiffPeriod           = 100000;

    function VerifyHeader(
        bytes32 blockHash,
        BlockHeader memory header,
        bool seal) internal view
        returns (bool) {
        /*
        *
        */

        if (blocks[blockHash].parentHash != 0) {
            revert();
        }
        BlockHeader memory parent = blocks[header.parentHash];
        if (parent.parentHash == 0) {
            revert("consensus.ErrUnknownAncestor");
        }

        return verifyHeader(header, parent, false, seal);
    }

    function verifyHeader(
        BlockHeader memory header,
        BlockHeader memory parent,
        bool uncle,
        bool seal) internal view
        returns (bool) {
        /*
        *
        */

        // Ensure that the header's extra-data section is of a reasonable size

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
            if (!VerifySeal(header)) {
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
        *
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
        BlockHeader memory header
        ) internal view returns (bool) {
        /*
        * Main idea of verifying PoW
        */

        // Ensure that we have a valid difficulty for the block
        if (header.difficulty <= 0) {
            revert("errInvalidDifficulty");
        }

        // Recompute the digest and PoW value and verify against the header
        // naïve PoW
        bytes32 hashNoNonce = header.mixDigest;

        bytes32 digest;
        bytes32 result;
        (digest, result) = naivePoW(hashNoNonce, header.nonce);

        if (header.mixDigest != digest) {
            revert("errInvalidMixDigest");
        }
        bytes32 target = bytes32(MaxBig256 / header.difficulty);
        if (result > target) {
            revert("errInvalidPoW");
        }
        return true;
    }

    function naivePoW(
        bytes32 hash,
        uint    nonce
        ) internal pure returns (bytes32, bytes32) {
        /*
        * Modified Hashimoto algorithm; remove mix rounds.
        */
        bytes32 digest = hash;

    	// Combine header+nonce into a 64 byte seed
        bytes memory seed = new bytes(72);
        for (uint8 i=0; i<32; i++) {
            seed[i] = digest[i];
        }

        // binary.LittleEndian.PutUint64(seed[32:], nonce)
        bytes memory nonceBytes = PutUint64(uint64(nonce));

        for (uint8 i=32; i<40; i++) {
            seed[i] = nonceBytes[i-32];
        }
        for (uint8 i=40; i<72; i++) {
            seed[i] = digest[i-40];
        }
        return (digest, keccak256(seed));
    }

    function PutUint64(
        uint64 v
        ) internal pure returns (bytes memory) {
        /*
        *
        */
        bytes memory b = new bytes(8);
    	b[0] = byte(uint8((v		) % 256));
    	b[1] = byte(uint8((v >> 8	) % 256));
    	b[2] = byte(uint8((v >> 16	) % 256));
    	b[3] = byte(uint8((v >> 24	) % 256));
    	b[4] = byte(uint8((v >> 32	) % 256));
    	b[5] = byte(uint8((v >> 40	) % 256));
    	b[6] = byte(uint8((v >> 48	) % 256));
    	b[7] = byte(uint8((v >> 56	) % 256));

    	return b;
    }
}
