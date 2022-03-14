import { TransactionVersion } from "@stacks/transactions";
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk'
import { readFileSync } from "fs";
import { StacksChain } from "../integration/framework/stacks.chain";

const contract_name = 'current-price';

const config = read_config();

function read_config() {
    const raw_file_content = readFileSync('stacks_config.json');

    const json_config = JSON.parse(raw_file_content.toString());

    return json_config;
}

const networkEndPoint = config.node_url;
const secretKey = config.seed_phrase;

const chain = new StacksChain(networkEndPoint, {
    defaultFee: config.default_fee,
  });
const password = "testing_password";

const contract_path = `contracts/${contract_name}.clar`;
const contract_code = readFileSync(contract_path).toString();

const transaction_version = get_transaction_version(config.network_type);

function get_transaction_version(network_type): TransactionVersion {
    if (network_type === 'mainnet') {
        return TransactionVersion.Mainnet;
    } else {
        return TransactionVersion.Testnet;
    }
}

console.log(`Deploy contract: ${contract_path}`);
console.log('Parameters:');
console.log(`-- node url: ${config.node_url}`);
console.log(`-- network type: ${config.network_type}`);
console.log(`-- default fee: ${config.default_fee}`);
console.log('------');

(async () => {
    try {
        const wallet = await generateWallet({
            secretKey,
            password,
          });
        const account = wallet.accounts[0];
        const deployerAddress = getStxAddress({ account, transactionVersion: transaction_version });
        console.log("Deployer address:", deployerAddress);
        console.log("Deployer private key:", wallet.accounts[0].stxPrivateKey);

        // create contract
        const smartContractId = await chain.deployContract(
            contract_name,
            contract_code,
            wallet.accounts[0].stxPrivateKey
        );

        console.log(`Contract successfully deployed: ${smartContractId}`)
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();
