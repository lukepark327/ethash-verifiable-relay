# Ethereum Block Header Verification
Watch Geth's `consensus.go` file.

# VerifyHeader
`VerifyHeader` checks whether a header conforms to the consensus rules of the stock Ethereum ethash engine.

## Short circuit if the header is known, or it's parent not

```go
number := header.Number.Uint64()
if chain.GetHeader(header.Hash(), number) != nil {
	return nil
}
parent := chain.GetHeader(header.ParentHash, number-1)
if parent == nil {
	return consensus.ErrUnknownAncestor
}
```

## Sanity checks passed, do a proper verification
```go
return ethash.verifyHeader(chain, header, parent, false, seal)
```

# verifyHeader
`verifyHeader` checks whether a header conforms to the consensus rules of the stock Ethereum ethash engine. See YP section 4.3.4. "Block Header Validity".

## Skip some verification process (for lightweight)

* If all checks passed, validate any special fields for hard forks

## Ensure that the header's extra-data section is of a reasonable size

```go
if uint64(len(header.Extra)) > params.MaximumExtraDataSize {
	return fmt.Errorf("extra-data too long: %d > %d", len(header.Extra), params.MaximumExtraDataSize)
}
```

* `MaximumExtraDataSize uint64 = 32`

## Verify the header's timestamp
```go
if uncle {
	if header.Time.Cmp(math.MaxBig256) > 0 {
		return errLargeBlockTime
	}
} else {
	if header.Time.Cmp(big.NewInt(time.Now().Add(allowedFutureBlockTime).Unix())) > 0 {
		return consensus.ErrFutureBlock
	}
}
if header.Time.Cmp(parent.Time) <= 0 {
	return errZeroBlockTime
}
```

* We just skip uncle parts for lightweight.

* There are some big integer limit values.

```go
var (
	tt256     = BigPow(2, 256)
	tt256m1   = new(big.Int).Sub(tt256, big.NewInt(1))
	MaxBig256 = new(big.Int).Set(tt256m1)
)
```

* Also there are Ethash proof-of-work protocol constants.

```go
var (
	maxUncles                       = 2
	allowedFutureBlockTime          = 15 * time.Second
)
```

## Verify the block's difficulty based in it's timestamp and parent's difficulty

```go
expected := ethash.CalcDifficulty(chain, header.Time.Uint64(), parent)

if expected.Cmp(header.Difficulty) != 0 {
	return fmt.Errorf("invalid difficulty: have %v, want %v", header.Difficulty, expected)
}
```

* `CalcDifficulty` is the difficulty adjustment algorithm. It returns the difficulty that a new block should have when created at time given the parent block's time and difficulty.

```go
func (ethash *Ethash) CalcDifficulty(chain consensus.ChainReader, time uint64, parent *types.Header) *big.Int {
	return CalcDifficulty(chain.Config(), time, parent)
}

func CalcDifficulty(config *params.ChainConfig, time uint64, parent *types.Header) *big.Int {
	next := new(big.Int).Add(parent.Number, big1)
	switch {
	case config.IsByzantium(next):
		return calcDifficultyByzantium(time, parent)
	case config.IsHomestead(next):
		return calcDifficultyHomestead(time, parent)
	default:
		return calcDifficultyFrontier(time, parent)
	}
}
```

* `big1 = big.NewInt(1)` and `big2 = big.NewInt(2)`

* `calcDifficultyFrontier` is the difficulty adjustment algorithm. It returns the difficulty that a new block should have when created at time given the parent block's time and difficulty. The calculation uses the Frontier rules.

```go
func calcDifficultyFrontier(time uint64, parent *types.Header) *big.Int {
	diff := new(big.Int)
	adjust := new(big.Int).Div(parent.Difficulty, params.DifficultyBoundDivisor)
	bigTime := new(big.Int)
	bigParentTime := new(big.Int)

	bigTime.SetUint64(time)
	bigParentTime.Set(parent.Time)

	if bigTime.Sub(bigTime, bigParentTime).Cmp(params.DurationLimit) < 0 {
		diff.Add(parent.Difficulty, adjust)
	} else {
		diff.Sub(parent.Difficulty, adjust)
	}
	if diff.Cmp(params.MinimumDifficulty) < 0 {
		diff.Set(params.MinimumDifficulty)
	}

	periodCount := new(big.Int).Add(parent.Number, big1)
	periodCount.Div(periodCount, expDiffPeriod)
	if periodCount.Cmp(big1) > 0 {
		// diff = diff + 2^(periodCount - 2)
		expDiff := periodCount.Sub(periodCount, big2)
		expDiff.Exp(big2, expDiff, nil)
		diff.Add(diff, expDiff)
		diff = math.BigMax(diff, params.MinimumDifficulty)
	}
	return diff
}
```

