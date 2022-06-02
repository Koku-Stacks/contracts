import { uintCV } from "@stacks/transactions";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, TRAITS_FOLDER, STACKS_API_URL } from "../config";
import { StacksChain } from "dy-finance.lib";

describe("futures position", () => {
  const chain = new StacksChain(STACKS_API_URL, {
    defaultFee: 100000,
  });

  let contractAddress: string;
  const contractName = "token";
  const sipContractName = "sip-010-trait-ft-standard";
  const burnTrait = "burn-trait";
  const mintTrait = "mint-trait";
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

    const mintTraitCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${mintTrait}.clar`),
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

    await chain.deployContract(burnTrait, burnTraitCode, deployer.secretKey);

    await chain.deployContract(mintTrait, mintTraitCode, deployer.secretKey);

    const contractId = await chain.deployContract(
      contractName,
      contractCode,
      deployer.secretKey
    );

    contractAddress = contractId.split(".")[0];
  });

  it("batch position maintanence", async () => {
    const userA = chain.accounts.get("wallet_1")!;
    const userB = chain.accounts.get("wallet_2")!;
    const deployer = chain.accounts.get("deployer")!;
    const token_contract = "token";
    const futures_market_contract = "futures-market";
    const amount_to_mint = 10000;
    const INDEX_CHUNK_SIZE = 20;
    const positions_to_open = INDEX_CHUNK_SIZE;
    const ORDER_TYPE_LONG = 1;

    // initialize contract
    await chain.callContract(
      deployer.address,
      futures_market_contract,
      "initialize",
      [principalCV(`${deployer.address}.${token_contract}`)],
      deployer.address
    );

    //mint token for accounts
    await chain.callContract(
      deployer.address,
      token_contract,
      "add-authorized-contract",
      [principalCV(deployer.address)],
      deployer.address
    );

    const account_principals = Array.from(chain.accounts.values()).map(
      (account) => account.address
    );

    for (const principal_str of account_principals) {
      await chain.callContract(
        deployer.address,
        token_contract,
        "mint",
        [uintCV(amount_to_mint), principalCV(principal_str)],
        deployer.address
      );

      const balance = await chain.callReadOnlyFn(
        deployer.address,
        token_contract,
        "get-balance",
        [principalCV(principal_str)],
        principal_str
      );

      expect(balance).to.be.ok;
      expect(String(balance.value.value).split("n")[0]).to.be(
        String(`${amount_to_mint}`)
      );
    }

    for (let i = 1; i <= positions_to_open; i++) {
      const position_size = 1;
      const insertPosition = await chain.callContract(
        deployer.address,
        futures_market_contract,
        "insert-position",
        [
          uintCV(position_size),
          uintCV(ORDER_TYPE_LONG),
          principalCV(`${deployer.address}.${token_contract}`),
        ],
        userA.address
      );

      expect(insertPosition).to.be.ok;
    }

    const batchPositionMaintenance = await chain.callContract(
      deployer.address,
      futures_market_contract,
      "batch-position-maintenance",
      [],
      userB.address
    );

    expect(batchPositionMaintenance).to.be.ok;
    expect(String(batchPositionMaintenance)).to.be.equal(`1`);
  });
});
