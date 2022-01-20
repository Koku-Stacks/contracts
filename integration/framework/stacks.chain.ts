import { StacksTestnet } from "@stacks/network";
import {
  AnchorMode,
  broadcastTransaction,
  callReadOnlyFunction,
  ClarityType,
  cvToJSON,
  getAddressFromPrivateKey,
  hexToCV,
  makeContractCall,
  makeContractDeploy,
  makeSTXTokenTransfer,
  PostConditionMode,
  TransactionVersion,
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

    if (readResult.type !== ClarityType.ResponseOk) {
      throw new Error(ClarityType[readResult.type]);
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
      console.log(
        "Stacks: callContract",
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
        console.log(
          "Stacks: deployContract",
          `${contractName}`,
          `txId: ${broadcast_response.txid}`
        );
      }

      const transactionInfo = await this.waitTransaction(
        broadcast_response.txid
      );

      return transactionInfo?.smart_contract?.contract_id;
    } catch (err) {
      if (err instanceof Error && err.message === "ContractAlreadyExists") {
        const address = getAddressFromPrivateKey(
          senderSecretKey,
          this.options.isMainnet
            ? TransactionVersion.Mainnet
            : TransactionVersion.Testnet
        );

        if (this.options.logLevel >= LogLevel.INFO) {
          console.log("Stacks: Skipped Deployment, Contract Already Exists");
        }

        return `${address}.${contractName}`;
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
      console.log("Stacks: transaction mined", `txId: ${txId}`);
    }

    return transactionInfo;
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
