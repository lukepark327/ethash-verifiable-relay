# Main Chain Selection Rule in Contract
For solving (in fact, relieving) orphan block problem.
To implement main chain selection rule, we need to enroll uncle blocks.

# Verifying Uncle Block

There are some Ethash PoW protocol contants.
```go
var (
	FrontierBlockReward    *big.Int = big.NewInt(5e+18) // Block reward in wei for successfully mining a block
	ByzantiumBlockReward   *big.Int = big.NewInt(3e+18) // Block reward in wei for successfully mining a block upward from Byzantium
	maxUncles                       = 2                 // Maximum number of uncles allowed in a single block
	allowedFutureBlockTime          = 15 * time.Second  // Max time from current time allowed for blocks, before they're considered future blocks
)
```

`VerifyUncles` verifies that the given block's uncles conform to the consensus rules of the stock Ethereum ethash engine.

## Verify that there are at most 2 uncles included in this block

```go
if len(block.Uncles()) > maxUncles {
  return errTooManyUncles
}
```

## Gather the set of past uncles and ancestors

```go
uncles, ancestors := set.New(), make(map[common.Hash]*types.Header)

number, parent := block.NumberU64()-1, block.ParentHash()
for i := 0; i < 7; i++ {
  ancestor := chain.GetBlock(parent, number)
  if ancestor == nil {
    break
  }
  ancestors[ancestor.Hash()] = ancestor.Header()
  for _, uncle := range ancestor.Uncles() {
    uncles.Add(uncle.Hash())
  }
  parent, number = ancestor.ParentHash(), number-1
}
ancestors[block.Hash()] = block.Header()
uncles.Add(block.Hash())
```

Refer Ghost protocol;

* [longest.sol](https://github.com/twodude/eth-ghost-sol/blob/master/contracts/longest.sol)
* [codeReviews.md](https://github.com/twodude/eth-ghost-sol/blob/master/codeReviews.md)

## Verify each of the uncles that it's recent, but not an ancestor

```go
for _, uncle := range block.Uncles() {
  ...
}
```

### Make sure every uncle is rewarded only once
  
```go
hash := uncle.Hash()
if uncles.Has(hash) {
  return errDuplicateUncle
}
uncles.Add(hash)
```

### Make sure the uncle has a valid ancestry
```go
if ancestors[hash] != nil {
  return errUncleIsAncestor
}
if ancestors[uncle.ParentHash] == nil || uncle.ParentHash == block.ParentHash() {
  return errDanglingUncle
}
if err := ethash.verifyHeader(chain, uncle, ancestors[uncle.ParentHash], true, true); err != nil {
  return err
}
```

* Verify uncle block with Ethash.
