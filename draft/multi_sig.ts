import { StacksChain } from "../integration/framework/stacks.chain"
import {STACKS_API_URL} from "../integration/config"

import * as tx from "@stacks/transactions";

import * as fs from "fs"
import * as path from "path"
import { StacksNetwork, StacksTestnet } from "@stacks/network"

const utils = require('./utils');

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

    let signer = new tx.TransactionSigner(unsigned_transaction);

    // userA is signing the transaction
    signer.signOrigin(tx.createStacksPrivateKey(userA.secretKey));

    const partially_signed_transaction = signer.transaction;

    const serialized_partially_signed_transaction = partially_signed_transaction.serialize();

    // userB is signing the transaction
    const deserialized_partially_signed_transaction = tx.deserializeTransaction(serialized_partially_signed_transaction);

    signer = new tx.TransactionSigner(deserialized_partially_signed_transaction);

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

interface MultiSigContractCallManagerOptions {
    contract_address: string;
    contract_name: string;
    function_name: string;
    function_args: tx.ClarityValue[];
    network: StacksNetwork;
    anchor_mode?: tx.AnchorMode;
    num_signatures: number;
    public_keys: tx.StacksPublicKey[];
    private_keys?: string[];
    fee?: number;
    nonce?: bigint;
}

class MultiSigContractCallManager {
    private contract_address: string;
    private contract_name: string;
    private function_name: string;
    private function_args: tx.ClarityValue[];
    private network: StacksNetwork;
    private anchor_mode: tx.AnchorMode;
    private num_signatures: number;
    private public_keys: tx.StacksPublicKey[];
    private private_keys: string[];
    private fee: number;
    private nonce: bigint;
    private multi_sig_address: tx.Address;
    private transaction: tx.StacksTransaction;

    constructor(options: MultiSigContractCallManagerOptions) {
        this.contract_address = options.contract_address;
        this.contract_name = options.contract_name;
        this.function_name = options.function_name;
        this.function_args = options.function_args;
        this.network = options.network;
        this.num_signatures = options.num_signatures;
        this.public_keys = options.public_keys;

        const address_version = tx.AddressVersion.TestnetMultiSig;
        const hash_mode = tx.AddressHashMode.SerializeP2SH;
        this.multi_sig_address = tx.addressFromPublicKeys(
            address_version,
            hash_mode,
            this.public_keys.length,
            this.public_keys
        );

        this.anchor_mode = options.anchor_mode ?? tx.AnchorMode.Any;
        this.fee = options.fee ?? default_fee;
        this.nonce = options.nonce ?? BigInt(-1);
        this.private_keys = options.private_keys ?? [];
    }

    async prepare_to_broadcast() {
        if (this.nonce === BigInt(-1)) {
            this.nonce = await tx.getNonce(tx.addressToString(this.multi_sig_address), this.network);
        }

        this.transaction = await tx.makeUnsignedContractCall({
            contractAddress: this.contract_address,
            contractName: this.contract_name,
            functionName: this.function_name,
            functionArgs: this.function_args,
            network: this.network,
            anchorMode: this.anchor_mode,
            numSignatures: this.num_signatures,
            publicKeys: this.public_keys.map(pk => tx.publicKeyToString(pk)),
            fee: this.fee,
            nonce: this.nonce,
        });
    }

    sign(private_key: string) {
        this.private_keys.push(private_key);
    }

    serialize(): string {
        return JSON.stringify({
            contract_address: this.contract_address,
            contract_name: this.contract_name,
            function_name: this.function_name,
            function_args: this.function_args,
            network: this.network,
            anchor_node: this.anchor_mode,
            num_signatures: this.num_signatures,
            public_keys: this.public_keys,
            private_keys: this.private_keys,
            fee: this.fee,
            nonce: this.nonce,
        });
    }

    static deserialize(payload: string): MultiSigContractCallManager {
        const parsed_payload: MultiSigContractCallManagerOptions = JSON.parse(payload);

        return new MultiSigContractCallManager(parsed_payload);
    }

    async fund_multi_sig_address(amount: number, who: number, fee?: number): Promise<tx.TxBroadcastResult> {
        const funding_transaction = await tx.makeSTXTokenTransfer({
            recipient: tx.addressToString(this.multi_sig_address),
            amount: amount,
            senderKey: this.private_keys[who],
            network: this.network,
            fee: fee ?? default_fee,
            anchorMode: tx.AnchorMode.Any
        });

        const response = await tx.broadcastTransaction(funding_transaction, this.network);

        return response;
    }

    async broadcast_transaction(): Promise<tx.TxBroadcastResult> {
        const signer = new tx.TransactionSigner(this.transaction);

        for (const private_key of this.private_keys) {
            signer.signOrigin(tx.createStacksPrivateKey(private_key));
        }

        const signed_transaction = signer.transaction;

        const response = await tx.broadcastTransaction(signed_transaction, this.network);

        return response;
    }
}

async function test_class() {
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

    const multisig_tx_options: MultiSigContractCallManagerOptions = {
        contract_address: deployer.address,
        contract_name: contract_name,
        function_name: 'setter',
        function_args: [tx.uintCV(40)],
        network: network,
        num_signatures: tx_parts.length,
        public_keys: tx_parts.map(part => tx.pubKeyfromPrivKey(part.secretKey)),
    };

    const multi_sig_manager = new MultiSigContractCallManager(multisig_tx_options);

    // userA "signs" the transaction
    multi_sig_manager.sign(userA.secretKey);

    // mow the multi-sig manager is serialized
    const serialized_multi_sig_manager = multi_sig_manager.serialize();

    // userB receives the multi-sig manager payload. Warning: userB receives userA private key as well.

    // userB deserializes the multi-sig manager
    const deserialized_multi_sig_manager = MultiSigContractCallManager.deserialize(serialized_multi_sig_manager);

    // // userB "signs" the transaction
    // deserialized_multi_sig_manager.sign(userB.secretKey);

    // // now userB is going to broadcast the transaction

    // await deserialized_multi_sig_manager.prepare_to_broadcast();

    // const response = await deserialized_multi_sig_manager.broadcast_transaction();

    // console.log(response);
}