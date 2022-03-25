import {
  deserializeTransaction,
  publicKeyToString,
  standardPrincipalCV,
  BufferReader,
  AnchorMode,
  UnsignedMultiSigContractCallOptions,
  MultiSigSpendingCondition,
  AuthType,
  isCompressed,
  PubKeyEncoding,
  uintCV,
  bufferCV,
  someCV,
  createTransactionAuthField,
  AddressHashMode,
  StacksPublicKey,
} from "@stacks/transactions";
import { StacksChain } from "../framework/stacks.chain";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, TRAITS_FOLDER, STACKS_API_URL } from "../config";
import { expect } from "chai";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { getSignerPublicKey, signTransaction } from "../../scripts/signer";

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

    const wallet_2 = chain.accounts.get("wallet_2")!;

    const fee = 100000;
    const memo = "test memo";

    const pubKeys: StacksPublicKey[] = [
      getSignerPublicKey(deployer),
      getSignerPublicKey(wallet_1),
      getSignerPublicKey(wallet_2),
    ];

    const pubKeyStrings: string[] = pubKeys.map(publicKeyToString);

    // number of signatures required
    const numberOfSignatureRequired = 2;

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

    /////////  for all kinds of contract calls  /////////////
    const multi_sig_options: UnsignedMultiSigContractCallOptions = {
      numSignatures: numberOfSignatureRequired,
      publicKeys: pubKeyStrings,
      contractAddress: contractAddress,
      contractName: contractName,
      functionName: "transfer",
      functionArgs: [
        uintCV(50),
        standardPrincipalCV(deployer.address),
        standardPrincipalCV(wallet_1.address),
        someCV(bufferCV(Buffer.from(memo))),
      ],
      anchorMode: AnchorMode.Any,
    };

    const transaction = await chain.makeUnsignedMultiSigContractCall(
      multi_sig_options,
      deployer.secretKey
    );
    expect(transaction).to.be.ok;

    let signatureAcquired = 0;
    let signerfields = [];

    const signer1 = signTransaction(transaction, deployer);

    signerfields.push(signer1.field);

    signatureAcquired++;

    // serialize
    const partiallySignedSerialized = transaction.serialize();

    // deserialize
    const bufferReader2 = new BufferReader(partiallySignedSerialized);
    expect(() => deserializeTransaction(bufferReader2)).to.throw(
      "Incorrect number of signatures"
    );

    const signer2 = signTransaction(transaction, wallet_1);

    signerfields.push(signer2.field);

    signatureAcquired++;

    const compressedPub = isCompressed(pubKeys[2]);
    const unsignerField = createTransactionAuthField(
      compressedPub ? PubKeyEncoding.Compressed : PubKeyEncoding.Uncompressed,
      pubKeys[signatureAcquired]
    );

    signerfields.push(unsignerField);

    signer2.signer.appendOrigin(pubKeys[signatureAcquired]); // doesn't accepts new signers, last signer must append all the remaining unsigners

    const serializedTx = transaction.serialize();

    const bufferReader = new BufferReader(serializedTx);
    const deserializedTx = deserializeTransaction(bufferReader);

    const addressHashMode = AddressHashMode.SerializeP2SH;

    const authType = AuthType.Standard;
    const nonce = 0;

    expect(deserializedTx.auth.authType).to.be.equal(authType);

    expect(deserializedTx.auth.spendingCondition!.hashMode).to.be.equal(
      addressHashMode
    );

    expect(deserializedTx.auth.spendingCondition!.nonce).to.be.equal(
      BigInt(nonce)
    );

    expect(deserializedTx.auth.spendingCondition!.fee).to.be.equal(
      BigInt(fee) // default private testnet fee
    );

    const spendingCondition = deserializedTx.auth
      .spendingCondition as MultiSigSpendingCondition;

    // For verifying signature hash
    for (let i = 0; i < signerfields.length; i++) {
      expect(spendingCondition.fields[i].contents.data.toString()).to.be.equal(
        signerfields[i].contents.data.toString()
      );
    }

    expect(signatureAcquired).to.be.equal(
        numberOfSignatureRequired
    );

    // const broadcast_response = await broadcastTransaction(
    //     transaction,
    //     new StacksTestnet(),
    //   );
    //   console.log(broadcast_response);
    //   if (broadcast_response.error) {
    //     throw new Error(broadcast_response.reason);
    //   }
    // giving error; NotEnoughFunds on the private testnet
  });
});
