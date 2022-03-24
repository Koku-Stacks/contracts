import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, STACKS_API_URL } from "../config";
import { StacksChain } from "../framework/stacks.chain";

const chain = new StacksChain(STACKS_API_URL, {
  defaultFee: 100000,
});

let contractAddress: string;
const helloContractName = "hello";

const enum Event {
  smart_contract_log = "smart_contract_log",
  non_fungible_token_asset = "non_fungible_token_asset",
  fungible_token_asset = "fungible_token_asset",
  stx_lock = "stx_lock",
  stx_asset = "stx_asset"
}

describe("events contract", () => {
  before(async () => {
    await chain.loadAccounts();

    const deployer = chain.accounts.get("deployer")!;

    const helloCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${helloContractName}.clar`),
      { encoding: "utf8" }
    );

    const contractId = await chain.deployContract(
      helloContractName,
      helloCode,
      deployer.secretKey
    );

    contractAddress = contractId.split(".")[0];
  });

  it("Ensures print is working", async () => {
    const deployer = chain.accounts.get("deployer")!;

    // read the value
    const readResult = await chain.callReadOnlyFn(
      contractAddress,
      helloContractName,
      "say-hello",
      [],
      deployer.address
    );

    expect(readResult).to.be.ok;
    expect(readResult.value).to.be.equal("hello world");

    // read the value
    const printCall = await chain.callContract(
      contractAddress,
      helloContractName,
      "say-hello-world",
      [],
      deployer.secretKey
    );
    const printCallResponse = await chain.getTransactionResponse(printCall.txid);
    expect(printCallResponse).to.be.ok;
    expect(printCallResponse.success).to.be.true;

    const transactionInfo = await chain.waitTransaction(printCall.txid);
    const blockInfo = await chain.searchByBlockHash(transactionInfo.block_hash);
    const blockTxns = await chain.getTxnsByBlockInfo(blockInfo, Event.smart_contract_log);
    
  });
});
