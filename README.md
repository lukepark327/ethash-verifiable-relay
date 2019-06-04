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

Sign returns -1 if x <  0, 0 if x == 0, and +1 if x >  0

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



<!--
## TODO
* Change Title
  * Keywords: relay, ethash, 2-way-peg, new opcode, modified merkle patricia trie proof, rlp
-->
