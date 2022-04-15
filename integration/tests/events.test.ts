import { uintCV } from "@stacks/transactions";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, STACKS_API_URL, TRAITS_FOLDER } from "../config";
import { StacksChain } from "../framework/stacks.chain";

const chain = new StacksChain(STACKS_API_URL, {
  defaultFee: 100000,
});

let contractAddress: string;
const contractName = "token";
const sipContractName = "sip-010-trait-ft-standard";

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

    const sipContractCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${sipContractName}.clar`),
      { encoding: "utf8" }
    );

    const contractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${contractName}.clar`),
      { encoding: "utf8" }
    );

    // deploy the dependency contract first
    await chain.deployContract(
      sipContractName,
      sipContractCode,
      deployer.secretKey
    );

    const contractId = await chain.deployContract(
      contractName,
      contractCode,
      deployer.secretKey
    );

    contractAddress = contractId.split(".")[0];
  });

  it("Ensures print is working", async () => {
    const deployer = chain.accounts.get("deployer")!;

    // // read the value
    // const printCall = await chain.callContract(
    //   contractAddress,
    //   contractName,
    //   "mint",
    //   [uintCV(50), principalCV(deployer.address)],
    //   deployer.secretKey
    // );
    // const printCallResponse = await chain.getTransactionResponse(printCall.txid);
    // expect(printCallResponse).to.be.ok;
    // expect(printCallResponse.success).to.be.true;

    // const transactionInfo = await chain.waitTransaction(printCall.txid);
    // const blockInfo = await chain.searchByBlockHash(transactionInfo.block_hash);
    // expect(blockInfo.found).to.be.equal(true);

    // const blockTxns = await chain.getTxnsByBlockInfo(blockInfo, Event.fungible_token_asset);
    // expect(blockTxns.length).to.be.greaterThan(0);
    // console.log(blockTxns);

    const transactions = await chain.createEventStreamFiles(contractAddress+"."+contractName);
    console.log(transactions);
  });
});
