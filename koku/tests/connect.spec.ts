import { expect } from "chai";
import { accounts } from "./common/accounts";
import { delay } from "./common/helpers";
import { StacksChain } from "./common/stacks.chain";

const chain = new StacksChain("http://localhost:3999");

describe("contract test", () => {
  it("should deploy and next call the contract", async () => {
    const deployer = accounts.get("deployer")!;

    const contractName = "hello" + Date.now().toString();

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

    // const smartContractId =
    //   "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.hello1641817558867";

    // await delay(1000);

    // console.log("smartContractId", smartContractId);

    // const callResult = await chain.callContract(
    //   smartContractId.split(".")[0],
    //   smartContractId.split(".")[1],
    //   "say-hi",
    //   [],
    //   "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601"
    // );

    // console.log("call result", callResult);
  });
});
