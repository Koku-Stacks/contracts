import { makeContractDeploy, broadcastTransaction, AnchorMode } from "@stacks/transactions";
import { StacksTestnet, StacksMainnet } from "@stacks/network"
import { readFileSync } from "fs";

// sender key

const sender_key = "000000000000000000000000000000000000000000000000000000000000000000";

// getting some arguments

const yargs = require('yargs/yargs');
const argv = yargs(process.argv).argv;

const network_name = argv.network || "testnet";
const contract_name = argv.contract;

// argument validation

function log_and_quit(message: string, exit_code: number): void {
    console.log(message);
    process.exit(exit_code);
}

if (contract_name == null) {
    log_and_quit("contract argument should be provided", 0);
}

let network: StacksMainnet | StacksTestnet = new StacksTestnet();
if (network_name === "mainnet" || network_name === "testnet") {
    if (network_name === "mainnet") {
        network = new StacksMainnet();
    }
}
else {
    log_and_quit("invalid network argument", 0);
}

// getting contract source code

const contract_path = `contracts/${contract_name}.clar`;
const contract_code = readFileSync(contract_path).toString();

// performing deployment

const tx_options = {
    contractName: contract_name,
    codeBody: contract_code,
    senderKey: sender_key,
    network,
    anchorMode: AnchorMode.Any
};

makeContractDeploy(tx_options)
    .then((transaction): void => {
        broadcastTransaction(transaction, network)
            .then((broadcast_response): void => {
                const tx_id = broadcast_response.txid;

                log_and_quit(`contract ${contract_name} was succefully deployed.\n Transaction id: ${tx_id}`, 0);
            })
            .catch((reason): void => {
                log_and_quit(`some error has occurred when broadcasting deployment transaction of contract ${contract_name}\nReason: ${reason}`, 1)
            });
    })
    .catch((reason): void => {
        log_and_quit(`some error has occurred when preparing deployment of contract ${contract_name}\nReason: ${reason}`, 1);
    });
