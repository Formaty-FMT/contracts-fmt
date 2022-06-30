// SPDX-License-Identifier: ISC

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// import "hardhat/console.sol";

contract FMTP is ERC20, AccessControl {
    uint256 public constant initialSupply = 15_000_000 ether;

    address public fromAddress;
    address public toAddress;
    address public collectionFMT;

    uint256 public collectionFMTAmount;

    mapping(address => uint256) public initialBalances;
    mapping(address => uint256) public swappedBalances;
    uint256 public swappedBalancesTotal;

    uint256 public stopPresaleBlock;
    uint256 public lockPeriodBlocks;
    uint256 public sixMonthBlock;
    uint256 public twelveMonthBlock;

    uint256 private precision = 10**6;

    event Fund(address, uint256);
    event Swap(address, uint256);

    /**
     * Token Formaty - FMT for private sale only
     * @notice including vesting functionality
     * @param _lockPeriodBlocks set the period of token will be unlocked
     */
    constructor(uint256 _lockPeriodBlocks, address _formatyOwner) ERC20("FormatyPrivate", "FMTP") {
        fromAddress = _formatyOwner;
        toAddress = address(0);
        lockPeriodBlocks = _lockPeriodBlocks;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, _formatyOwner);

        _mint(_formatyOwner, initialSupply);
    }

    /**
     * @dev check if transfer is possible
     * See ERC20 implementation for more information about **_afterTokenTransfer**
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        // Transfer only from the minter, from the deployer or to the burner
        require(
            (from == address(0)) || (from == fromAddress) || (to == toAddress),
            "FMTP: Address not allowed"
        );

        // Block all transfer after this is set except for the burn
        require(
            stopPresaleBlock == 0 || (to == toAddress),
            "FMTP: Presale is over"
        );
    }

    /**
     * @dev Update initialBalances of **from** and **to**
     * See ERC20 implementation for more information about _afterTokenTransfer
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._afterTokenTransfer(from, to, amount);

        if (stopPresaleBlock == 0) {
            // Minting
            if (from != address(0)) {
                initialBalances[from] -= amount;
            }
            initialBalances[to] += amount;
        }
    }

    /**
     * @notice Modify address enable to send token
     * @param addr address enabled
     * @dev only **DEFAULT_ADMIN_ROLE** can call this function
     */
    function modifyFromAddress(address addr)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        fromAddress = addr;
    }

    /**
     * @notice Modify address enable to receiver token
     * @param addr address enabled
     * @dev only **DEFAULT_ADMIN_ROLE** can call this function
     */
    function modifyToAddress(address addr) public onlyRole(DEFAULT_ADMIN_ROLE) {
        toAddress = addr;
    }

    /**
     * @notice Modify collection fmt for swap
     * @param addr address enabled
     * @dev only **DEFAULT_ADMIN_ROLE** can call this function
     */
    function modifyCollectionFMT(address addr)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        collectionFMT = addr;
    }

    /**
     * @notice Stop the possibility to send other token for this presale
     * @dev set **stopPresaleBlock** with current and set the period of **sixMonthBlock**
     * and **twelveMonthBlock** for vesting functionality
     * @dev only **DEFAULT_ADMIN_ROLE** can call this function
     */
    function stopPresale() public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(stopPresaleBlock == 0, "FMTP: Presale already stopped");

        stopPresaleBlock = block.number;
        sixMonthBlock = stopPresaleBlock + (lockPeriodBlocks / 2);
        twelveMonthBlock = stopPresaleBlock + lockPeriodBlocks;
    }

    /**
     * @notice User can be fund this contract with fmt token to allow swap with fmtp
     * @dev Before this you should have approved the **amount**
     */
    function fund(uint256 amount) public {
        require(amount > 0, "FMTP: Cannot fund 0");
        require(
            collectionFMT != address(0),
            "FMTP: No collectionFMT address set"
        );

        // This will transfer the amount of token from caller to contract
        IERC20(collectionFMT).transferFrom(msg.sender, address(this), amount);

        collectionFMTAmount += amount;

        emit Fund(msg.sender, amount);
    }

    /**
     * @notice Swap fmtp with fmt according with vesting functionality
     * @dev require set **stopPresale**, **collectionFMT** and **collectionFMTAmount**
     * require balanceOf **msgSender** > 0
     * fmtp swapped will be burn
     */
    function swap() public {
        require(stopPresaleBlock != 0, "FMTP: Presale is not over");
        require(
            collectionFMT != address(0),
            "FMTP: No collectionFMT address set"
        );

        uint256 blockNumber = block.number;

        require(
            blockNumber > sixMonthBlock,
            "FMTP: Cannot swap before 6 months"
        );

        uint256 amount = calculateAmountSwap(msg.sender, blockNumber);

        require(collectionFMTAmount > 0, "FMTP: Funds are empty");
        require(balanceOf(msg.sender) > 0, "FMTP: Cannot swap 0");

        // console.log("Swapping", amount, "FMTP");

        swappedBalances[msg.sender] += amount;
        swappedBalancesTotal += amount;

        collectionFMTAmount -= amount;

        _burn(msg.sender, amount);

        IERC20(collectionFMT).transfer(msg.sender, amount);

        emit Swap(msg.sender, amount);
    }

    function calculateAmountSwap(address _sender, uint256 _blockNumber)
        public
        view
        returns (uint256)
    {
        uint256 amount;
        if (_blockNumber > twelveMonthBlock) {
            amount = initialBalances[_sender] - swappedBalances[_sender];
        } else {
            amount =
                ((precision *
                    initialBalances[_sender] *
                    (_blockNumber - sixMonthBlock)) /
                    (twelveMonthBlock - sixMonthBlock) -
                    precision *
                    swappedBalances[_sender]) /
                precision;
        }

        // Sanity check
        if (amount > balanceOf(_sender)) {
            amount = balanceOf(_sender);
        }

        return amount;
    }
}
