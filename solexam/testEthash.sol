pragma solidity ^0.5.1;

contract testEthash {
	uint blockNumber;
	bytes32 mixDigest;
	bytes32 hashNoNonce;
	uint difficulty;
	uint nonce;

	bool blockEthash;

	// Inputs	: blockNumber for cache,
	//			  header.MixDigest,
	// 			  header.HashNoNonce().Bytes()
	// 			  difficulty,
	//			  header.Nonce.Uint64()
	// Outputs	: True or False
	function setEthash(
		uint num,
		bytes32 mix,
		bytes32 noNonce,
		uint diff,
		uint n
	) public returns(bool) {
		blockNumber = num;
		mixDigest = mix;
		hashNoNonce = noNonce;
		difficulty = diff;
		nonce = n;

		blockEthash = block.ethash(blockNumber, mixDigest, hashNoNonce, difficulty, nonce);

		return blockEthash;
	}
	
	function getEthash() public view returns(bool) {
		return blockEthash;
	}

	function getNumber() public view returns(uint) {
		return blockNumber;
	}
	function getMix() public view returns(bytes32) {
		return mixDigest;
	}
	function getNoNonce() public view returns(bytes32) {
		return hashNoNonce;
	}
	function getDiff() public view returns(uint) {
		return difficulty;
	}
	function getNonce() public view returns(uint) {
		return nonce;
	}
}
