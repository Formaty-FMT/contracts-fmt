// SPDX-License-Identifier: ISC

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract FMT is ERC20 {
    uint256 public constant initialSupply = 100000000 ether;

    constructor(address _formatyOwner) ERC20("Formaty", "FMT") {
        _mint(_formatyOwner, initialSupply);
    }
}