* `DurationLimit = big.NewInt(13)` is the decision boundary on the blocktime duration used to determine whether difficulty should go up or not.

* `MinimumDifficulty = big.NewInt(131072)` is The minimum that the difficulty may ever be.

* `expDiffPeriod = big.NewInt(100000)`

## Verify that the gas limit is <= 2^63-1

```go
cap := uint64(0x7fffffffffffffff)
if header.GasLimit > cap {
	return fmt.Errorf("invalid gasLimit: have %v, max %v", header.GasLimit, cap)
}
```

## Verify that the gasUsed is <= gasLimit

```go
if header.GasUsed > header.GasLimit {
	return fmt.Errorf("invalid gasUsed: have %d, gasLimit %d", header.GasUsed, header.GasLimit)
}
```

## Verify that the gas limit remains within allowed bounds

```go
diff := int64(parent.GasLimit) - int64(header.GasLimit)
if diff < 0 {
	diff *= -1
}
limit := parent.GasLimit / params.GasLimitBoundDivisor

if uint64(diff) >= limit || header.GasLimit < params.MinGasLimit {
	return fmt.Errorf("invalid gas limit: have %d, want %d += %d", header.GasLimit, parent.GasLimit, limit)
}
```

* `GasLimitBoundDivisor uint64 = 1024` is the bound divisor of the gas limit, used in update calculations.

* `MinGasLimit uint64 = 5000` is minimum the gas limit may ever be.

## Verify that the block number is parent's +1

```go
if diff := new(big.Int).Sub(header.Number, parent.Number); diff.Cmp(big.NewInt(1)) != 0 {
	return consensus.ErrInvalidNumber
}
```

## Verify the engine specific seal securing the block

```go
if seal {
	if err := ethash.VerifySeal(chain, header); err != nil {
		return err
	}
}
```

* Call `VerifySeal`.

# VerifySeal

VerifySeal implements consensus.Engine, checking whether the given block satisfies the PoW difficulty requirements.

## Ensure that we have a valid difficulty for the block
```go
if header.Difficulty.Sign() <= 0 {
	return errInvalidDifficulty
}
```

* `Sign` returns -1 if x < 0, 0 if x == 0, and +1 if x > 0.

## Recompute the digest and PoW value and verify against the header

Calculate `Hashimoto` to get `digest` and `result`.

```go
number := header.Number.Uint64()
cache := ethash.Cache(number)
size := datasetSize(number)

digest, result := HashimotoLight(size, cache.cache, header.HashNoNonce().Bytes(), header.Nonce.Uint64())
```

## Check `digest` is valid.

Mixhash is actually calculated from nonce as intermediate value when validating PoW with Hashimoto algorithm. But this calculation is still pretty heavy and a node might be DDoSed by blocks with incorrect nonces. mixhash is included into block to perform lightweight PoW 'pre-validation' to avoid such attack, as generating a correct mixhash still requires at least some work for attacker[1].

```go
if !bytes.Equal(header.MixDigest[:], digest) {
	return errInvalidMixDigest
}
```

## Check block difficulty is valid.

```go
target := new(big.Int).Div(maxUint256, header.Difficulty)

if new(big.Int).SetBytes(result).Cmp(target) > 0 {
	return errInvalidPoW
}
```

* `maxUint256` is a big integer representing 2^256-1 `maxUint256 = new(big.Int).Exp(big.NewInt(2), big.NewInt(256), big.NewInt(0))`.

* `Cmp` returns -1 if x < y, 0 if x == y, +1 if x > y.

<!--
## TODO
* Change Title
  * Keywords: relay, ethash, 2-way-peg, new opcode, modified merkle patricia trie proof, rlp
-->

# References
[1] https://ethereum.stackexchange.com/questions/5833/why-do-we-need-both-nonce-and-mixhash-values-in-a-block   
