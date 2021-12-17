import { ChainID } from "@stacks/common"
import { StacksTestnet } from "@stacks/network"
import { AnchorMode, broadcastTransaction, callReadOnlyFunction, ClarityValue, IntCV, intCV, makeContractCall, makeContractDeploy } from "@stacks/transactions"
import { generateWallet } from '@stacks/wallet-sdk'

const seed_phrase = "elevator outdoor lava twelve knock illegal belt sound prize build brand trigger desk subway shallow boil pistol rail gauge relief similar advice angry license"

const password = "testing_password";

const chain_id = ChainID.Testnet;

const contract_code =
    `(define-public (say-hi)
   (ok u"hello world"))

 (define-read-only (echo-number (val int))
   (ok val))`

const contract_name = "testing"

const network = new StacksTestnet();

function log(message: string) {
    console.log(`--- ${message}`);
}

async function sample_contract_deploy() {
    log("recovering wallet");

    const wallet = await generateWallet({
        secretKey: seed_phrase,
        password: password
    });

    log("wallet recovered");

    const tx_options = {
        contractName: contract_name,
        codeBody: contract_code,
        senderKey: wallet.accounts[0].stxPrivateKey,
        network: network,
        anchorMode: AnchorMode.Any
    };

    log("building contract deployment transaction");

    const transaction = await makeContractDeploy(tx_options);

    log("contract deployment transaction built");

    log("broadcasting transaction");

    const broadcast_response = await broadcastTransaction(transaction, network);

    log("transaction broadcasted");

    const tx_id = broadcast_response.txid;

    log(`transaction id: ${tx_id}`);
}

async function contract_call() {
    log("recovering wallet");

    const wallet = await generateWallet({
        secretKey: seed_phrase,
        password: password
    });

    log("wallet recovered");

    const tx_options = {
        contractAddress: 'ST2MS242NQPHMPNQRJ5YZDZQZQDVBBC14J8XM3JT7',
        contractName: 'testing',
        functionName: 'say-hi',
        functionArgs: [],
        senderKey: wallet.accounts[0].stxPrivateKey,
        validateWithAbi: true,
        network: network,
        anchorMode: AnchorMode.Any
    };

    log("building contract call transaction");

    const transaction = await makeContractCall(tx_options);

    log("contract call transaction built");

    log("broadcasting transaction");

    const broadcast_response = await broadcastTransaction(transaction, network);

    log("transaction broadcasted");

    const tx_id = broadcast_response.txid;

    log(`transaction id: ${tx_id}`);
}

async function read_only_call() {
    log("recovering wallet");

    const wallet = await generateWallet({
        secretKey: seed_phrase,
        password: password
    });

    log("wallet recovered");

    const options = {
        contractAddress: 'ST2MS242NQPHMPNQRJ5YZDZQZQDVBBC14J8XM3JT7',
        contractName: 'testing',
        functionName: 'echo-number',
        functionArgs: [intCV(10)],
        network: network,
        senderAddress: 'ST2MS242NQPHMPNQRJ5YZDZQZQDVBBC14J8XM3JT7'
    };

    log("calling read-only function");

    const result: ClarityValue = await callReadOnlyFunction(options)

    log("read0only function returned a result");

    log(`result type: ${result.type}; result value: ${(result as IntCV).value}`);

    return result;
}
