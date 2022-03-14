import { makeContractDeploy, broadcastTransaction, AnchorMode } from "@stacks/transactions";
import { StacksTestnet, StacksMainnet } from "@stacks/network"
import { generateWallet } from '@stacks/wallet-sdk'
import { readFileSync } from "fs";

const config = read_config();

function read_config() {
    const raw_file_content = readFileSync('script_deploy_config.json');

    const json_config = JSON.parse(raw_file_content.toString());

    return json_config;
}

// sender information

const seed_phrase = config.seed_phrase;
const password = config.password;

// getting some arguments

const network_type = config.network_type;
const contract_name = config.contract_name;

// contract parameter validation

function log_and_quit(message: string, exit_code: number): void {
    console.log(message);
    process.exit(exit_code);
}

if (contract_name === '') {
    log_and_quit("contract argument should be provided", 0);
}

// network parameter

if (network_type !== 'mainnet' && network_type !== 'testnet') {
    log_and_quit("invalid network argument", 0);
}

let network_builder = StacksTestnet;
if (network_type === 'mainnet') {
    network_builder = StacksMainnet;
}

const network = new network_builder({url: config.node_url});

// getting contract source code

const contract_path = `contracts/${contract_name}.clar`;
const contract_code = readFileSync(contract_path).toString();

// performing deployment

async function deploy_contract() {
    console.log('Parameters:');
    console.log(`-- node url: ${config.node_url}`);
    console.log(`-- network type: ${config.network_type}`);
    console.log(`-- contract name: ${config.contract_name}`);

    try {
        const wallet = await generateWallet({secretKey: seed_phrase, password: password});

        const tx_options = {
            contractName: contract_name,
            codeBody: contract_code,
            senderKey: wallet.accounts[0].stxPrivateKey,
            network: network,
            anchorMode: AnchorMode.Any
        };

        const transaction = await makeContractDeploy(tx_options);

        const response = await broadcastTransaction(transaction, network);

        const tx_id = response.txid;

        log_and_quit(`contract ${contract_name} was successfully deployed.\n Transaction id: ${tx_id}`, 0);
    } catch (error) {
        log_and_quit(error.toString(), 1);
    }
}

deploy_contract();