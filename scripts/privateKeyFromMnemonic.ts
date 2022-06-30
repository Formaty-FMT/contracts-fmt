import hardhat from 'hardhat';

const { run, ethers } = hardhat;

async function main(): Promise<void> {
	let MNEMONIC: any = process.env.MNEMONIC;
	let mnemonicWallet = ethers.Wallet.fromMnemonic(MNEMONIC);
	console.log(mnemonicWallet.privateKey);

}

main()
	.then(() => process.exit(0))
	.catch((error: Error) => {
		console.error(error);
		process.exit(1);
	});
