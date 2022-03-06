import { stringUtf8CV, uintCV } from "@stacks/transactions";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, TRAITS_FOLDER, STACKS_API_URL } from "../config";
import { StacksChain } from "../framework/stacks.chain";

const chain = new StacksChain(STACKS_API_URL, {
  defaultFee: 100000,
});

let contractAddress: string;
const contractName = "token";
const sipContractName = "sip-010-trait-ft-standard";

describe("token contract", () => {
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

  it("Ensures the token uri facilities work as expected", async () => {
    const deployer = chain.accounts.get("deployer")!;
    const wallet2 = chain.accounts.get("wallet_2")!;

    // read the value
    const readResult = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-token-uri",
      [],
      wallet2.address
    );

    expect(readResult).to.be.ok;
    expect(readResult.success).to.be.true;

    // update the value
    const newUri = `www.token${Date.now()}.com`;

    const updateResult = await chain.callContract(
      contractAddress,
      contractName,
      "set-token-uri",
      [stringUtf8CV(newUri)],
      deployer.secretKey
    );

    expect(updateResult).to.be.ok;
    expect(updateResult.success).to.be.true;

    // read the value again
    const checkResult = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-token-uri",
      [],
      wallet2.address
    );

    expect(checkResult).to.be.ok;
    expect(checkResult.success).to.be.true;
    expect(checkResult.value.value.value).to.be.eq(newUri);

    // try to updated with wrong wallet
    const wrongUpdateResult = await chain.callContract(
      contractAddress,
      contractName,
      "set-token-uri",
      [stringUtf8CV(newUri)],
      wallet2.secretKey
    );

    expect(wrongUpdateResult).to.be.ok;
    expect(wrongUpdateResult.success).to.be.false;
    expect(wrongUpdateResult.value.value).to.be.eq("103");

    // double check that value wasn't changed
    const doubleCheckResult = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-token-uri",
      [],
      wallet2.address
    );

    expect(doubleCheckResult).to.be.ok;
    expect(doubleCheckResult.success).to.be.true;
    expect(doubleCheckResult.value.value.value).to.be.eq(newUri);
  });

  it("Ensure the constant read only functions are returning as expected", async () => {
    const deployer = chain.accounts.get("deployer")!;

    const decimals = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-decimals",
      [],
      deployer.address
    );

    expect(decimals).to.be.ok;
    expect(decimals.success).to.be.true;
    expect(decimals.value.value).to.be.eq("6");

    const symbol = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-symbol",
      [],
      deployer.address
    );

    expect(symbol).to.be.ok;
    expect(symbol.success).to.be.true;
    expect(symbol.value.value).to.be.eq("DYV");

    const name = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-name",
      [],
      deployer.address
    );

    expect(name).to.be.ok;
    expect(name.success).to.be.true;
    expect(name.value.value).to.be.eq("dYrivaNative");
  });

  it("Ensure mint and burn functions work as expected", async () => {
    const deployer = chain.accounts.get("deployer")!;
    const wallet2 = chain.accounts.get("wallet_2")!;

    // load initial data
    const initialSupply = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-total-supply",
      [],
      deployer.address
    );

    expect(initialSupply).to.be.ok;
    expect(initialSupply.success).to.be.true;

    const initialDeployerBalance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(deployer.address)],
      deployer.address
    );

    expect(initialDeployerBalance).to.be.ok;
    expect(initialDeployerBalance.success).to.be.true;

    const initialwallet2Balance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(wallet2.address)],
      wallet2.address
    );

    expect(initialwallet2Balance).to.be.ok;
    expect(initialwallet2Balance.success).to.be.true;

    // revoke authorization
    const revokeAuthorizeContract = await chain.callContract(
      contractAddress,
      contractName,
      "revoke-authorized-contract",
      [principalCV(deployer.address)],
      deployer.secretKey
    );

    expect(revokeAuthorizeContract).to.be.ok;
    expect(revokeAuthorizeContract.success).to.be.true;

    // authorize contract
    const authorizeContract = await chain.callContract(
      contractAddress,
      contractName,
      "add-authorized-contract",
      [principalCV(deployer.address)],
      deployer.secretKey
    );

    expect(authorizeContract).to.be.ok;
    expect(authorizeContract.success).to.be.true;

    // start minting
    const goodMintCall = await chain.callContract(
      contractAddress,
      contractName,
      "mint",
      [uintCV(100), principalCV(deployer.address)],
      deployer.secretKey
    );

    expect(goodMintCall).to.be.ok;
    expect(goodMintCall.success).to.be.true;

    const badMintCall = await chain.callContract(
      contractAddress,
      contractName,
      "mint",
      [uintCV(100), principalCV(wallet2.address)],
      wallet2.secretKey
    );

    expect(badMintCall).to.be.ok;
    expect(badMintCall.success).to.be.false;

    const mintCallToOtherWallet = await chain.callContract(
      contractAddress,
      contractName,
      "mint",
      [uintCV(50), principalCV(wallet2.address)],
      deployer.secretKey
    );

    expect(mintCallToOtherWallet).to.be.ok;
    expect(mintCallToOtherWallet.success).to.be.true;

    const supply = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-total-supply",
      [],
      deployer.address
    );

    expect(supply).to.be.ok;
    expect(supply.success).to.be.true;
    expect(+supply.value.value).to.be.equal(+initialSupply.value.value + 150);

    const deployerBalance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(deployer.address)],
      deployer.address
    );

    expect(deployerBalance).to.be.ok;
    expect(deployerBalance.success).to.be.true;
    expect(+deployerBalance.value.value).to.be.equal(
      +initialDeployerBalance.value.value + 100
    );

    const wallet2Balance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(wallet2.address)],
      wallet2.address
    );

    expect(wallet2Balance).to.be.ok;
    expect(wallet2Balance.success).to.be.true;
    expect(+wallet2Balance.value.value).to.be.equal(
      +initialwallet2Balance.value.value + 50
    );

    // burn
    const goodBurnCall = await chain.callContract(
      contractAddress,
      contractName,
      "burn",
      [uintCV(10)],
      deployer.secretKey
    );

    expect(goodBurnCall).to.be.ok;
    expect(goodBurnCall.success).to.be.true;

    const zeroBurnCall = await chain.callContract(
      contractAddress,
      contractName,
      "burn",
      [uintCV(0)],
      deployer.secretKey
    );

    expect(zeroBurnCall).to.be.ok;
    expect(zeroBurnCall.success).to.be.false;
    expect(zeroBurnCall.value.value).to.be.equal("1");

    // goodBurnCall.result.expectOk().expectBool(true);
    // zeroBurnCall.result.expectErr().expectUint(1);

    const updatedDeployerBalance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(deployer.address)],
      deployer.address
    );

    expect(updatedDeployerBalance).to.be.ok;
    expect(updatedDeployerBalance.success).to.be.true;
    expect(+updatedDeployerBalance.value.value).to.be.equal(
      +initialDeployerBalance.value.value + 90
    );

    const updatedwallet2Balance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(wallet2.address)],
      wallet2.address
    );

    expect(updatedwallet2Balance).to.be.ok;
    expect(updatedwallet2Balance.success).to.be.true;
    expect(+updatedwallet2Balance.value.value).to.be.equal(
      +initialwallet2Balance.value.value + 50
    );
  });
});
