# Ethereum Block Header 

See [RLPdecoding.md](https://github.com/twodude/eth-proof-sol/blob/master/docs/RLPdecoding.md) and [calBlockHash.md](https://github.com/twodude/geth-breakdown/blob/master/docs/naivePow/calBlockHash.md)

## Block Header

Header represents a block header in the Ethereum blockchain.

```go
type Header struct {
	ParentHash  common.Hash    `json:"parentHash"       gencodec:"required"`
	UncleHash   common.Hash    `json:"sha3Uncles"       gencodec:"required"`
	Coinbase    common.Address `json:"miner"            gencodec:"required"`
	Root        common.Hash    `json:"stateRoot"        gencodec:"required"`
	TxHash      common.Hash    `json:"transactionsRoot" gencodec:"required"`
	ReceiptHash common.Hash    `json:"receiptsRoot"     gencodec:"required"`
	Bloom       Bloom          `json:"logsBloom"        gencodec:"required"`
	Difficulty  *big.Int       `json:"difficulty"       gencodec:"required"`
	Number      *big.Int       `json:"number"           gencodec:"required"`
	GasLimit    uint64         `json:"gasLimit"         gencodec:"required"`
	GasUsed     uint64         `json:"gasUsed"          gencodec:"required"`
	Time        *big.Int       `json:"timestamp"        gencodec:"required"`
	Extra       []byte         `json:"extraData"        gencodec:"required"`
	MixDigest   common.Hash    `json:"mixHash"          gencodec:"required"`
	Nonce       BlockNonce     `json:"nonce"            gencodec:"required"`
}
```

* We can check a `Coinbase` transaction validation via merkleproof. But is it necessary?
	* There are no tx about coinbase. See https://github.com/twodude/eth-proof-sol/blob/master/docs/Coinbase.md
	* So you can't verify coinbase tx with block header only.

* Skip checking `UncleHash` validation?
	* Theretofore, is it possible to save all uncle blocks in a contract?

* Skip `Root` and `ReceiptHash` validation.
	* We can do those things... But is it necessary?

* Skip `logsBloom` is DATA, 256 Bytes, the bloom filter for the logs of the block. null when its pending block.
	* Logs: the set of logs entries created upon transaction execution.
	* The bloom filter: it is created based on the information found int he logs. Logs entries are reduced are reduced to 256 bytes hashes, which are embedded in the block header as the logs bloom.[[2]](https://github.com/twodude/eth-proof-sol)

# Ethereum Block Header Verification
Refer Geth's `consensus.go` file.

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

* `calcDifficultyByzantium` is the difficulty adjustment algorithm. It returns the difficulty that a new block should have when created at time given the parent block's time and difficulty. The calculation uses the Byzantium rules.

```go
func calcDifficultyByzantium(time uint64, parent *types.Header) *big.Int {
	// https://github.com/ethereum/EIPs/issues/100.
	// algorithm:
	// diff = (parent_diff +
	//         (parent_diff / 2048 * max((2 if len(parent.uncles) else 1) - ((timestamp - parent.timestamp) // 9), -99))
	//        ) + 2^(periodCount - 2)

	bigTime := new(big.Int).SetUint64(time)
	bigParentTime := new(big.Int).Set(parent.Time)

	// holds intermediate values to make the algo easier to read & audit
	x := new(big.Int)
	y := new(big.Int)

	// (2 if len(parent_uncles) else 1) - (block_timestamp - parent_timestamp) // 9
	x.Sub(bigTime, bigParentTime)
	x.Div(x, big9)
	if parent.UncleHash == types.EmptyUncleHash {
		x.Sub(big1, x)
	} else {
		x.Sub(big2, x)
	}
	// max((2 if len(parent_uncles) else 1) - (block_timestamp - parent_timestamp) // 9, -99)
	if x.Cmp(bigMinus99) < 0 {
		x.Set(bigMinus99)
	}
	// parent_diff + (parent_diff / 2048 * max((2 if len(parent.uncles) else 1) - ((timestamp - parent.timestamp) // 9), -99))
	y.Div(parent.Difficulty, params.DifficultyBoundDivisor)
	x.Mul(y, x)
	x.Add(parent.Difficulty, x)

	// minimum difficulty can ever be (before exponential factor)
	if x.Cmp(params.MinimumDifficulty) < 0 {
		x.Set(params.MinimumDifficulty)
	}
	// calculate a fake block number for the ice-age delay:
	//   https://github.com/ethereum/EIPs/pull/669
	//   fake_block_number = min(0, block.number - 3_000_000
	fakeBlockNumber := new(big.Int)
	if parent.Number.Cmp(big2999999) >= 0 {
		fakeBlockNumber = fakeBlockNumber.Sub(parent.Number, big2999999) // Note, parent is 1 less than the actual block number
	}
	// for the exponential factor
	periodCount := fakeBlockNumber
	periodCount.Div(periodCount, expDiffPeriod)

	// the exponential factor, commonly referred to as "the bomb"
	// diff = diff + 2^(periodCount - 2)
	if periodCount.Cmp(big1) > 0 {
		y.Sub(periodCount, big2)
		y.Exp(big2, y, nil)
		x.Add(x, y)
	}
	return x
}
```

<!--
* `DurationLimit = big.NewInt(13)` is the decision boundary on the blocktime duration used to determine whether difficulty should go up or not.
-->

* `big9 = big.NewInt(9)`

* `bigMinus99 = big.NewInt(-99)` and `big2999999 = big.NewInt(2999999)`

* `EmptyUncleHash = rlpHash([]*Header(nil))`

* `DifficultyBoundDivisor = big.NewInt(2048)` is the bound divisor of the difficulty, used in the update calculations.

* `MinimumDifficulty = big.NewInt(131072)` is the minimum that the difficulty may ever be.

* `expDiffPeriod = big.NewInt(100000)`

### In Constantinople Rule
The difficulty is calculated with Byzantium rules. But there is a `bombDelay` feature.

```go
calcDifficultyConstantinople = makeDifficultyCalculator(big.NewInt(5000000))
calcDifficultyByzantium = makeDifficultyCalculator(big.NewInt(3000000))
```

```go
bombDelayFromParent := new(big.Int).Sub(bombDelay, big1)
```

```go
// calculate a fake block number for the ice-age delay
// Specification: https://eips.ethereum.org/EIPS/eip-1234
fakeBlockNumber := new(big.Int)
if parent.Number.Cmp(bombDelayFromParent) >= 0 {
	fakeBlockNumber = fakeBlockNumber.Sub(parent.Number, bombDelayFromParent)
}
```

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

### Check `digest` is valid.

Mixhash is actually calculated from nonce as intermediate value when validating PoW with Hashimoto algorithm. But this calculation is still pretty heavy and a node might be DDoSed by blocks with incorrect nonces. mixhash is included into block to perform lightweight PoW 'pre-validation' to avoid such attack, as generating a correct mixhash still requires at least some work for attacker[[1]](https://github.com/twodude/eth-proof-sol).

```go
if !bytes.Equal(header.MixDigest[:], digest) {
	return errInvalidMixDigest
}
```

### Check block difficulty is valid.

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

# Verify Uncle Block

Refer [VerifyUncle.md](https://github.com/twodude/eth-proof-sol/blob/master/docs/VerifyUncle.md)

# References
[1] https://ethereum.stackexchange.com/questions/5833/why-do-we-need-both-nonce-and-mixhash-values-in-a-block   
[2] https://delegatecall.com/questions/what-are-the-elements-of-a-transaction-receipt-in-ethereum-e8b59e51-f535-455e-9841-358b14c40107   
