import { StacksTestnet } from "@stacks/network";
import {
  AnchorMode,
  broadcastTransaction,
  callReadOnlyFunction,
  makeContractCall,
  makeContractDeploy,
  makeSTXTokenTransfer,
} from "@stacks/transactions";
import fetch from "node-fetch";

export class StacksChain {
  private network: StacksTestnet;

  constructor(private url: string) {
    this.network = new StacksTestnet({ url });
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
    const { memo = "", fee = 200 } = options ?? {};

    const transaction = await makeSTXTokenTransfer({
      network: this.network,
      recipient,
      amount,
      senderKey,
      memo,
      nonce: 0, // set a nonce manually if you don't want builder to fetch from a Stacks node
      fee, // set a tx fee if you don't want the builder to estimate
      anchorMode: AnchorMode.Any,
    });

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

    return readResult;
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
    const { fee = 200 } = options ?? {};

    const transaction = await makeContractCall({
      network: this.network,
      contractAddress,
      contractName,
      functionName: method,
      functionArgs: args,
      senderKey: senderSecretKey,
      anchorMode: AnchorMode.Any,
      fee,
    });

    const broadcast_response = await broadcastTransaction(
      transaction,
      this.network
    );

    console.log("call", transaction, broadcast_response);

    const transactionInfo = await fetch(
      `${this.url}/extended/v1/tx/${broadcast_response.txid}`
    ).then((x) => x.json());

    console.log("call br", transactionInfo);

    return transactionInfo;
  }

  async deployContract(
    contractName: string,
    code: string,
    senderSecretKey: string,
    options?: {
      fee?: number;
    }
  ) {
    const { fee = 200 } = options ?? {};

    const transaction = await makeContractDeploy({
      network: this.network,
      contractName,
      codeBody: code,
      senderKey: senderSecretKey,
      anchorMode: AnchorMode.Any,
      fee,
    });

    // console.log("deploy", transaction);

    const broadcast_response = await broadcastTransaction(
      transaction,
      this.network
    );

    console.log("deploy br", broadcast_response);
    let transactionInfo;

    do {
      transactionInfo = await fetch(
        `${this.url}/extended/v1/tx/${broadcast_response.txid}`
      ).then((x) => x.json());
    } while (transactionInfo.tx_status === "pending");

    if (transactionInfo.tx_status !== "success") {
      console.warn(transactionInfo);
      throw new Error(transactionInfo);
    }

    return transactionInfo?.smart_contract?.contract_id;
  }
}
