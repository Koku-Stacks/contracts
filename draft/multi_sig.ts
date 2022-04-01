import { StacksChain } from "../integration/framework/stacks.chain"
import {STACKS_API_URL} from "../integration/config"

import * as tx from "@stacks/transactions"

import * as fs from "fs"
import * as path from "path"
import { StacksTestnet } from "@stacks/network"

const api_url = STACKS_API_URL;

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

async function test() {
    await chain.loadAccounts();

    const deployer = chain.accounts.get('deployer')!;

    await chain.deployContract(
        contract_name,
        contract_code,
        deployer.secretKey
    );

    const userA = chain.accounts.get('wallet_1')!;
    const userB = chain.accounts.get('wallet_2')!;

    const tx_parts = [userA, userB];

    const tx_parts_public_keys = tx_parts.map((part) => tx.pubKeyfromPrivKey(part.secretKey));

    const tx_parts_public_keys_str = tx_parts_public_keys.map(public_key => tx.publicKeyToString(public_key));

    const address_version = tx.AddressVersion.TestnetMultiSig;

    const hash_mode = tx.AddressHashMode.SerializeP2SH;

    const multisig_address = tx.addressFromPublicKeys(address_version, hash_mode, tx_parts.length, tx_parts_public_keys);

    const multisig_address_str = tx.addressToString(multisig_address);

    const multisig_tx_options = {
        contractAddress: deployer.address,
        contractName: contract_name,
        functionName: 'setter',
        functionArgs: [tx.uintCV(40)],
        network: network,
        anchorMode: tx.AnchorMode.Any,
        numSignatures: tx_parts.length,
        publicKeys: tx_parts_public_keys_str,
        fee: default_fee,
        nonce: await tx.getNonce(multisig_address_str, network)
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

    const funding_tx_senderA = await tx.makeSTXTokenTransfer({
        recipient: multisig_address_str,
        amount: 1000000,
        senderKey: userA.secretKey,
        network: network,
        fee: default_fee,
        anchorMode: tx.AnchorMode.Any
    });

    const response_funding_tx_senderA = await tx.broadcastTransaction(funding_tx_senderA, network);

    console.log(response_funding_tx_senderA);

    const broadcast_response = await tx.broadcastTransaction(signed_transaction, network);

    console.log(broadcast_response);
}

test();