pragma solidity ^0.5.0;

/*
* Used to proxy function calls to the RLPReader for testing
*/
import "./RLPReader.sol";

contract SomeContract {
    bytes32 prevHash;
    
    // optional way to attach library functions to these data types.
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    // lets assume that rlpBytes is an encoding of [[1, "nested"], 2, 0x<Address>]
    function someFunctionThatTakesAnEncodedItem(bytes memory rlpBytes)
    public {
        RLPReader.RLPItem[] memory ls = rlpBytes.toRlpItem().toList(); // must convert to an rlpItem first!

        prevHash = bytes32(ls[0].toUint()); // prevHash
    }
    
    function get()
    public view
    returns(bytes32) {
        return prevHash;
    }
}
