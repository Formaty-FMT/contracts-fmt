import hardhat from 'hardhat';

const { run, ethers } = hardhat;

async function main(): Promise<void> {
	await run('compile');
	const [deployer] = await ethers.getSigners();

	console.log('Deploying contracts with the account:', deployer.address);

	console.log('Account balance:', (await deployer.getBalance()).toString());

	const blocksMonthsBSC = 876581;
	const formatyOwner = "0x9f86e5e2d609A88fe1306ac20b62E7079F63D49A"
	const fmtAddress = "0xC2b00D88Ead5b091dbE84e642adb0F70cFe65725";

	// Deploy contract
	const contractFactory = await ethers.getContractFactory('FMTP');
	const contract = await contractFactory.deploy(blocksMonthsBSC*12, formatyOwner);
	console.log('Contract FMTP deployed to address:', contract.address);

	// Add fmt to contract fmtp
	let tx = await contract.modifyCollectionFMT(fmtAddress);
	await tx.wait();

	// Verifying contracts
	if (
		hardhat.network.name !== 'hardhat' &&
		hardhat.network.name !== 'localhost'
	) {
		await new Promise((f) => setTimeout(f, 30000));

		await run('verify:verify', {
			address: contract.address,
			constructorArguments: [blocksMonthsBSC*12, formatyOwner],
		});
	}
}

main()
	.then(() => process.exit(0))
	.catch((error: Error) => {
		console.error(error);
		process.exit(1);
	});
