import { uintCV } from "@stacks/transactions";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, TRAITS_FOLDER, STACKS_API_URL } from "../config";
import { StacksChain } from "dy-finance.lib";
const POSITION_UPDATE_COOLDOWN = 600000; // ms

describe("futures position", () => {
  const chain = new StacksChain(STACKS_API_URL, {
    defaultFee: 100000,
  });

  let contractAddress: string;
  const sipContractName = "sip-010-trait-ft-standard";
  const burnTrait = "burn-trait";
  const mintTrait = "mint-trait";
  const ownerTrait = "owner-trait";
  const tokenContractName = "token";
  const futuresMarketContractName = "futures-market";

  before(async () => {
    await chain.loadAccounts();

    const deployer = chain.accounts.get("deployer")!;

    const sipContractCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${sipContractName}.clar`),
      { encoding: "utf8" }
    );

    const burnTraitCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${burnTrait}.clar`),
      { encoding: "utf8" }
    );

    const ownerTraitCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${ownerTrait}.clar`),
      { encoding: "utf8" }
    );

    const mintTraitCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${mintTrait}.clar`),
      { encoding: "utf8" }
    );

    const tokenContractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${tokenContractName}.clar`),
      { encoding: "utf8" }
    );

    const futuresMarketContractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${futuresMarketContractName}.clar`),
      { encoding: "utf8" }
    );

    // deploy the dependency contract first
    await chain.deployContract(
      sipContractName,
      sipContractCode,
      deployer.secretKey
    );

    await chain.deployContract(burnTrait, burnTraitCode, deployer.secretKey);

    await chain.deployContract(mintTrait, mintTraitCode, deployer.secretKey);

    await chain.deployContract(ownerTrait, ownerTraitCode, deployer.secretKey);

    await chain.deployContract(tokenContractName, tokenContractCode, deployer.secretKey);

    const contractId = await chain.deployContract(
      futuresMarketContractName,
      futuresMarketContractCode,
      deployer.secretKey
    );

    contractAddress = contractId.split(".")[0];
  });

  it("batch position maintanence", async () => {
    const userA = chain.accounts.get("wallet_1")!;
    const userB = chain.accounts.get("wallet_2")!;
    const deployer = chain.accounts.get("deployer")!;
    const amount_to_mint = 10000;
    const INDEX_CHUNK_SIZE = 20;
    const positions_to_open = INDEX_CHUNK_SIZE;
    const ORDER_TYPE_LONG = 1;

    // initialize contract
    await chain.callContract(
      contractAddress,
      futuresMarketContractName,
      "initialize",
      [principalCV(`${deployer.address}.${tokenContractName}`)],
      deployer.secretKey
    );

    //mint token for accounts
    await chain.callContract(
      deployer.address,
      tokenContractName,
      "add-authorized-contract",
      [principalCV(deployer.address)],
      deployer.secretKey
    );

    const account_principals = Array.from(chain.accounts.values()).map(
      (account) => account.address
    );

    for (const principal_str of account_principals) {
      const balanceBefore = await chain.callReadOnlyFn(
        deployer.address,
        tokenContractName,
        "get-balance",
        [principalCV(principal_str)],
        principal_str
      );

      await chain.callContract(
        deployer.address,
        tokenContractName,
        "mint",
        [uintCV(amount_to_mint), principalCV(principal_str)],
        deployer.secretKey
      );

      const balance = await chain.callReadOnlyFn(
        deployer.address,
        tokenContractName,
        "get-balance",
        [principalCV(principal_str)],
        principal_str
      );

      expect(balance).to.be.ok;
      expect(+balance.value.value).to.be.equal(+balanceBefore.value.value + amount_to_mint);
    }

    for (let i = 1; i <= positions_to_open; i++) {
      const position_size = 1;
      const insertPosition = await chain.callContract(
        deployer.address,
        futuresMarketContractName,
        "insert-position",
        [
          uintCV(position_size),
          uintCV(ORDER_TYPE_LONG),
          principalCV(`${deployer.address}.${tokenContractName}`),
        ],
        userA.secretKey
      );

      expect(insertPosition).to.be.ok;
    }

    // since the minimal possible cooldown is 600 seconds
    // it has to be 10 minutes real time blockhing wating
    await new Promise(r => setTimeout(r, POSITION_UPDATE_COOLDOWN));

    const batchPositionMaintenance = await chain.callContract(
      deployer.address,
      futuresMarketContractName,
      "batch-position-maintenance",
      [],
      userB.secretKey
    );

    expect(batchPositionMaintenance).to.be.ok;
    const result = await chain.getTransactionResponse(batchPositionMaintenance.txid);
    expect(+result.value.value).to.be.equal(INDEX_CHUNK_SIZE);
    expect(result).to.be.ok;
    expect(result.success).to.be.true;
  }).timeout(10000000);
});
