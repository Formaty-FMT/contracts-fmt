import { expect } from 'chai';
import { BigNumber } from 'ethers';
import hardhat from 'hardhat';

import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import exc from './utils/exceptions';

const { ethers, upgrades } = hardhat;

let account1: SignerWithAddress;
let account2: SignerWithAddress;

let fmtContract: Contract;
let fmtp: Contract;

// Params fmtp
let initialSupply = ethers.utils.parseEther('15000000');
let name = 'FormatyPrivate';
let symbol = 'FMTP';
let decimals = 18;

// BSC Math: 2629743 s/month → 3 s/block → 876581 blocks/month
const blocksMonthsBSC = 876581;

let amount: BigNumber = ethers.utils.parseEther('1000');
let accounts: SignerWithAddress[];
let deployer: SignerWithAddress;

before(async function () {
	accounts = await ethers.getSigners();
	deployer = accounts[0];
	account1 = accounts[1];

	const fmtFactory = await ethers.getContractFactory('FMT');
	fmtContract = await fmtFactory.deploy(deployer.address);

	const fmtpFactory = await ethers.getContractFactory('FMTP');
	fmtp = await fmtpFactory.deploy(blocksMonthsBSC * 12, deployer.address);
});

describe('Testing FMT contract... ', async () => {
	describe('Testing access control...', async () => {});

	describe('Testing ERC20 standard...', async () => {
		it('should test name, symbol and decimals', async () => {
			expect(name).to.be.equal(await fmtp.name());
			expect(symbol).to.be.equal(await fmtp.symbol());
			expect(decimals).to.be.equal(await fmtp.decimals());
		});

		it('should test totalSupply', async () => {
			let totalSupply = await fmtp.totalSupply();
			expect(totalSupply).to.be.equal(initialSupply);
		});

		it('should test balance of deployer', async () => {
			let balanceOf = await fmtp.balanceOf(deployer.address);
			expect(balanceOf).to.be.equal(initialSupply);
		});

		it('should test transfer', async () => {
			// custom transfer - test below
		});

		it('should test approve', async () => {
			let amount = await fmtp.balanceOf(deployer.address);

			await fmtp.approve(account1.address, amount);

			expect(
				await fmtp.allowance(deployer.address, account1.address)
			).to.be.equal(amount);
		});

		it('should test increase allowance', async () => {
			let allowanceBefore = await fmtp.allowance(
				deployer.address,
				account1.address
			);
			let amount = await fmtp.balanceOf(deployer.address);

			await fmtp.increaseAllowance(account1.address, amount);

			expect(
				await fmtp.allowance(deployer.address, account1.address)
			).to.be.equal(allowanceBefore.add(amount));
		});

		it('should test decrease allowance', async () => {
			let allowanceBefore = await fmtp.allowance(
				deployer.address,
				account1.address
			);
			let amount = await fmtp.balanceOf(deployer.address);

			await fmtp.decreaseAllowance(account1.address, amount);

			expect(
				await fmtp.allowance(deployer.address, account1.address)
			).to.be.equal(allowanceBefore.sub(amount));
		});

		it('should test transfer from', async () => {
			let allowanceBefore = await fmtp.allowance(
				deployer.address,
				account1.address
			);
			let amount = allowanceBefore.div(2);
			let balanceOfDeployerBefore = await fmtp.balanceOf(
				deployer.address
			);
			let balanceOfAccount1Before = await fmtp.balanceOf(
				account1.address
			);

			await fmtp
				.connect(account1)
				.transferFrom(deployer.address, account1.address, amount);

			expect(
				await fmtp.allowance(deployer.address, account1.address)
			).to.be.equal(allowanceBefore.sub(amount));
			expect(await fmtp.balanceOf(deployer.address)).to.be.equal(
				balanceOfDeployerBefore.sub(amount)
			);
			expect(await fmtp.balanceOf(account1.address)).to.be.equal(
				balanceOfAccount1Before.add(amount)
			);

			await exc.catchRevert(
				fmtp
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
		it('should test transfer with from in whitelist', async () => {
			for (let i = 1; i < accounts.length; i++) {
				let balanceOfDeployerBefore = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerBefore = await fmtp.initialBalances(
					deployer.address
				);
				let balanceOfAccountBefore = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountBefore = await fmtp.initialBalances(
					accounts[i].address
				);

				if (i == accounts.length - 1) {
					amount = balanceOfDeployerBefore;
				}
				await fmtp.transfer(accounts[i].address, amount);

				let balanceOfDeployerAfter = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerAfter = await fmtp.initialBalances(
					deployer.address
				);
				let balanceOfAccountAfter = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountAfter = await fmtp.initialBalances(
					accounts[i].address
				);

				expect(balanceOfDeployerAfter).to.be.equal(
					balanceOfDeployerBefore.sub(amount)
				);
				expect(initialBalanceDeployerAfter).to.be.equal(
					initialBalanceDeployerBefore.sub(amount)
				);
				expect(balanceOfAccountAfter).to.be.equal(
					balanceOfAccountBefore.add(amount)
				);
				expect(initialBalanceAccountAfter).to.be.equal(
					initialBalanceAccountBefore.add(amount)
				);
			}

			console.log(
				'Balance deployer after transfer: ',
				await fmtp.balanceOf(deployer.address)
			);
		});

		it('should test catch error transfer with from not in whitelist', async () => {
			for (let i = 1; i < accounts.length; i++) {
				let balanceOfDeployerBefore = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerBefore = await fmtp.initialBalances(
					deployer.address
				);
				let balanceOfAccountBefore = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountBefore = await fmtp.initialBalances(
					accounts[i].address
				);

				await exc.catchWithCustomReason(
					fmtp
						.connect(accounts[i])
						.transfer(deployer.address, amount),
					'FMTP: Address not allowed'
				);

				let balanceOfDeployerAfter = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerAfter = await fmtp.initialBalances(
					deployer.address
				);
				let balanceOfAccountAfter = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountAfter = await fmtp.initialBalances(
					accounts[i].address
				);

				expect(balanceOfDeployerAfter).to.be.equal(
					balanceOfDeployerBefore
				);
				expect(initialBalanceDeployerAfter).to.be.equal(
					initialBalanceDeployerBefore
				);
				expect(balanceOfAccountAfter).to.be.equal(
					balanceOfAccountBefore
				);
				expect(initialBalanceAccountAfter).to.be.equal(
					initialBalanceAccountBefore
				);
			}
		});

		it('should try to swap before stopPresale', async () => {
			for (let i = 1; i < accounts.length; i++) {
				let balanceOfDeployerBefore = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerBefore = await fmtp.initialBalances(
					deployer.address
				);
				let balanceOfAccountBefore = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountBefore = await fmtp.initialBalances(
					accounts[i].address
				);

				await exc.catchWithCustomReason(
					fmtp.connect(accounts[i]).swap(),
					'FMTP: Presale is not over'
				);

				let balanceOfDeployerAfter = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerAfter = await fmtp.initialBalances(
					deployer.address
				);
				let balanceOfAccountAfter = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountAfter = await fmtp.initialBalances(
					accounts[i].address
				);

				expect(balanceOfDeployerAfter).to.be.equal(
					balanceOfDeployerBefore
				);
				expect(initialBalanceDeployerAfter).to.be.equal(
					initialBalanceDeployerBefore
				);
				expect(balanceOfAccountAfter).to.be.equal(
					balanceOfAccountBefore
				);
				expect(initialBalanceAccountAfter).to.be.equal(
					initialBalanceAccountBefore
				);
			}
		});

		let differenceBlock: number;
		let blockBeforeStopSale: number;
		it('should test catch error transfer after presale stop', async () => {
			blockBeforeStopSale = await ethers.provider.getBlockNumber();
			let tx = await fmtp.stopPresale();
			await tx.wait();

			for (let i = 1; i < accounts.length; i++) {
				let balanceOfDeployerBefore = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerBefore = await fmtp.initialBalances(
					deployer.address
				);
				let balanceOfAccountBefore = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountBefore = await fmtp.initialBalances(
					accounts[i].address
				);

				await exc.catchWithCustomReason(
					fmtp.transfer(accounts[i].address, amount),
					'FMTP: Presale is over'
				);

				let balanceOfDeployerAfter = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerAfter = await fmtp.initialBalances(
					deployer.address
				);
				let balanceOfAccountAfter = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountAfter = await fmtp.initialBalances(
					accounts[i].address
				);

				expect(balanceOfDeployerAfter).to.be.equal(
					balanceOfDeployerBefore
				);
				expect(initialBalanceDeployerAfter).to.be.equal(
					initialBalanceDeployerBefore
				);
				expect(balanceOfAccountAfter).to.be.equal(
					balanceOfAccountBefore
				);
				expect(initialBalanceAccountAfter).to.be.equal(
					initialBalanceAccountBefore
				);
			}
		});

		it('should try to swap before set collectionFMT', async () => {
			for (let i = 1; i < accounts.length; i++) {
				let swappedBalanceBefore = await fmtp.swappedBalances(
					accounts[i].address
				);
				let collectionFMTAmountBefore =
					await fmtp.collectionFMTAmount();
				let balanceOfAccountBefore = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountBefore = await fmtp.initialBalances(
					accounts[i].address
				);

				await exc.catchWithCustomReason(
					fmtp.connect(accounts[i]).swap(),
					'FMTP: No collectionFMT address set'
				);

				let balanceOfDeployerAfter = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerAfter = await fmtp.initialBalances(
					deployer.address
				);
				let swappedBalanceAfter = await fmtp.swappedBalances(
					accounts[i].address
				);
				let collectionFMTAmountAfter = await fmtp.collectionFMTAmount();

				let balanceOfAccountAfter = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountAfter = await fmtp.initialBalances(
					accounts[i].address
				);

				expect(swappedBalanceAfter).to.be.equal(swappedBalanceBefore);
				expect(collectionFMTAmountBefore).to.be.equal(
					collectionFMTAmountAfter
				);

				expect(balanceOfAccountAfter).to.be.equal(
					balanceOfAccountBefore
				);
				expect(initialBalanceAccountAfter).to.be.equal(
					initialBalanceAccountBefore
				);
			}
		});

		it('should try to fund before set collectionFMT ', async () => {
			let balanceFMTBefore = await fmtContract.balanceOf(
				deployer.address
			);

			// approve fmt
			let tx = await fmtContract.approve(
				fmtp.address,
				ethers.constants.MaxUint256
			);
			await tx.wait();

			await exc.catchWithCustomReason(
				fmtp.fund(initialSupply),
				'FMTP: No collectionFMT address set'
			);
			let balanceFMTAfter = await fmtContract.balanceOf(deployer.address);

			expect(balanceFMTAfter).to.be.equal(balanceFMTBefore);
		});

		it('should try to set collectionFMT', async () => {
			let tx = await fmtp.modifyCollectionFMT(fmtContract.address);
			await tx.wait();

			expect(await fmtp.collectionFMT()).to.be.equal(fmtContract.address);
		});

		it('should try to swap before sixMonthBlock', async () => {
			for (let i = 1; i < accounts.length; i++) {
				let swappedBalanceBefore = await fmtp.swappedBalances(
					accounts[i].address
				);
				let collectionFMTAmountBefore =
					await fmtp.collectionFMTAmount();
				let balanceOfAccountBefore = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountBefore = await fmtp.initialBalances(
					accounts[i].address
				);

				await exc.catchWithCustomReason(
					fmtp.connect(accounts[i]).swap(),
					'FMTP: Cannot swap before 6 months'
				);

				let balanceOfDeployerAfter = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerAfter = await fmtp.initialBalances(
					deployer.address
				);
				let swappedBalanceAfter = await fmtp.swappedBalances(
					accounts[i].address
				);
				let collectionFMTAmountAfter = await fmtp.collectionFMTAmount();

				let balanceOfAccountAfter = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountAfter = await fmtp.initialBalances(
					accounts[i].address
				);

				expect(swappedBalanceAfter).to.be.equal(swappedBalanceBefore);
				expect(collectionFMTAmountBefore).to.be.equal(
					collectionFMTAmountAfter
				);

				expect(balanceOfAccountAfter).to.be.equal(
					balanceOfAccountBefore
				);
				expect(initialBalanceAccountAfter).to.be.equal(
					initialBalanceAccountBefore
				);
			}
		});

		it('should mint 6 month block -1', async () => {
			let blockBefore = await ethers.provider.getBlockNumber();

			differenceBlock = blockBefore - blockBeforeStopSale;
			// Mine blocks (0 - 6 Months)
			const blockToMint = blocksMonthsBSC * 6 - differenceBlock + 1;
			const hexStripZeros = ethers.utils.hexStripZeros(
				ethers.utils.hexlify(blockToMint)
			);

			await ethers.provider.send('hardhat_mine', [hexStripZeros, '0x3c']);

			let blockAfter = await ethers.provider.getBlockNumber();

			expect(blockAfter).to.be.equal(blockBefore + blockToMint);
			expect(blockAfter).to.be.equal(await fmtp.sixMonthBlock());
		});

		it('should try to swap before fund', async () => {
			for (let i = 1; i < accounts.length; i++) {
				let swappedBalanceBefore = await fmtp.swappedBalances(
					accounts[i].address
				);
				let collectionFMTAmountBefore =
					await fmtp.collectionFMTAmount();
				let balanceOfAccountBefore = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountBefore = await fmtp.initialBalances(
					accounts[i].address
				);

				await exc.catchWithCustomReason(
					fmtp.connect(accounts[i]).swap(),
					'FMTP: Funds are empty'
				);

				let balanceOfDeployerAfter = await fmtp.balanceOf(
					deployer.address
				);
				let initialBalanceDeployerAfter = await fmtp.initialBalances(
					deployer.address
				);
				let swappedBalanceAfter = await fmtp.swappedBalances(
					accounts[i].address
				);
				let collectionFMTAmountAfter = await fmtp.collectionFMTAmount();

				let balanceOfAccountAfter = await fmtp.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountAfter = await fmtp.initialBalances(
					accounts[i].address
				);

				expect(swappedBalanceAfter).to.be.equal(swappedBalanceBefore);
				expect(collectionFMTAmountBefore).to.be.equal(
					collectionFMTAmountAfter
				);

				expect(balanceOfAccountAfter).to.be.equal(
					balanceOfAccountBefore
				);
				expect(initialBalanceAccountAfter).to.be.equal(
					initialBalanceAccountBefore
				);
			}
		});

		it('should try to fund ', async () => {
			let balanceFMTBefore = await fmtContract.balanceOf(
				deployer.address
			);

			// approve fmt
			let tx = await fmtContract.approve(
				fmtp.address,
				ethers.constants.MaxUint256
			);
			await tx.wait();

			tx = await fmtp.fund(initialSupply);
			await tx.wait();
			let balanceFMTAfter = await fmtContract.balanceOf(deployer.address);

			expect(balanceFMTAfter).to.be.equal(
				balanceFMTBefore.sub(initialSupply)
			);
			expect(await fmtp.collectionFMTAmount()).to.be.equal(initialSupply);
		});

		it('should mint 1 month block', async () => {
			let sixMonthBlock = await fmtp.sixMonthBlock();
			let actualBlock = await ethers.provider.getBlockNumber();
			let blockToReward = actualBlock - sixMonthBlock;
			let blockToMint = blocksMonthsBSC - blockToReward;
			blockToReward = blocksMonthsBSC;
			console.log('Block to reward: ', blockToReward);

			// Mine blocks (0 - 6 Months)
			const hexStripZeros = ethers.utils.hexStripZeros(
				ethers.utils.hexlify(blockToMint)
			);

			await ethers.provider.send('hardhat_mine', [hexStripZeros, '0x3c']);

			let blockAfter = await ethers.provider.getBlockNumber();

			console.log('Block to reward: ', blockAfter - sixMonthBlock);
		});

		it('should mint 2 month block', async () => {
			// Mine blocks (0 - 6 Months)
			const hexStripZeros = ethers.utils.hexStripZeros(
				ethers.utils.hexlify(blocksMonthsBSC * 2)
			);

			await ethers.provider.send('hardhat_mine', [hexStripZeros, '0x3c']);
		});

		it('should try to swap', async () => {
			let sixMonthBlock = await fmtp.sixMonthBlock();
			let actualBlock = await ethers.provider.getBlockNumber();

			console.log('Block to reward: ', actualBlock - sixMonthBlock);

			for (let i = 1; i < accounts.length; i++) {
				console.log('\nAccount index : ', i);
				let swappedBalanceBefore: BigNumber =
					await fmtp.swappedBalances(accounts[i].address);
				console.log(
					'Swapped balance before: ',
					ethers.utils.formatEther(swappedBalanceBefore)
				);
				let collectionFMTAmountBefore =
					await fmtp.collectionFMTAmount();
				let totalSupplyFMTPBefore = await fmtp.totalSupply();

				let balanceOfFmtpAccountBefore = await fmtp.balanceOf(
					accounts[i].address
				);
				let balanceOfFmtAccountBefore = await fmtContract.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountBefore = await fmtp.initialBalances(
					accounts[i].address
				);
				console.log(
					'Initial balance: ',
					ethers.utils.formatEther(initialBalanceAccountBefore)
				);

				let blockNumber = await ethers.provider.getBlockNumber();
				let expectedAmountSwap = await fmtp.calculateAmountSwap(
					accounts[i].address,
					blockNumber + 1
				);
				console.log(
					'Expected amount swap: ',
					ethers.utils.formatEther(expectedAmountSwap)
				);

				let tx = await fmtp.connect(accounts[i]).swap();
				await tx.wait();

				let swappedBalanceAfter = await fmtp.swappedBalances(
					accounts[i].address
				);
				console.log(
					'Swapped balance after: ',
					ethers.utils.formatEther(swappedBalanceAfter)
				);
				let collectionFMTAmountAfter = await fmtp.collectionFMTAmount();
				let totalSupplyFMTPAfter = await fmtp.totalSupply();

				let balanceOfFmtpAccountAfter = await fmtp.balanceOf(
					accounts[i].address
				);
				let balanceOfFmtAccountAfter = await fmtContract.balanceOf(
					accounts[i].address
				);
				let initialBalanceAccountAfter = await fmtp.initialBalances(
					accounts[i].address
				);

				expect(swappedBalanceAfter).to.be.equal(
					swappedBalanceBefore.add(expectedAmountSwap)
				);
				expect(collectionFMTAmountAfter).to.be.equal(
					collectionFMTAmountBefore.sub(expectedAmountSwap)
				);
				expect(totalSupplyFMTPAfter).to.be.equal(
					totalSupplyFMTPBefore.sub(expectedAmountSwap)
				);

				expect(balanceOfFmtpAccountAfter).to.be.equal(
					balanceOfFmtpAccountBefore.sub(expectedAmountSwap)
				);
				expect(balanceOfFmtAccountAfter).to.be.equal(
					balanceOfFmtAccountBefore.add(expectedAmountSwap)
				);
				expect(initialBalanceAccountAfter).to.be.equal(
					initialBalanceAccountBefore
				);
			}
			let totalSupplyFMTPAfter = await fmtp.totalSupply();
			console.log(
				'Supply after all: ',
				ethers.utils.formatEther(totalSupplyFMTPAfter)
			);

			let swappedBalanceTotal = await fmtp.swappedBalancesTotal();
			console.log(
				'Swapped balance total: ',
				ethers.utils.formatEther(swappedBalanceTotal)
			);

			let collectionFMTAmountAfter = await fmtp.collectionFMTAmount();
			console.log(
				'Fmt available: ',
				ethers.utils.formatEther(collectionFMTAmountAfter)
			);
		});
	});
});
