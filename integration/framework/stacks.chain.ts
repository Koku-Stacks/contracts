import { StacksTestnet } from "@stacks/network";
import {
  AddressHashMode,
  AnchorMode,
  AuthType,
  broadcastTransaction,
  callReadOnlyFunction,
  createSingleSigSpendingCondition,
  createStacksPrivateKey,
  createTransactionAuthField,
  cvToJSON,
  getAddressFromPrivateKey,
  getNonce,
  getPublicKey,
  hexToCV,
  makeContractCall,
  makeContractDeploy,
  makeSTXTokenTransfer,
  makeUnsignedContractCall,
  nextSignature,
  PostConditionMode,
  PubKeyEncoding,
  pubKeyfromPrivKey,
  publicKeyToString,
  StacksTransaction,
  TransactionSigner,
  TransactionVersion,
  UnsignedMultiSigContractCallOptions,
} from "@stacks/transactions";
import fetch from "node-fetch";
import { delay } from "./helpers";

interface Options {
  defaultFee?: number;
  logLevel: LogLevel;
  isMainnet: boolean;
}

export enum LogLevel {
  NONE = 0,
  INFO = 1,
  DEBUG = 2,
}

export class StacksChain {
  accounts: Map<string, Account> = new Map();

  private network: StacksTestnet;
  private options: Options;

  constructor(private url: string, options?: Partial<Options>) {
    this.network = new StacksTestnet({ url });

    this.options = {
      defaultFee: options?.defaultFee,
      logLevel: options?.logLevel ?? LogLevel.INFO,
      isMainnet: options?.isMainnet ?? false,
    };
  }

  async loadAccounts() {
    const items: RemoteAccount[] = await fetch(
      this.url.replace(":3999", ":5000") + "/accounts"
    ).then((x) => x.json());

    this.accounts.clear();
    items.reduce(
      (r, x) =>
        r.set(x.name, {
          secretKey: x.secretKey,
          address: getAddressFromPrivateKey(
            x.secretKey,
            this.options.isMainnet
              ? TransactionVersion.Mainnet
              : TransactionVersion.Testnet
          ),
          btcAddress: x.btcAddress ?? "",
        }),
      this.accounts
    );
  }

  async transferSTX(
    amount: number,
    recipient: string,
    senderKey: string,
    options?: {
      memo?: string;
      fee?: number;
    }
  ) {
    const { memo = "", fee } = options ?? {};

    const transaction = await makeSTXTokenTransfer({
      network: this.network,
      recipient,
      amount,
      senderKey,
      memo,
      fee: fee ?? this.options.defaultFee, // set a tx fee if you don't want the builder to estimate
      anchorMode: AnchorMode.Any,
    });

    if (this.options.logLevel >= LogLevel.INFO) {
      console.log(
        "Stacks: transferSTX",
        `recipient: ${recipient}`,
        `amount: ${amount}`
      );
    }

    return transaction;
  }

  async callReadOnlyFn(
    contractAddress: string,
    contractName: string,
    method: string,
    args: Array<any>,
    senderAddress: string
  ) {
    let readResult = await callReadOnlyFunction({
      network: this.network,
      contractAddress,
      contractName,
      functionName: method,
      functionArgs: args,
      senderAddress,
    });

    if (this.options.logLevel >= LogLevel.DEBUG) {
      console.log(
        "Stacks: transferSTX",
        `${contractAddress}.${contractName}.${method}`,
        `senderAddress: ${senderAddress}`,
        cvToJSON(readResult)
      );
    }

    return cvToJSON(readResult);
  }

  async callContract(
    contractAddress: string,
    contractName: string,
    method: string,
    args: Array<any>,
    senderSecretKey: string,
    options?: {
      fee?: number;
    }
  ) {
    const transaction = await makeContractCall({
      network: this.network,
      contractAddress,
      contractName,
      functionName: method,
      functionArgs: args,
      senderKey: senderSecretKey,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: options?.fee ?? this.options.defaultFee,
      validateWithAbi: true,
    });

    const broadcast_response = await broadcastTransaction(
      transaction,
      this.network
    );

    if (broadcast_response.error) {
      console.error(broadcast_response);
      throw new Error(broadcast_response.reason);
    }

    if (this.options.logLevel >= LogLevel.INFO) {
      const senderAddress = getAddressFromPrivateKey(
        senderSecretKey,
        this.options.isMainnet
          ? TransactionVersion.Mainnet
          : TransactionVersion.Testnet
      );

      console.log(
        "Stacks: callContract",
        `senderAddress: ${senderAddress}`,
        `${contractAddress}.${contractName}.${method}`,
        `txId: ${broadcast_response.txid}`
      );
    }

    const transactionInfo = await this.waitTransaction(broadcast_response.txid);

    return cvToJSON(hexToCV(transactionInfo.tx_result.hex));
  }

