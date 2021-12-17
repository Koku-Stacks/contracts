import { ChainID, IntegerType, TransactionVersion } from '@stacks/common';
import { StacksMainnet, StacksMocknet, StacksTestnet } from '@stacks/network';
import keychain, { decrypt, Wallet } from '@stacks/keychain';
import {
    createStacksPrivateKey,
    makeRandomPrivKey,
    getPublicKey,
    StacksPrivateKey,
    StacksPublicKey,
    makeSTXTokenTransfer,
    AnchorMode,
    broadcastTransaction,
    TxBroadcastResult
} from '@stacks/transactions';

interface RecoveryData {
    password: string,
    backup_phrase: string,
    chain_id: ChainID
}

async function generate_wallet(password: string, network: string): Promise<RecoveryData> {
    let chain_id = ChainID.Testnet;
    if (network === "mainnet") {
        chain_id = ChainID.Mainnet;
    }

    const wallet = await keychain.Wallet.generate(password, chain_id);

    const encrypted_backup_phrase = wallet.encryptedBackupPhrase;

    const plain_text_buffer = await decrypt(Buffer.from(encrypted_backup_phrase, 'hex'), password);

    const backup_phrase = plain_text_buffer.toString();

    return {password: password, backup_phrase: backup_phrase, chain_id: chain_id};
}

async function restore_wallet(data: RecoveryData): Promise<Wallet> {
    const wallet = await keychain.Wallet.restore(data.password, data.backup_phrase, data.chain_id);

    return wallet;
}

interface STXAddresses {
    mainnet: string,
    testnet: string
}

function get_stx_addresses(wallet: Wallet): STXAddresses {
    const signer = wallet.getSigner();
    const mainnet_address = signer.getSTXAddress(TransactionVersion.Mainnet);
    const testnet_address = signer.getSTXAddress(TransactionVersion.Testnet);

    return {mainnet: mainnet_address, testnet: testnet_address};
}

interface KeyPair {
    private: StacksPrivateKey,
    public: StacksPublicKey
}

// not sure if this is useful. It seems more appropriate dealing with addresses from within wallets
function create_new_principal(entropy: Buffer): KeyPair {
    const private_key = makeRandomPrivKey(entropy);
    const public_key = getPublicKey(private_key);

    return { private: private_key, public: public_key };
}

// not sure if this is useful. It seems more appropriate dealing with addresses from within wallets
function recover_principal(priv_key: string): KeyPair {
    const private_key = createStacksPrivateKey(priv_key);
    const public_key = getPublicKey(private_key);

    return { private: private_key, public: public_key };
}

type Network = StacksMainnet | StacksTestnet | StacksMocknet;

interface TransferResult {
    serialized: string,
    response: TxBroadcastResult
}

async function stx_transfer(wallet: Wallet, recipient: string, amount: IntegerType, memo: string, network: Network): Promise<TransferResult> {
    const tx_options = {
        recipient: recipient,
        amount: amount,
        senderKey: wallet.stacksPrivateKey.toString(),
        network: network,
        memo: memo,
        nonce: 0,
        fee: 0,
        anchorMode: AnchorMode.OnChainOnly
    };

    const transaction = await makeSTXTokenTransfer(tx_options);

    const serialized_tx = transaction.serialize().toString('hex');

    const broadcast_response = await broadcastTransaction(transaction, network);

    return { serialized: serialized_tx, response: broadcast_response };
}
