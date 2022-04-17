import { StacksTestnet } from "@stacks/network";
import {
  AnchorMode,
  broadcastTransaction,
  callReadOnlyFunction,
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
import * as fs from "fs";
const https = require("http");
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

export enum Event {
  smart_contract_log = "smart_contract_log",
  non_fungible_token_asset = "non_fungible_token_asset",
  fungible_token_asset = "fungible_token_asset",
  stx_lock = "stx_lock",
  stx_asset = "stx_asset",
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
    return broadcast_response;
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
  public async getTransactionResponse(txid: string) {
    const transactionInfo = await this.waitTransaction(txid);
    return cvToJSON(hexToCV(transactionInfo.tx_result.hex));
  }
  public async getTransactionEvents(txid: string, event_type: string) {
    const transactionInfo = await this.waitTransaction(txid);
    const filteredEvents = transactionInfo.events.filter((event: any) => {
      if (event.event_type == event_type) {
        return event;
      }
    });
    return filteredEvents;
  }

  public async getTransactionEventsByTx(txid: string, event_type: string) {
    let transactionInfo = await fetch(
      `${this.url}/extended/v1/tx/${txid}`
    ).then((x) => x.json());
    const filteredEvents = transactionInfo.events.filter((event: any) => {
      if (event.event_type == event_type) {
        return event;
      }
    });
    return filteredEvents;
  }

  public async getTxnsByBlockInfo(blockInfo: any, event_type: string) {
    let blockTxnEvents = [];
    const length = blockInfo.result.metadata.txs.length;
    let threads = Array(length);
    for (let i = 0; i < length; i++) {
      threads[i] = this.getTransactionEventsByTx(
        blockInfo.result.metadata.txs[i],
        event_type
      );
    }
    const allThreads = await Promise.all(threads);
    blockTxnEvents = allThreads.filter((thread) => {
      if (thread.length > 0) {
        return thread;
      }
    });
    return blockTxnEvents;
  }

  public async searchByBlockHash(blockHash: string) {
    let blockInfo;
    try {
      blockInfo = await fetch(
        `${this.url}/extended/v1/search/${blockHash}?include_metadata=true`
      ).then((x) => x.json());
      if (this.options.logLevel >= LogLevel.DEBUG) {
        console.log("Stacks: checking block hash", blockInfo);
      }

      if (this.options.logLevel >= LogLevel.INFO) {
        console.log(
          "Stacks: block hash " + (blockInfo.found ? "Found" : "NotFound")
        );
      }
    } catch (err) {
      console.log(err);
    }
    return blockInfo;
  }
  public async waitTransaction(txId: string) {
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

  public async createEventStreamFiles(contract_id: string) {
    const limit = 50; // max limit should <= 50 as per API call
    let offset = 0;
    // we can also store all the other events in sperate files
    const fungible_token_stream = fs.createWriteStream("ft_streams.txt", {
      flags: "a",
    });
    const block_hash_stream = fs.createWriteStream("block-hashes_streams.txt", {
      flags: "a",
    });

    const fetchTransaction = async (): Promise<number> => {
      const url = `http://3.64.221.107:3999/extended/v1/address/${contract_id}/transactions?limit=${limit}&offset=${offset}`;
      return new Promise<number>((resolve) => {
        https.get(url, (res: any) => {
          res.setEncoding("utf8");
          let body = "";
          res.on("data", (data: string) => {
            body += data;
          });
          res.on("end", async () => {
            let api_res = JSON.parse(body);
            const total = api_res["total"]; // for testing one can hardcode upto 10 - 50 for all transactions otherwise it will take more time
            let fetchedTransactions = api_res["results"];
            let blocks = Array(fetchedTransactions.length);
            for (let i = 0; i < fetchedTransactions.length; i++) {
              const block_hash = fetchedTransactions[i].block_hash;
              blocks[i] = this.searchByBlockHash(block_hash).then(
                (blockInfo) => {
                  block_hash_stream.write(JSON.stringify(blockInfo) + "\n");
                  // logic for storing by event type
                  this.getTxnsByBlockInfo(
                    blockInfo,
                    Event.fungible_token_asset
                  ).then((ft_blockTxns) => {
                    if (ft_blockTxns.length > 0) {
                      fungible_token_stream.write(
                        JSON.stringify(ft_blockTxns[0]) + "\n"
                      );
                    }
                  });
                }
              );
            }
            await Promise.all(blocks);
            resolve(total);
          });
        });
      });
    };

    const total: number = await fetchTransaction();

    if (total > limit) {
      offset += limit;

      while (offset < total) {
        await fetchTransaction();
        offset += limit;
      }
    }
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
