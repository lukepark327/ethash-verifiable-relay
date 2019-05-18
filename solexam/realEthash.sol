pragma solidity ^0.5.1;

contract realEthash {
	uint blockNumber;
	bytes32 mixDigest;
	bytes32 hashNoNonce;
	uint difficulty;
	uint nonce;

	bool blockEthash;

	constructor() public {
		blockNumber = 70;
		mixDigest = hex"4c9b60f5b1615455dac8e8efe72400a8ec005364aab15f2b8167acdf6ddb2faa";
		hashNoNonce = hex"dc2395d39fb78f3b7549f6459488aec6936da81f9514e6b6a7d6ebd5399b39c4";
		difficulty = 131904;
		nonce = 528305859064789004;

		blockEthash = block.ethash(blockNumber, mixDigest, hashNoNonce, difficulty, nonce);
	}

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
