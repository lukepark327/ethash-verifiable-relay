# Install

```bash
npm install web3@0.19
npm install ethereumjs-tx
```

# How to Use

## Make JSON File
```bash
> echo "`~/Desktop/solidity-breakdown/solidity/build/solc/solc --combined-json abi,bin,interface solexam/realEthash.sol`" > solexam/realEthash.js
> relayer cat solexam/realEthash.js | python -m json.tool
{
    "contracts": {
        "solexam/realEthash.sol:realEthash": {
            "abi": "[{\"constant\":true,\"inputs\":[],\"name\":\"getEthash\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"getDiff\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"getMix\",\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"num\",\"type\":\"uint256\"},{\"name\":\"mix\",\"type\":\"bytes32\"},{\"name\":\"noNonce\",\"type\":\"bytes32\"},{\"name\":\"diff\",\"type\":\"uint256\"},{\"name\":\"n\",\"type\":\"uint256\"}],\"name\":\"setEthash\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"getNoNonce\",\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"getNonce\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"getNumber\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"}]",
            "bin": "608060405234801561001057600080fd5b5060466000819055507f4c9b60f5b1615455dac8e8efe72400a8ec005364aab15f2b8167acdf6ddb2faa6001819055507fdc2395d39fb78f3b7549f6459488aec6936da81f9514e6b6a7d6ebd5399b39c460028190555062020340600381905550670754eb613650780c60048190555060045460035460025460015460005446600560006101000a81548160ff021916908315150217905550610285806100b86000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c8063a81c3bce1161005b578063a81c3bce146100e0578063c96f82b51461014e578063d087d2881461016c578063f2c9ecd81461018a5761007d565b806303c6f5b3146100825780630b1bcee7146100a457806373a8e6be146100c2575b600080fd5b61008a6101a8565b604051808215151515815260200191505060405180910390f35b6100ac6101bf565b6040518082815260200191505060405180910390f35b6100ca6101c9565b6040518082815260200191505060405180910390f35b610134600480360360a08110156100f657600080fd5b8101908080359060200190929190803590602001909291908035906020019092919080359060200190929190803590602001909291905050506101d3565b604051808215151515815260200191505060405180910390f35b61015661023c565b6040518082815260200191505060405180910390f35b610174610246565b6040518082815260200191505060405180910390f35b610192610250565b6040518082815260200191505060405180910390f35b6000600560009054906101000a900460ff16905090565b6000600354905090565b6000600154905090565b6000856000819055508460018190555083600281905550826003819055508160048190555060045460035460025460015460005446600560006101000a81548160ff021916908315150217905550600560009054906101000a900460ff16905095945050505050565b6000600254905090565b6000600454905090565b6000805490509056fea165627a7a7230582000025886184899813911db18555d17897ab89dc85ed9669f89447d34d9f764bd0029"
        }
    },
    "version": "0.5.9-develop.2019.5.11+commit.0fcb3e85.mod.Darwin.appleclang"
}
```

## References
[1] https://github.com/ethereum/wiki/wiki/JavaScript-API   
