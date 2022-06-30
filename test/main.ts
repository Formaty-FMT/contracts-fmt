import { expect } from 'chai';
import { BigNumber } from 'ethers';
import hardhat from 'hardhat';

import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import exc from './utils/exceptions';

const { ethers, upgrades } = hardhat;

let deployer: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;

let ftmContract: Contract;
let ftmpContract: Contract;

// Params ftmpContract
let initialSupply = ethers.utils.parseEther('15000000');
let name = 'FormatyPrivate';
let symbol = 'FMTP';
let decimals = 18;
let formatyOwner = "0x9f86e5e2d609A88fe1306ac20b62E7079F63D49A"

// BSC Math: 2629743 s/month → 3 s/block → 876581 blocks/month
const blocksMonthsBSC = 876581;

before(async function () {
	[deployer, account1, account2] = await ethers.getSigners();

	const ftmFactory = await ethers.getContractFactory('FMT');
	ftmContract = await ftmFactory.deploy(deployer.address);

	const ftmpFactory = await ethers.getContractFactory('FMTP');
	ftmpContract = await ftmpFactory.deploy(blocksMonthsBSC * 12, deployer.address); // 12 months
});

describe('Testing FMT contract... ', async () => {
	describe('Testing access control...', async () => {});

	describe('Testing ERC20 standard...', async () => {
		it('should test name, symbol and decimals', async () => {
			expect(name).to.be.equal(await ftmpContract.name());
			expect(symbol).to.be.equal(await ftmpContract.symbol());
			expect(decimals).to.be.equal(await ftmpContract.decimals());
		});

		it('should test totalSupply', async () => {
			let totalSupply = await ftmpContract.totalSupply();
			expect(totalSupply).to.be.equal(initialSupply);
		});

		it('should test balance of deployer', async () => {
			let balanceOf = await ftmpContract.balanceOf(deployer.address);
			expect(balanceOf).to.be.equal(initialSupply);
		});

		it('should test transfer', async () => {
			let balanceOfDeployerBefore = await ftmpContract.balanceOf(
				deployer.address
			);
			let amount = balanceOfDeployerBefore.div(2);
			let balanceOfAccount1Before = await ftmpContract.balanceOf(
				account1.address
			);

			await ftmpContract.transfer(account1.address, amount);

			expect(await ftmpContract.balanceOf(deployer.address)).to.be.equal(
				balanceOfDeployerBefore.sub(amount)
			);
			expect(await ftmpContract.balanceOf(account1.address)).to.be.equal(
				balanceOfAccount1Before.add(amount)
			);

			await exc.catchRevert(
				ftmpContract.transfer(account1.address, amount.mul(2))
			);
		});

		it('should test approve', async () => {
			let amount = await ftmpContract.balanceOf(deployer.address);

			await ftmpContract.approve(account1.address, amount);

			expect(
				await ftmpContract.allowance(deployer.address, account1.address)
			).to.be.equal(amount);
		});

		it('should test increase allowance', async () => {
			let allowanceBefore = await ftmpContract.allowance(
				deployer.address,
				account1.address
			);
			let amount = await ftmpContract.balanceOf(deployer.address);

			await ftmpContract.increaseAllowance(account1.address, amount);

			expect(
				await ftmpContract.allowance(deployer.address, account1.address)
			).to.be.equal(allowanceBefore.add(amount));
		});

		it('should test decrease allowance', async () => {
			let allowanceBefore = await ftmpContract.allowance(
				deployer.address,
				account1.address
			);
			let amount = await ftmpContract.balanceOf(deployer.address);

			await ftmpContract.decreaseAllowance(account1.address, amount);

			expect(
				await ftmpContract.allowance(deployer.address, account1.address)
			).to.be.equal(allowanceBefore.sub(amount));
		});

		it('should test transfer from', async () => {
			let allowanceBefore = await ftmpContract.allowance(
				deployer.address,
				account1.address
			);
			let amount = allowanceBefore.div(2);
			let balanceOfDeployerBefore = await ftmpContract.balanceOf(
				deployer.address
			);
			let balanceOfAccount1Before = await ftmpContract.balanceOf(
				account1.address
			);

			await ftmpContract
				.connect(account1)
				.transferFrom(deployer.address, account1.address, amount);

			expect(
				await ftmpContract.allowance(deployer.address, account1.address)
			).to.be.equal(allowanceBefore.sub(amount));
			expect(await ftmpContract.balanceOf(deployer.address)).to.be.equal(
				balanceOfDeployerBefore.sub(amount)
			);
			expect(await ftmpContract.balanceOf(account1.address)).to.be.equal(
				balanceOfAccount1Before.add(amount)
			);

			await exc.catchRevert(
				ftmpContract
					.connect(account1)
					.transferFrom(
						deployer.address,
						account1.address,
						amount.mul(2)
					)
			);
		});
	});

	describe('Testing FMTP...', async () => {
		it('should test transfer with from/to in whitelist', async () => {
			let balanceOfDeployerBefore = await ftmpContract.balanceOf(
				deployer.address
			);
			let amount = balanceOfDeployerBefore.div(2);
			let balanceOfAccount1Before = await ftmpContract.balanceOf(
				account1.address
			);

			await ftmpContract.transfer(account1.address, amount);

			expect(await ftmpContract.balanceOf(deployer.address)).to.be.equal(
				balanceOfDeployerBefore.sub(amount)
			);
			expect(await ftmpContract.balanceOf(account1.address)).to.be.equal(
				balanceOfAccount1Before.add(amount)
			);
		});

		it('should test transfer with from/to not in whitelist', async () => {
			let balanceOfAccount1Before = await ftmpContract.balanceOf(
				account1.address
			);
			let amount = balanceOfAccount1Before.div(2);
			let balanceOfAccount2Before = await ftmpContract.balanceOf(
				account2.address
			);

			await exc.catchWithCustomReason(
				ftmpContract
					.connect(account1)
					.transfer(account2.address, amount),
				'FMTP: Address not allowed'
			);

			expect(await ftmpContract.balanceOf(account1.address)).to.be.equal(
				balanceOfAccount1Before
			);
			expect(await ftmpContract.balanceOf(account2.address)).to.be.equal(
				balanceOfAccount2Before
			);
		});

		it('should test illegal transfer to address(0)', async () => {
			let balanceOfDeployerBefore = await ftmpContract.balanceOf(
				deployer.address
			);
			let amount = balanceOfDeployerBefore.div(2);

			await exc.catchERC20TransferToZeroAddress(
				ftmpContract.transfer(ethers.constants.AddressZero, amount)
			);

			expect(await ftmpContract.balanceOf(deployer.address)).to.be.equal(
				balanceOfDeployerBefore
			);
		});

		it('should test update FMT contract', async () => {
			// Update FMT Contract
			await ftmpContract
				.connect(deployer)
				.modifyCollectionFMT(ftmContract.address);

			expect(await ftmpContract.collectionFMT()).to.be.equal(
				ftmContract.address
			);
		});

		it('should test fund', async () => {
			let amount = await ftmContract.balanceOf(deployer.address);

			// Approve
			await ftmContract.approve(ftmpContract.address, amount);

			// Fund
			await ftmpContract.fund(amount);

			expect(await ftmContract.balanceOf(deployer.address)).to.be.equal(
				ethers.constants.Zero
			);

			expect(
				await ftmContract.balanceOf(ftmpContract.address)
			).to.be.equal(amount);

			expect(await ftmpContract.collectionFMTAmount()).to.be.equal(
				amount
			);
		});

		it('should test stop presale', async () => {
			expect(await ftmpContract.stopPresaleBlock()).to.be.equal(
				ethers.constants.Zero
			);

			// Stop Presale
			await ftmpContract.stopPresale();

			expect(await ftmpContract.stopPresaleBlock()).to.not.be.equal(
				ethers.constants.Zero
			);

			await exc.catchWithCustomReason(
				ftmpContract.stopPresale(),
				'FMTP: Presale already stopped'
			);
		});

		it('should test update FMT contract', async () => {
			// Update FMT Contract
			await ftmpContract
				.connect(deployer)
				.modifyCollectionFMT(ftmContract.address);

			expect(await ftmpContract.collectionFMT()).to.be.equal(
				ftmContract.address
			);
		});

		it('should test swap before 6 months', async () => {
			// Mine blocks (0 - 3 Months)
			const blocksHex = BigNumber.from(blocksMonthsBSC * 3).toHexString();
			await ethers.provider.send('hardhat_mine', [blocksHex]);

			// Catch Swap
			await exc.catchWithCustomReason(
				ftmpContract.connect(account1).swap(),
				'FMTP: Cannot swap before 6 months'
			);
		});

		it('should test swap between 6 months and 12 months', async () => {
			// Mine blocks (3 - 8 Months)
			const blocksHex = BigNumber.from(blocksMonthsBSC * 5).toHexString();
			await ethers.provider.send('hardhat_mine', [blocksHex]);

			let blockNumber = BigNumber.from(
				await ethers.provider.getBlockNumber()
			);
			console.log('blockNumber', blockNumber.toString());

			const stopPresaleBlock = BigNumber.from(
				await ftmpContract.stopPresaleBlock()
			);
			const lockPeriodBlocks = BigNumber.from(
				await ftmpContract.lockPeriodBlocks()
			);
			console.log(
				'stopPresaleBlock',
				stopPresaleBlock.toString(),
				'lockPeriodBlocks',
				lockPeriodBlocks.toString()
			);

			const sixMonthBlock = stopPresaleBlock.add(lockPeriodBlocks.div(2));
			expect(await ftmpContract.sixMonthBlock()).to.be.equal(
				sixMonthBlock
			);
			const twelveMonthBlock = stopPresaleBlock.add(lockPeriodBlocks);
			expect(await ftmpContract.twelveMonthBlock()).to.be.equal(
				twelveMonthBlock
			);
			console.log(
				'sixMonthBlock',
				sixMonthBlock.toString(),
				'twelveMonthBlock',
				twelveMonthBlock.toString()
			);

			const initialBalance = BigNumber.from(
				await ftmpContract.initialBalances(account1.address)
			);
			console.log('initialBalance', initialBalance.toString());

			const swappedBalanceBefore = BigNumber.from(
				await ftmpContract.swappedBalances(account1.address)
			);

			// Swap
			await ftmpContract.connect(account1).swap();

			const swappedBalanceAfter = await ftmpContract.swappedBalances(
				account1.address
			);
			console.log(
				'swappedBalanceBefore',
				swappedBalanceBefore.toString(),
				'swappedBalanceAfter',
				swappedBalanceAfter.toString()
			);

			expect(await ftmpContract.balanceOf(account1.address)).to.be.equal(
				initialBalance.sub(swappedBalanceAfter)
			);

			expect(await ftmContract.balanceOf(account1.address)).to.be.equal(
				swappedBalanceAfter
			);
		});

		it('should test swap after 12 months', async () => {
			// Mine blocks (8 - 12 Months)
			const blocksHex = BigNumber.from(blocksMonthsBSC * 4).toHexString();
			await ethers.provider.send('hardhat_mine', [blocksHex]);

			let blockNumber = BigNumber.from(
				await ethers.provider.getBlockNumber()
			);
			console.log('blockNumber', blockNumber.toString());

			const stopPresaleBlock = BigNumber.from(
				await ftmpContract.stopPresaleBlock()
			);
			const lockPeriodBlocks = BigNumber.from(
				await ftmpContract.lockPeriodBlocks()
			);
			console.log(
				'stopPresaleBlock',
				stopPresaleBlock.toString(),
				'lockPeriodBlocks',
				lockPeriodBlocks.toString()
			);

			const sixMonthBlock = stopPresaleBlock.add(lockPeriodBlocks.div(2));
			expect(await ftmpContract.sixMonthBlock()).to.be.equal(
				sixMonthBlock
			);
			const twelveMonthBlock = stopPresaleBlock.add(lockPeriodBlocks);
			expect(await ftmpContract.twelveMonthBlock()).to.be.equal(
				twelveMonthBlock
			);
			console.log(
				'sixMonthBlock',
				sixMonthBlock.toString(),
				'twelveMonthBlock',
				twelveMonthBlock.toString()
			);

			const initialBalance = BigNumber.from(
				await ftmpContract.initialBalances(account1.address)
			);
			console.log('initialBalance', initialBalance.toString());

			const swappedBalanceBefore = BigNumber.from(
				await ftmpContract.swappedBalances(account1.address)
			);

			// Swap
			await ftmpContract.connect(account1).swap();

			const swappedBalanceAfter = await ftmpContract.swappedBalances(
				account1.address
			);
			console.log(
				'swappedBalanceBefore',
				swappedBalanceBefore.toString(),
				'swappedBalanceAfter',
				swappedBalanceAfter.toString()
			);

			expect(await ftmpContract.balanceOf(account1.address)).to.be.equal(
				initialBalance.sub(swappedBalanceAfter)
			);

			expect(await ftmContract.balanceOf(account1.address)).to.be.equal(
				swappedBalanceAfter
			);

			console.log(
				'collectionFMTAmount',
				(await ftmpContract.collectionFMTAmount()).toString()
			);
		});
	});
});
