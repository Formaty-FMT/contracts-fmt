import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-web3';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'hardhat-abi-exporter';
import 'hardhat-spdx-license-identifier';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-docgen';

import * as dotenv from 'dotenv';

dotenv.config();
const { MNEMONIC } = process.env;
const { PRIVATE_KEY } = process.env;
const { ETHERSCAN_API_KEY } = process.env;
const { BSC_URL } = process.env;

module.exports = {
	solidity: {
		version: '0.8.13',
		settings: {
			optimizer: {
				enabled: true,
				runs: 1000,
			},
		},
	},
	networks: {
		mainnet: {
			url: 'https://bsc-dataseed.binance.org/',
			chainId: 56,
			gasPrice: 20000000000,
			accounts: [PRIVATE_KEY],
		},
		testnet: {
			url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
			chainId: 97,
			gasPrice: 20000000000,
			accounts: [PRIVATE_KEY],
		},
		localhost: {
			chainId: 31337,
			url: 'http://127.0.0.1:8545',
			accounts: [
				'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
				'0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
				'0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
			],
		},
		hardhat: {
			forking: {
				url: BSC_URL,
			},
		},
	},
	docgen: {
		pages: 'files',
	},
	etherscan: {
		apiKey: ETHERSCAN_API_KEY,
	},
	gasReporter: {
		enabled: true,
		gasPrice: 5,
	},
	abiExporter: {
		path: './data/abi',
		clear: true,
		flat: true,
		spacing: 2,
	},
	spdxLicenseIdentifier: {
		overwrite: true,
		runOnCompile: true,
	},
};
