import { intCV } from "@stacks/transactions";
import { expect } from "chai";
import { StacksChain } from "./stacks.chain";

const chain = new StacksChain("http://localhost:3999");

describe("stacks.chain", () => {
  it("should deploy and next call the contract functions", async () => {
    const deployer = chain.accounts.get("deployer")!;

    const contractName = "hello" + Date.now().toString();

    // create contract
    const smartContractId = await chain.deployContract(
      contractName,
      ` (define-public (say-hi)
          (ok u"hello world"))

        (define-read-only (echo-number (val int))
          (ok val))

        (define-public (say-hello-world)
          (ok (print "hello world"))
        )
      `,
      deployer.secretKey
    );

    expect(smartContractId).to.be.ok;

    // call the contract
    const [contractPrincipal] = smartContractId.split(".");

    const callResult = await chain.callContract(
      contractPrincipal,
      contractName,
      "say-hi",
      [],
      "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601"
    );

    expect(callResult).to.be.ok;
    expect(callResult.success).to.be.true;
    expect(callResult.value.value).to.be.equal("hello world");

    // call readOnly function
    const readResult = await chain.callReadOnlyFn(
      contractPrincipal,
      contractName,
      "echo-number",
      [intCV(11)],
      deployer.address
    );

    expect(readResult).to.be.ok;
    expect(readResult.success).to.be.true;
    expect(readResult.value.type).to.be.equal("int");
    expect(readResult.value.value).to.be.equal("11");
  });
});
