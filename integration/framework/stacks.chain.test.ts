import { expect } from "chai";
import { StacksChain } from "./stacks.chain";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, STACKS_API_URL } from "../config";

const chain = new StacksChain(STACKS_API_URL, {
  defaultFee: 100000,
});

const contractName = "hello";
let contractAddress: string;

describe("stacks.chain", () => {
  before(async () => {
    await chain.loadAccounts();

    const deployer = chain.accounts.get("deployer")!;
    const contractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${contractName}.clar`),
      { encoding: "utf8" }
    );
    const contractId = await chain.deployContract(
      contractName,
      contractCode,
      deployer.secretKey
    );

    contractAddress = contractId.split(".")[0];
  });

  it("should deploy and next call the contract functions", async () => {
    const deployer = chain.accounts.get("deployer")!

    const callResult = await chain.callContract(
      contractAddress,
      contractName,
      "say-hello-world",
      [],
      deployer.secretKey
    );
    const updateResultResponse = await chain.getTransactionResponse(callResult.txid);
    expect(updateResultResponse).to.be.ok;
    expect(updateResultResponse.success).to.be.true;
  });
});
