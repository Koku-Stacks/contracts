import { intCV, stringUtf8CV, uintCV } from "@stacks/transactions";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { expect } from "chai";
import { accounts } from "../web3/accounts";
import { StacksChain } from "../web3/stacks.chain";

const chain = new StacksChain("http://localhost:3999");

const contractAddress = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const contractName = "token";

describe("token contract", () => {
  it("Ensures the token uri facilities work as expected", async () => {
    const unauthorizedUriUpdate = 104;

    const deployer = accounts.get("deployer")!;
    const wallet1 = accounts.get("wallet_1")!;

    // read the value
    const readResult = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-token-uri",
      [],
      wallet1.address
    );

    console.log("readResult", readResult);

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

    console.log("updateResult", updateResult);

    expect(updateResult).to.be.ok;
    expect(updateResult.success).to.be.true;

    // read the value again
    const checkResult = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-token-uri",
      [],
      wallet1.address
    );

    console.log("checkResult", checkResult);

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

    console.log("wrongUpdateResult", wrongUpdateResult);

    expect(wrongUpdateResult).to.be.ok;
    expect(wrongUpdateResult.success).to.be.false;
    expect(wrongUpdateResult.value.value).to.be.eq("104");

    // double check that value wasn't changed
    const doubleCheckResult = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-token-uri",
      [],
      wallet1.address
    );

    console.log("doubleCheckResult", doubleCheckResult);

    expect(doubleCheckResult).to.be.ok;
    expect(doubleCheckResult.success).to.be.true;
    expect(doubleCheckResult.value.value.value).to.be.eq(newUri);
  });

  it("Ensure the constant read only functions are returning as expected", async () => {
    const deployer = accounts.get("deployer")!;

    const decimals = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-decimals",
      [],
      deployer.address
    );

    expect(decimals).to.be.ok;
    expect(decimals.success).to.be.true;
    expect(decimals.value.value).to.be.eq("2");

    const symbol = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-symbol",
      [],
      deployer.address
    );

    expect(symbol).to.be.ok;
    expect(symbol.success).to.be.true;
    expect(symbol.value.value).to.be.eq("TKN");

    const name = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-name",
      [],
      deployer.address
    );

    expect(name).to.be.ok;
    expect(name.success).to.be.true;
    expect(name.value.value).to.be.eq("token");
  });

  it("Ensure mint and burn functions work as expected", async () => {
    const deployer = accounts.get("deployer")!;
    const wallet1 = accounts.get("wallet_1")!;

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

    console.log("initialSupply", initialSupply);

    const initialDeployerBalance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance-of",
      [principalCV(deployer.address)],
      deployer.address
    );

    console.log("initialDeployerBalance", initialDeployerBalance);
    expect(initialDeployerBalance).to.be.ok;
    expect(initialDeployerBalance.success).to.be.true;

    const initialWallet1Balance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance-of",
      [principalCV(wallet1.address)],
      wallet1.address
    );

    expect(initialWallet1Balance).to.be.ok;
    expect(initialWallet1Balance.success).to.be.true;

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
      [uintCV(100), principalCV(wallet1.address)],
      wallet1.secretKey
    );

    expect(badMintCall).to.be.ok;
    expect(badMintCall.success).to.be.false;

    const mintCallToOtherWallet = await chain.callContract(
      contractAddress,
      contractName,
      "mint",
      [uintCV(50), principalCV(wallet1.address)],
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

    console.log("supply", supply);

    expect(supply).to.be.ok;
    expect(supply.success).to.be.true;
    expect(+supply.value.value).to.be.equal(+initialSupply.value.value + 150);

    const deployerBalance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance-of",
      [principalCV(deployer.address)],
      deployer.address
    );

    console.log("deployerBalance", deployerBalance);

    expect(deployerBalance).to.be.ok;
    expect(deployerBalance.success).to.be.true;
    expect(+deployerBalance.value.value).to.be.equal(
      +initialDeployerBalance.value.value + 100
    );

    const wallet1Balance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance-of",
      [principalCV(wallet1.address)],
      wallet1.address
    );

    console.log("wallet1Balance", wallet1Balance);

    expect(wallet1Balance).to.be.ok;
    expect(wallet1Balance.success).to.be.true;
    expect(+wallet1Balance.value.value).to.be.equal(
      +initialWallet1Balance.value.value + 50
    );

    // burn
    const goodBurnCall = await chain.callContract(
      contractAddress,
      contractName,
      "burn",
      [uintCV(10)],
      deployer.secretKey
    );

    // console.log("goodBurnCall", goodBurnCall);

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
      "get-balance-of",
      [principalCV(deployer.address)],
      deployer.address
    );

    console.log({ updatedDeployerBalance, initialDeployerBalance });

    expect(updatedDeployerBalance).to.be.ok;
    expect(updatedDeployerBalance.success).to.be.true;
    expect(+updatedDeployerBalance.value.value).to.be.equal(
      +initialDeployerBalance.value.value + 90
    );

    const updatedWallet1Balance = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "get-balance-of",
      [principalCV(wallet1.address)],
      wallet1.address
    );

    expect(updatedWallet1Balance).to.be.ok;
    expect(updatedWallet1Balance.success).to.be.true;
    expect(+updatedWallet1Balance.value.value).to.be.equal(
      +initialWallet1Balance.value.value + 50
    );
  });
});

