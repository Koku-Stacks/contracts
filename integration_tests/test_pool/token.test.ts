import { noneCV, stringUtf8CV, uintCV } from "@stacks/transactions";
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
const contractName = "token";
const sipContractName = "sip-010-trait-ft-standard";
const burnTrait = "burn-trait";
const mintTrait = "mint-trait";
const ERR_CONTRACT_OWNER_ONLY = "1001";


describe("token contract", () => {
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

    await chain.deployContract(
      burnTrait,
      burnTraitCode,
      deployer.secretKey
    );

    await chain.deployContract(
      mintTrait,
      mintTraitCode,
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
    const wallet1 = chain.accounts.get("wallet_1")!;

    // read the value
    const readResult = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-token-uri",
      [],
      wallet1.address
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

    const updateResultResponse = await chain.getTransactionResponse(updateResult.txid);
    expect(updateResultResponse).to.be.ok;
    expect(updateResultResponse.success).to.be.true;

    // read the value again
    const checkResult = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-token-uri",
      [],
      wallet1.address
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
      wallet1.secretKey
    );

    const wrongUpdateResultResponse = await chain.getTransactionResponse(wrongUpdateResult.txid);
    expect(wrongUpdateResultResponse).to.be.ok;
    expect(wrongUpdateResultResponse.success).to.be.false;
    expect(wrongUpdateResultResponse.value.value).to.be.eq(ERR_CONTRACT_OWNER_ONLY);

    // double check that value wasn't changed
    const doubleCheckResult = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-token-uri",
      [],
      wallet1.address
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

  it("Ensure mint, burn and transfer functions work as expected", async () => {
    const deployer = chain.accounts.get("deployer")!;
    const wallet1 = chain.accounts.get("wallet_1")!;

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

    const initialwallet1Balance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(wallet1.address)],
      wallet1.address
    );

    expect(initialwallet1Balance).to.be.ok;
    expect(initialwallet1Balance.success).to.be.true;

    const isAuthorizedContract = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "is-authorized",
      [principalCV(deployer.address)],
      deployer.address
    );

    if(isAuthorizedContract.value == false){
      // authorize contract
      const authorizeContract = await chain.callContract(
        contractAddress,
        contractName,
        "add-authorized-contract",
        [principalCV(deployer.address)],
        deployer.secretKey
      );
  
      const authorizeContractResponse = await chain.getTransactionResponse(authorizeContract.txid);
      expect(authorizeContractResponse).to.be.ok;
      expect(authorizeContractResponse.success).to.be.true;
      console.log("NOT AUTHORIZED");
    } else {
      console.log("AUTHORIZED");
    }

    // start minting
    const goodMintCall = await chain.callContract(
      contractAddress,
      contractName,
      "mint",
      [uintCV(100), principalCV(deployer.address)],
      deployer.secretKey
    );

    const goodMintCallResponse = await chain.getTransactionResponse(goodMintCall.txid);
    expect(goodMintCallResponse).to.be.ok;
    expect(goodMintCallResponse.success).to.be.true;

    const badMintCall = await chain.callContract(
      contractAddress,
      contractName,
      "mint",
      [uintCV(100), principalCV(wallet1.address)],
      wallet1.secretKey
    );

    const badMintCallResponse = await chain.getTransactionResponse(badMintCall.txid);
    expect(badMintCallResponse).to.be.ok;
    expect(badMintCallResponse.success).to.be.false;

    const mintCallToOtherWallet = await chain.callContract(
      contractAddress,
      contractName,
      "mint",
      [uintCV(50), principalCV(wallet1.address)],
      deployer.secretKey
    );

    const mintCallToOtherWalletResponse = await chain.getTransactionResponse(mintCallToOtherWallet.txid);
    expect(mintCallToOtherWalletResponse).to.be.ok;
    expect(mintCallToOtherWalletResponse.success).to.be.true;

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

    const wallet1Balance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(wallet1.address)],
      wallet1.address
    );

    expect(wallet1Balance).to.be.ok;
    expect(wallet1Balance.success).to.be.true;
    expect(+wallet1Balance.value.value).to.be.equal(
      +initialwallet1Balance.value.value + 50
    );

    // transfer
    const deployerTransfer = await chain.callContract(
      contractAddress,
      contractName,
      "transfer",
      [uintCV(50), principalCV(deployer.address), principalCV(wallet1.address), noneCV()],
      deployer.secretKey
    );

    const deployerTransferResponse = await chain.getTransactionResponse(deployerTransfer.txid);
    expect(deployerTransferResponse).to.be.ok;
    expect(deployerTransferResponse.success).to.be.true;

    const wallet1NewBalance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(wallet1.address)],
      wallet1.address
    );

    expect(wallet1NewBalance).to.be.ok;
    expect(wallet1NewBalance.success).to.be.true;
    expect(+wallet1NewBalance.value.value).to.be.equal(
      +wallet1Balance.value.value + 50
    );

    // burn
    const goodBurnCall = await chain.callContract(
      contractAddress,
      contractName,
      "burn",
      [uintCV(10)],
      deployer.secretKey
    );

    const goodBurnCallResponse = await chain.getTransactionResponse(goodBurnCall.txid);
    expect(goodBurnCallResponse).to.be.ok;
    expect(goodBurnCallResponse.success).to.be.true;

    const zeroBurnCall = await chain.callContract(
      contractAddress,
      contractName,
      "burn",
      [uintCV(0)],
      deployer.secretKey
    );

    const zeroBurnCallResponse = await chain.getTransactionResponse(zeroBurnCall.txid);
    expect(zeroBurnCallResponse).to.be.ok;
    expect(zeroBurnCallResponse.success).to.be.false;
    expect(zeroBurnCallResponse.value.value).to.be.equal("1");

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
      +initialDeployerBalance.value.value + 90 - 50
    );

    const updatedwallet1Balance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance",
      [principalCV(wallet1.address)],
      wallet1.address
    );

    expect(updatedwallet1Balance).to.be.ok;
    expect(updatedwallet1Balance.success).to.be.true;
    expect(+updatedwallet1Balance.value.value).to.be.equal(
      +initialwallet1Balance.value.value + 50 + 50
    );
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
      const call = await chain.callContract(
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

      expect(call).to.be.ok;
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
