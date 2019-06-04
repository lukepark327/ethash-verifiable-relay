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

Sign returns -1 if x < 0, 0 if x == 0, and +1 if x > 0.

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

```go
number := header.Number.Uint64()

cache := ethash.Cache(number)
size := datasetSize(number)
if ethash.config.PowMode == ModeTest {
	size = 32 * 1024
}
digest, result := HashimotoLight(size, cache.cache, header.HashNoNonce().Bytes(), header.Nonce.Uint64())
// Caches are unmapped in a finalizer. Ensure that the cache stays live
// until after the call to hashimotoLight so it's not unmapped while being used.
runtime.KeepAlive(cache)

if !bytes.Equal(header.MixDigest[:], digest) {
	return errInvalidMixDigest
}
target := new(big.Int).Div(maxUint256, header.Difficulty)
if new(big.Int).SetBytes(result).Cmp(target) > 0 {
	return errInvalidPoW
}
```


<!--
## TODO
* Change Title
  * Keywords: relay, ethash, 2-way-peg, new opcode, modified merkle patricia trie proof, rlp
-->