// TODO:

// Clarinet.test({
//   name: "Ensure transfer facilities work as expected",
//   fn(chain: Chain, accounts: Map<string, Account>) {
//     const unauthorizedTransfer = 101;
//     const unauthorizedAllowanceQuery = 102;
//     const attemptToDecreaseInexistentAllowance = 103;

//     const deployer = accounts.get("deployer")!;

//     const wallet1 = accounts.get("wallet_1")!;
//     const wallet2 = accounts.get("wallet_2")!;
//     const wallet3 = accounts.get("wallet_3")!;
//     const wallet4 = accounts.get("wallet_4")!;

//     const block1 = chain.mineBlock([
//       Tx.contractCall(
//         "token",
//         "mint",
//         [types.uint(100), types.principal(wallet1.address)],
//         deployer.address
//       ),
//       Tx.contractCall(
//         "token",
//         "mint",
//         [types.uint(100), types.principal(wallet2.address)],
//         deployer.address
//       ),
//       Tx.contractCall(
//         "token",
//         "mint",
//         [types.uint(100), types.principal(wallet3.address)],
//         deployer.address
//       ),
//     ]);

//     const [mintCall1, mintCall2, mintCall3] = block1.receipts;

//     mintCall1.result.expectOk().expectBool(true);
//     mintCall2.result.expectOk().expectBool(true);
//     mintCall3.result.expectOk().expectBool(true);

//     let wallet1Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet1.address)],
//       wallet1.address
//     );
//     wallet1Balance.result.expectOk().expectUint(100);

//     let wallet2Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet2.address)],
//       wallet2.address
//     );
//     wallet2Balance.result.expectOk().expectUint(100);

//     let wallet3Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet3.address)],
//       wallet3.address
//     );
//     wallet3Balance.result.expectOk().expectUint(100);

//     const block2 = chain.mineBlock([
//       Tx.contractCall(
//         "token",
//         "transfer",
//         [
//           types.uint(10),
//           types.principal(wallet1.address),
//           types.principal(wallet3.address),
//         ],
//         wallet1.address
//       ),
//       Tx.contractCall(
//         "token",
//         "transfer",
//         [
//           types.uint(10),
//           types.principal(wallet2.address),
//           types.principal(wallet3.address),
//         ],
//         wallet2.address
//       ),
//       Tx.contractCall(
//         "token",
//         "transfer",
//         [
//           types.uint(10),
//           types.principal(wallet3.address),
//           types.principal(wallet1.address),
//         ],
//         wallet1.address
//       ),
//     ]);

//     const [goodTransferCall1, goodTransferCall2, badTransferCall1] =
//       block2.receipts;

//     goodTransferCall1.result.expectOk().expectBool(true);
//     goodTransferCall2.result.expectOk().expectBool(true);
//     badTransferCall1.result.expectErr().expectUint(unauthorizedTransfer);

//     wallet1Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet1.address)],
//       wallet1.address
//     );
//     wallet1Balance.result.expectOk().expectUint(90);

//     wallet2Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet2.address)],
//       wallet2.address
//     );
//     wallet2Balance.result.expectOk().expectUint(90);

//     wallet3Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet3.address)],
//       wallet3.address
//     );
//     wallet3Balance.result.expectOk().expectUint(120);

//     const block3 = chain.mineBlock([
//       Tx.contractCall(
//         "token",
//         "approve",
//         [types.principal(wallet1.address), types.uint(20)],
//         wallet3.address
//       ),
//       Tx.contractCall(
//         "token",
//         "approve",
//         [types.principal(wallet2.address), types.uint(20)],
//         wallet3.address
//       ),
//     ]);

//     const [approveCall1, approveCall2] = block3.receipts;

//     approveCall1.result.expectOk().expectBool(true);
//     approveCall2.result.expectOk().expectBool(true);

//     const allowanceQuery1 = chain.callReadOnlyFn(
//       "token",
//       "allowance",
//       [types.principal(wallet3.address), types.principal(wallet1.address)],
//       wallet3.address
//     );
//     allowanceQuery1.result.expectOk().expectUint(20);

//     const allowanceQuery2 = chain.callReadOnlyFn(
//       "token",
//       "allowance",
//       [types.principal(wallet3.address), types.principal(wallet2.address)],
//       wallet2.address
//     );
//     allowanceQuery2.result.expectOk().expectUint(20);

//     const badAllowanceQuery = chain.callReadOnlyFn(
//       "token",
//       "allowance",
//       [types.principal(wallet3.address), types.principal(wallet2.address)],
//       wallet1.address
//     );
//     badAllowanceQuery.result.expectErr().expectUint(unauthorizedAllowanceQuery);

