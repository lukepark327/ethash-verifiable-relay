# Ethereum Block Header Verification

Watch Geth's `VerifySeal` function in `consensus.go`.

```go
func (ethash *Ethash) VerifySeal(chain consensus.ChainReader, header *types.Header) error {
	...
}
```

## Ensure that we have a valid difficulty for the block
```go
if header.Difficulty.Sign() <= 0 {
	return errInvalidDifficulty
}
```

`Sign` returns -1 if x < 0, 0 if x == 0, and +1 if x > 0.

```go
func (x *Int) Sign() int {
	if len(x.abs) == 0 {
		return 0
	}
	if x.neg {
		return -1
	}
	return 1
}
```

* Recompute the digest and PoW value and verify against the header

Calculate `Hashimoto` to get `digest` and `result`.

```go
number := header.Number.Uint64()
cache := ethash.Cache(number)
size := datasetSize(number)

digest, result := HashimotoLight(size, cache.cache, header.HashNoNonce().Bytes(), header.Nonce.Uint64())
```

Check `digest` is valid. Mixhash is actually calculated from nonce as intermediate value when validating PoW with Hashimoto algorithm. But this calculation is still pretty heavy and a node might be DDoSed by blocks with incorrect nonces. mixhash is included into block to perform lightweight PoW 'pre-validation' to avoid such attack, as generating a correct mixhash still requires at least some work for attacker[1].

```go
if !bytes.Equal(header.MixDigest[:], digest) {
	return errInvalidMixDigest
}
```

Check block difficulty is valid.

```go
target := new(big.Int).Div(maxUint256, header.Difficulty)

if new(big.Int).SetBytes(result).Cmp(target) > 0 {
	return errInvalidPoW
}
```

`maxUint256` is a big integer representing 2^256-1 `maxUint256 = new(big.Int).Exp(big.NewInt(2), big.NewInt(256), big.NewInt(0))`.

`Cmp` returns -1 if x < y, 0 if x == y, +1 if x > y.

<!--
## TODO
* Change Title
  * Keywords: relay, ethash, 2-way-peg, new opcode, modified merkle patricia trie proof, rlp
-->

# References
[1] https://ethereum.stackexchange.com/questions/5833/why-do-we-need-both-nonce-and-mixhash-values-in-a-block   
