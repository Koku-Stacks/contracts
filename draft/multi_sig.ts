import { Account, StacksChain } from "../integration/framework/stacks.chain"
import {STACKS_API_URL} from "../integration/config"

import * as tx from "@stacks/transactions"

import * as fs from "fs"
import * as path from "path"
import { StacksTestnet } from "@stacks/network"

const api_url = STACKS_API_URL;
// const api_url = 'https://stacks-node-api.testnet.stacks.co';

import axios from 'axios'

const default_fee = 100000;

const chain = new StacksChain(api_url, {
    defaultFee: default_fee,
});

const contract_name = "dummy";
const contract_code = fs.readFileSync(
    path.join(".", `${contract_name}.clar`),
    { encoding: "utf8" }
)

const network = new StacksTestnet({url: api_url});

async function request_funds(account: Account) {
    const request_url = `${api_url}/extended/v1/faucets/stx?address=${account.address}`;

    await axios.post(request_url);
}

async function request_funds_to_all_accounts() {
    await chain.loadAccounts();

    const accounts = Array.from(chain.accounts.values());

    for (const account of accounts) {
        await request_funds(account);
    }
}

async function test() {
    // await chain.loadAccounts();

    // const deployer = chain.accounts.get('deployer')!;

    const deployer = {
        secretKey: '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601',
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        btcAddress: ''
    };

    await chain.deployContract(
        contract_name,
        contract_code,
        deployer.secretKey
    );

    // const userA = chain.accounts.get('wallet_1')!;
    // const userB = chain.accounts.get('wallet_2')!;

    const userA = {
        secretKey: '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801',
        address: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5',
        btcAddress: ''
    };

    const userB = {
        secretKey: '530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101',
        address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        btcAddress: ''
    };

    const tx_parts = [userA, userB];

    const tx_parts_public_keys = tx_parts.map((part) => tx.publicKeyToString(tx.pubKeyfromPrivKey(part.secretKey)))

    const multisig_tx_options = {
        contractAddress: deployer.address,
        contractName: contract_name,
        functionName: 'setter',
        functionArgs: [tx.uintCV(42)],
        network: network,
        anchorMode: tx.AnchorMode.Any,
        numSignatures: tx_parts.length,
        publicKeys: tx_parts_public_keys,
        fee: default_fee,
    };

    const unsigned_transaction = await tx.makeUnsignedContractCall(multisig_tx_options);

    const signer = new tx.TransactionSigner(unsigned_transaction);

    // userA is signing the transaction
    signer.signOrigin(tx.createStacksPrivateKey(userA.secretKey));
    // userB is signing the transaction
    signer.signOrigin(tx.createStacksPrivateKey(userB.secretKey));

    // // FIXME I am not testing this feature right now, as I am concerned with broadcasting a simple fully signed multi-sig tx.
    // // after meeting the numSignatures requirement, the public
    // // keys of the participants who did not sign must be appended
    // // signer.appendOrigin(...);

    const signed_transaction = signer.transaction;

    // NOTE at this point, if I go ahead and try to broadcast it, I receive a NotEnoughFunds error

    const broadcast_response = await tx.broadcastTransaction(signed_transaction, network);

    console.log(broadcast_response);
}

test();