  async deployContract(
    contractName: string,
    code: string,
    senderSecretKey: string,
    options?: {
      fee?: number;
    }
  ): Promise<string> {
    try {
      const transaction = await makeContractDeploy({
        network: this.network,
        contractName,
        codeBody: code,
        senderKey: senderSecretKey,
        anchorMode: AnchorMode.Any,
        fee: options?.fee ?? this.options.defaultFee,
      });

      const broadcast_response = await broadcastTransaction(
        transaction,
        this.network
      );

      if (broadcast_response.error) {
        throw new Error(broadcast_response.reason);
      }

      if (this.options.logLevel >= LogLevel.INFO) {
        const senderAddress = getAddressFromPrivateKey(
          senderSecretKey,
          this.options.isMainnet
            ? TransactionVersion.Mainnet
            : TransactionVersion.Testnet
        );

        console.log(
          "Stacks: deployContract",
          `senderAddress: ${senderAddress}`,
          `${contractName}`,
          `txId: ${broadcast_response.txid}`
        );
      }

      const transactionInfo = await this.waitTransaction(
        broadcast_response.txid
      );

      if (this.options.logLevel >= LogLevel.INFO) {
        console.log(
          "Stacks: deployContract completed",
          `contractId: ${transactionInfo?.smart_contract?.contract_id}`
        );
      }

      return transactionInfo?.smart_contract?.contract_id;
    } catch (err) {
      if (err instanceof Error && err.message === "ContractAlreadyExists") {
        const address = getAddressFromPrivateKey(
          senderSecretKey,
          this.options.isMainnet
            ? TransactionVersion.Mainnet
            : TransactionVersion.Testnet
        );

        const contractId = `${address}.${contractName}`;

        if (this.options.logLevel >= LogLevel.INFO) {
          console.log(
            "Stacks: Skipped Deployment, Contract Already Exists",
            `contractId: ${contractId}`
          );
        }

        return contractId;
      }

      throw err;
    }
  }

  private async waitTransaction(txId: string) {
    let transactionInfo;

    do {
      await delay(500);

      transactionInfo = await fetch(`${this.url}/extended/v1/tx/${txId}`).then(
        (x) => x.json()
      );

      if (this.options.logLevel >= LogLevel.DEBUG) {
        console.log("Stacks: check transaction", transactionInfo);
      }
    } while (transactionInfo.tx_status === "pending");

    if (this.options.logLevel >= LogLevel.INFO) {
      console.log(
        "Stacks: transaction mined",
        `tx_status: ${transactionInfo.tx_status}`,
        `txId: ${txId}`
      );
    }

    return transactionInfo;
  }

  public async makeUnsignedMultiSigContractCall(
    options: UnsignedMultiSigContractCallOptions
  ): Promise<StacksTransaction> {
    try {
      options.fee = this.options.defaultFee;
      options.postConditionMode = PostConditionMode.Allow;
      options.network = this.network;
      const transaction = await makeUnsignedContractCall(options);
      return transaction;
    } catch (err) {
      throw err;
    }
  }

  public async testbroadcast(StacksTransaction: StacksTransaction, user: Account) {
    const addressHashMode = AddressHashMode.SerializeP2PKH;
    const publicKey = publicKeyToString(getPublicKey(createStacksPrivateKey(user.secretKey)));
    const nonce = await getNonce(user.address, this.network);
    const newoptions = createSingleSigSpendingCondition(
      addressHashMode,
      publicKey,
      nonce,
      StacksTransaction.auth.spendingCondition.fee
    );
    StacksTransaction.auth.spendingCondition = newoptions;
    const privKey = createStacksPrivateKey(user.secretKey);
    const signer = new TransactionSigner(StacksTransaction);
    signer.signOrigin(privKey);
    const broadcast_response = await broadcastTransaction(
      StacksTransaction,
      this.network
    );
    if (broadcast_response.error) {
      throw new Error(broadcast_response.reason);
    }
    const transactionInfo = await this.waitTransaction(
      broadcast_response.txid
    );
    return transactionInfo;
  }
}

// made the interface for signing multi-sig transactions
export class accountSigner {
  private account: Account;

  constructor(account: Account) {
    this.account = account;
  }
  public signTransaction(transaction: StacksTransaction) {
    const privKey = createStacksPrivateKey(this.account.secretKey);
    const signer = new TransactionSigner(transaction);
    const authType = AuthType.Standard;
    const nonce = 0;
    const sig1 = nextSignature(
      signer.sigHash,
      authType,
      transaction.auth.spendingCondition.fee,
      nonce,
      privKey
    ).nextSig;

    const compressed1 = privKey.data.toString("hex").endsWith("01");
    let encoding: PubKeyEncoding;
    if (compressed1) {
      encoding = PubKeyEncoding.Compressed;
    } else {
      encoding = PubKeyEncoding.Uncompressed;
    }
    const field = createTransactionAuthField(encoding, sig1);
    signer.signOrigin(privKey);
    return { field: field, signer: signer };
  }
  public getPublicKey() {
    const privateKey = createStacksPrivateKey(this.account.secretKey);
    return pubKeyfromPrivKey(privateKey.data);
  }
}

export interface Account {
  address: string;
  btcAddress: string;
  secretKey: string;
}

interface RemoteAccount {
  name: string;
  initialBalance: number;
  mnemonic: string;
  secretKey: string;
  btcAddress?: string;
}