//     const block4 = chain.mineBlock([
//       Tx.contractCall(
//         "token",
//         "transfer-from",
//         [
//           types.uint(5),
//           types.principal(wallet3.address),
//           types.principal(wallet4.address),
//         ],
//         wallet1.address
//       ),
//       Tx.contractCall(
//         "token",
//         "transfer-from",
//         [
//           types.uint(5),
//           types.principal(wallet3.address),
//           types.principal(wallet4.address),
//         ],
//         wallet2.address
//       ),
//       Tx.contractCall(
//         "token",
//         "transfer-from",
//         [
//           types.uint(5),
//           types.principal(wallet3.address),
//           types.principal(wallet4.address),
//         ],
//         wallet4.address
//       ),
//     ]);

//     const [goodTransferFromCall1, goodTransferFromCall2, badTransferFromCall] =
//       block4.receipts;

//     goodTransferFromCall1.result.expectOk().expectBool(true);
//     goodTransferFromCall2.result.expectOk().expectBool(true);
//     badTransferFromCall.result.expectErr().expectUint(unauthorizedTransfer);

//     wallet3Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet3.address)],
//       wallet3.address
//     );
//     wallet3Balance.result.expectOk().expectUint(110);

//     const wallet4Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet4.address)],
//       wallet4.address
//     );
//     wallet4Balance.result.expectOk().expectUint(10);

//     const allowanceQuery3 = chain.callReadOnlyFn(
//       "token",
//       "allowance",
//       [types.principal(wallet3.address), types.principal(wallet1.address)],
//       wallet1.address
//     );
//     allowanceQuery3.result.expectOk().expectUint(15);

//     const allowanceQuery4 = chain.callReadOnlyFn(
//       "token",
//       "allowance",
//       [types.principal(wallet3.address), types.principal(wallet2.address)],
//       wallet3.address
//     );
//     allowanceQuery4.result.expectOk().expectUint(15);

//     const block5 = chain.mineBlock([
//       Tx.contractCall(
//         "token",
//         "decrease-allowance",
//         [types.principal(wallet1.address), types.uint(10)],
//         wallet3.address
//       ),
//       Tx.contractCall(
//         "token",
//         "decrease-allowance",
//         [types.principal(wallet1.address), types.uint(10)],
//         wallet4.address
//       ),
//     ]);

//     const [goodDecreaseAllowanceCall, badDecreaseAllowanceCall] =
//       block5.receipts;

//     goodDecreaseAllowanceCall.result.expectOk().expectBool(true);
//     badDecreaseAllowanceCall.result
//       .expectErr()
//       .expectUint(attemptToDecreaseInexistentAllowance);

//     const allowanceQuery5 = chain.callReadOnlyFn(
//       "token",
//       "allowance",
//       [types.principal(wallet3.address), types.principal(wallet1.address)],
//       wallet1.address
//     );
//     allowanceQuery5.result.expectOk().expectUint(5);
//   },
// });

// Clarinet.test({
//   name: "Not enough balance for transfer",
//   fn(chain: Chain, accounts: Map<string, Account>) {
//     const notEnoughBalanceErr = 1;

//     const deployer = accounts.get("deployer")!;
//     const wallet1 = accounts.get("wallet_1")!;
//     const wallet2 = accounts.get("wallet_2")!;

//     const block1 = chain.mineBlock([
//       Tx.contractCall(
//         "token",
//         "mint",
//         [types.uint(50), types.principal(wallet1.address)],
//         deployer.address
//       ),
//     ]);

//     const [mintCallToOtherWallet] = block1.receipts;

//     mintCallToOtherWallet.result.expectOk().expectBool(true);

//     const supply = chain.callReadOnlyFn(
//       "token",
//       "get-total-supply",
//       [],
//       deployer.address
//     );
//     supply.result.expectOk().expectUint(50);

//     let wallet1Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet1.address)],
//       wallet1.address
//     );
//     wallet1Balance.result.expectOk().expectUint(50);

//     const block2 = chain.mineBlock([
//       Tx.contractCall(
//         "token",
//         "transfer",
//         [
//           types.uint(10),
//           types.principal(wallet1.address),
//           types.principal(wallet2.address),
//         ],
//         wallet1.address
//       ),
//       Tx.contractCall(
//         "token",
//         "transfer",
//         [
//           types.uint(50),
//           types.principal(wallet1.address),
//           types.principal(wallet2.address),
//         ],
//         wallet1.address
//       ),
//     ]);

//     const [goodTransferCall, notEnoughBalance] = block2.receipts;

//     goodTransferCall.result.expectOk().expectBool(true);
//     notEnoughBalance.result.expectErr().expectUint(notEnoughBalanceErr);

//     wallet1Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet1.address)],
//       wallet1.address
//     );
//     wallet1Balance.result.expectOk().expectUint(40);

//     let wallet2Balance = chain.callReadOnlyFn(
//       "token",
//       "get-balance-of",
//       [types.principal(wallet2.address)],
//       wallet2.address
//     );
//     wallet2Balance.result.expectOk().expectUint(10);
//   },
// });
