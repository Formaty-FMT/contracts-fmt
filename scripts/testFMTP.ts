import { BigNumber } from 'ethers';
import hardhat from 'hardhat';

import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

const { run, ethers } = hardhat;

// BSC Math: 2629743 s/month → 3 s/block → 876581 blocks/month
//const blocksMonthsBSC = 876581; // mainnet
const blocksMonthsBSC = 1000; // testnet
let fmt: Contract;
let fmtp: Contract;
let deployer: SignerWithAddress,
	acc1: SignerWithAddress,
	acc2: SignerWithAddress,
	acc3: SignerWithAddress,
	acc4: SignerWithAddress,
	acc5: SignerWithAddress,
	acc6: SignerWithAddress,
	acc7: SignerWithAddress,
	acc8: SignerWithAddress,
	acc9: SignerWithAddress,
	acc10: SignerWithAddress;

async function main(): Promise<void> {
	await run('compile');
	[deployer, acc1, acc2, acc3, acc4, acc5, acc6, acc7, acc8, acc9, acc10] =
		await ethers.getSigners();

	console.log('Deploying contracts with the account:', deployer.address);

	console.log('Account balance:', (await deployer.getBalance()).toString());
}

async function deployFMT(): Promise<void> {
	// Deploy contract
	const contractFactory = await ethers.getContractFactory('FMT');
	fmt = await contractFactory.deploy();
	console.log('Contract FMT deployed to address:', fmt.address);

	// Verifying contracts
	if (
		hardhat.network.name !== 'hardhat' &&
		hardhat.network.name !== 'localhost'
	) {
		await new Promise((f) => setTimeout(f, 5000));

		await run('verify:verify', {
			address: fmt.address,
			constructorArguments: [],
		});
	}
}

async function deployFMTP(): Promise<void> {
	// Deploy contract
	const contractFactory = await ethers.getContractFactory('FMTP');
	fmtp = await contractFactory.deploy(blocksMonthsBSC * 12);
	console.log('Contract FMTP deployed to address:', fmtp.address);

	// Verifying contracts
	if (
		hardhat.network.name !== 'hardhat' &&
		hardhat.network.name !== 'localhost'
	) {
		await new Promise((f) => setTimeout(f, 5000));

		await run('verify:verify', {
			address: fmtp.address,
			constructorArguments: [blocksMonthsBSC * 12],
		});
	}
}

async function setupFMTP(): Promise<void> {
	let tx = await fmtp.modifyCollectionFMT(fmt.address);
	await tx.wait();
	console.log('Collection FMT set in FMTP');
}

async function transferFMT(): Promise<void> {
	let amount = ethers.utils.parseEther('1000');
	let tx = await fmtp.transfer(acc1.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc1.address
	);
	tx = await fmtp.transfer(acc2.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc2.address
	);
	tx = await fmtp.transfer(acc3.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc3.address
	);
	tx = await fmtp.transfer(acc4.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc4.address
	);
	tx = await fmtp.transfer(acc5.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc5.address
	);
	tx = await fmtp.transfer(acc6.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc6.address
	);
	tx = await fmtp.transfer(acc7.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc7.address
	);
	tx = await fmtp.transfer(acc8.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc8.address
	);
	tx = await fmtp.transfer(acc9.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc9.address
	);
	tx = await fmtp.transfer(acc10.address, amount);
	await tx.wait();
	console.log(
		'Transfer amount ',
		ethers.utils.formatEther(amount),
		' to ',
		acc10.address
	);
}

async function stopPresale(): Promise<void> {
	let tx = await fmtp.stopPresale();
	await tx.wait();
	console.log('Presale stopped');
}

async function goToBlockNumber(): Promise<void> {
	console.log('BlockNumber before: ', await ethers.provider.getBlockNumber());
	const blocksHex = BigNumber.from(blocksMonthsBSC).toHexString();
	console.log({ blocksHex });
	await ethers.provider.send('hardhat_mine', [blocksHex]);

	console.log('BlockNumber after: ', await ethers.provider.getBlockNumber());
}

main()
	.then(async () => {
		await deployFMT();
		await deployFMTP();
		await setupFMTP();
		await transferFMT();
		await stopPresale();
		await goToBlockNumber();
		process.exit(0);
	})
	.catch((error: Error) => {
		console.error(error);
		process.exit(1);
	});
