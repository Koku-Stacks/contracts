import { StacksTestnet } from "@stacks/network";
import {
  AnchorMode,
  broadcastTransaction,
  callReadOnlyFunction,
  ClarityType,
  cvToJSON,
  hexToCV,
  makeContractCall,
  makeContractDeploy,
  makeSTXTokenTransfer,
  PostConditionMode,
} from "@stacks/transactions";
import fetch from "node-fetch";
import { delay } from "./helpers";

export class StacksChain {
  private network: StacksTestnet;
  private options: { defaultFee: number };

  constructor(private url: string, options?: { defaultFee?: number }) {
    this.network = new StacksTestnet({ url });

    this.options = {
      defaultFee: options?.defaultFee ?? 500,
    };
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

    const transactionInfo = await this.waitTransaction(broadcast_response.txid);

    return transactionInfo?.smart_contract?.contract_id;
  }

  private async waitTransaction(txId: string) {
    let transactionInfo;

    do {
      await delay(500);

      transactionInfo = await fetch(`${this.url}/extended/v1/tx/${txId}`).then(
        (x) => x.json()
      );
    } while (transactionInfo.tx_status === "pending");

    return transactionInfo;
  }
}
