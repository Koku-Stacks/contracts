import { noneCV, uintCV } from "@stacks/transactions";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, TRAITS_FOLDER, STACKS_API_URL } from "../config";
import { StacksChain } from "dy-finance.lib";

const chain = new StacksChain(STACKS_API_URL, {
  defaultFee: 100000,
});

let contractAddress: string;
const contractName = "vault";
const sipContractName = "sip-010-trait-ft-standard";
const ownerTrait = "owner-trait";

describe("vault contract", () => {
  before(async () => {
    await chain.loadAccounts();

    const deployer = chain.accounts.get("deployer")!;

    const sipContractCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${sipContractName}.clar`),
      { encoding: "utf8" }
    );

    const ownerTraitCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${ownerTrait}.clar`),
      { encoding: "utf8" }
    );

    const contractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${contractName}.clar`),
      { encoding: "utf8" }
    );

    await chain.deployContract(
      sipContractName,
      sipContractCode,
      deployer.secretKey
    );

    await chain.deployContract(
      ownerTrait,
      ownerTraitCode,
      deployer.secretKey
    );

    const contractId = await chain.deployContract(
      contractName,
      contractCode,
      deployer.secretKey
    );

    contractAddress = contractId.split(".")[0];
  });

  it("deposit", async () => {
    const deployer = chain.accounts.get("deployer")!;
    const userA = chain.accounts.get("wallet_1")!;
    const token = `${contractAddress}.usda`;
    const vault = `${contractAddress}.vault`;
    const depositAmount = 1000;

    const balanceBefore = await chain.callReadOnlyFn(
      contractAddress,
      "usda",
      "get-balance",
      [principalCV(userA.address)],
      userA.address
    );

    const balanceVaultBefore = await chain.callReadOnlyFn(
      contractAddress,
      "usda",
      "get-balance",
      [principalCV(vault)],
      vault
    );

    await chain.callContract(
      deployer.address,
      contractName,
      "deposit",
      [principalCV(token), uintCV(depositAmount), noneCV()],
      userA.secretKey
    );

    const balanceAfter = await chain.callReadOnlyFn(
      contractAddress,
      "usda",
      "get-balance",
      [principalCV(userA.address)],
      userA.address
    );

    const balanceVaultAfter = await chain.callReadOnlyFn(
      contractAddress,
      "usda",
      "get-balance",
      [principalCV(vault)],
      vault
    );

    expect(+balanceBefore.value.value).to.be.equal(+balanceAfter.value.value + depositAmount);
    expect(+balanceVaultBefore.value.value + depositAmount).to.be.equal(+balanceVaultAfter.value.value);
  });
});
