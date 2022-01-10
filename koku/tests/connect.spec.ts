import { HIRO_TESTNET_DEFAULT, StacksTestnet } from "@stacks/network";
import {
  AnchorMode,
  broadcastTransaction,
  makeContractCall,
  makeSTXTokenTransfer,
  callReadOnlyFunction,
  estimateContractFunctionCall,
  broadcastRawTransaction,
  ClarityType,
  stringUtf8CV,
  makeContractDeploy,
} from "@stacks/transactions";
import { expect } from "chai";
import fetch from "node-fetch";
import { accounts } from "./common/accounts";
import { StacksChain } from "./common/stacks.chain";

const contractAddress = "";

const chain = new StacksChain("http://localhost:3999");

describe("test", () => {
  it("should have a valid syntax", async () => {
    const deployer = accounts.get("wallet_1")!;

    const contractName = "hello26";

    const smartContractId = await chain.deployContract(
      contractName,
      ` (define-public (say-hi)
          (ok u"hello world"))

        (define-read-only (echo-number (val int))
          (ok val))
      `,
      deployer.secretKey,
      { fee: 500 }
    );

    expect(smartContractId).to.be.ok;

    console.log("smartContractId", smartContractId);

    const callResult = await chain.callContract(
      smartContractId.split(".")[0],
      contractName,
      "say-hi",
      [],
      "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601"
    );

    console.log("call result", callResult);
  });
});
