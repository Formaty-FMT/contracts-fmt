import hardhat from 'hardhat';

const { run, ethers } = hardhat;

async function main(): Promise<void> {
	await run('compile');
	const [deployer] = await ethers.getSigners();

	console.log('Deploying contracts with the account:', deployer.address);

	console.log('Account balance:', (await deployer.getBalance()).toString());
	const formatyOwner = "0x9f86e5e2d609A88fe1306ac20b62E7079F63D49A"

	// Deploy contract
	const contractFactory = await ethers.getContractFactory('FMT');
	const contract = await contractFactory.deploy(formatyOwner);
	console.log('Contract FMT deployed to address:', contract.address);

	// Verifying contracts
	if (
		hardhat.network.name !== 'hardhat' &&
		hardhat.network.name !== 'localhost'
	) {
		await new Promise((f) => setTimeout(f, 30000));

		await run('verify:verify', {
			address: contract.address,
			constructorArguments: [formatyOwner],
		});
	}
}

main()
	.then(() => process.exit(0))
	.catch((error: Error) => {
		console.error(error);
		process.exit(1);
	});
