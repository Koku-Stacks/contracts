import {
  deserializeTransaction,
  standardPrincipalCV,
  BufferReader,
  MultiSigSpendingCondition,
  AuthType,
  uintCV,
  bufferCV,
  someCV,
  AddressHashMode,
} from "@stacks/transactions";
import { StacksChain } from "../framework/stacks.chain";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, TRAITS_FOLDER, STACKS_API_URL } from "../config";
import { expect } from "chai";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { generateMultiSignature } from "../../scripts/multisig_2";
// const chain = new StacksChain("http://3.64.221.107:3999/");

const chain = new StacksChain(STACKS_API_URL, {
  defaultFee: 100000,
});
let contractAddress: string;
const contractName = "token";
const sipContractName = "sip-010-trait-ft-standard";
const mintContractName = "mint-trait";
const burnContractName = "burn-trait";

describe("multi-sig on chain", () => {
  before(async () => {
    await chain.loadAccounts();

    const deployer = chain.accounts.get("deployer")!;

    const sipContractCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${sipContractName}.clar`),
      { encoding: "utf8" }
    );

    const mintContractCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${mintContractName}.clar`),
      { encoding: "utf8" }
    );

    const burnContractCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${burnContractName}.clar`),
      { encoding: "utf8" }
    );

    const contractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${contractName}.clar`),
      { encoding: "utf8" }
    );

    // deploy the dependency contract
    await chain.deployContract(
      sipContractName,
      sipContractCode,
      deployer.secretKey
    );

    await chain.deployContract(
      mintContractName,
      mintContractCode,
      deployer.secretKey
    );

    await chain.deployContract(
      burnContractName,
      burnContractCode,
      deployer.secretKey
    );
    const contractId = await chain.deployContract(
      contractName,
      contractCode,
      deployer.secretKey
    );

    contractAddress = contractId.split(".")[0];
  });

  it("should sign the transaction and transfer", async () => {
    const deployer = chain.accounts.get("deployer")!;
    const wallet_1 = chain.accounts.get("wallet_1")!;

    // dependencies for testing function transfer
    const isAuthorizedContract = await chain.callReadOnlyFn(
      contractAddress,
      contractName,
      "is-authorized",
      [principalCV(deployer.address)],
      deployer.address
    );

    if (isAuthorizedContract.value == false) {
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
      console.log("NOT AUTHORIZED");
    } else {
      console.log("AUTHORIZED");
    }
    // start minting
    const mintCall = await chain.callContract(
      contractAddress,
      contractName,
      "mint",
      [uintCV(100), principalCV(deployer.address)],
      deployer.secretKey
    );

    // dependant on the below transfer function
    expect(mintCall).to.be.ok;
    expect(mintCall.success).to.be.true;

    const authFields = await generateMultiSignature(chain, {
      contractAddress: contractAddress,
      contractName: contractName,
      functionName: "transfer",
      functionArgs: [
        uintCV(50),
        standardPrincipalCV(deployer.address),
        standardPrincipalCV(wallet_1.address),
        someCV(bufferCV(Buffer.from("transfer test"))),
      ],
    });
    console.log(authFields);

    const transaction = authFields[0].signer.transaction;
    // index relies on the length of authfield
    const serializedTx = transaction.serialize();

    const bufferReader = new BufferReader(serializedTx);
    const deserializedTx = deserializeTransaction(bufferReader);

    const addressHashMode = AddressHashMode.SerializeP2SH;

    const authType = AuthType.Standard;

    expect(deserializedTx.auth.authType).to.be.equal(authType);

    expect(deserializedTx.auth.spendingCondition!.hashMode).to.be.equal(
      addressHashMode
    );

    expect(deserializedTx.auth.spendingCondition!.nonce).to.be.equal(
      BigInt(transaction.auth.spendingCondition.nonce)
    );

    expect(deserializedTx.auth.spendingCondition!.fee).to.be.equal(
      BigInt(transaction.auth.spendingCondition.fee) // default private testnet fee
    );

    const spendingCondition = deserializedTx.auth
      .spendingCondition as MultiSigSpendingCondition;

    // For verifying signature hash
    for (let i = 0; i < authFields.length; i++) {
      expect(spendingCondition.fields[i].contents.data.toString()).to.be.equal(
        authFields[i].field.contents.data.toString()
      );
    }

    // const response = await chain.testBroadcast(deserializedTx);
    // giving error; NotEnoughFunds on the private testnet
  });
});
