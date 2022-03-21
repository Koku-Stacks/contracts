import {
  makeUnsignedSTXTokenTransfer,
  createStacksPrivateKey,
  deserializeTransaction,
  pubKeyfromPrivKey,
  publicKeyToString,
  TransactionSigner,
  standardPrincipalCV,
  BufferReader,
  AnchorMode,
  StacksTransaction,
} from "@stacks/transactions";
import { StacksChain } from "../framework/stacks.chain";
import { expect } from "chai";

const chain = new StacksChain("http://localhost:3999");

describe("stacks.chain", () => {
  it("should sign the transaction and transfer", async () => {
    const deployer = chain.accounts.get("deployer")!;

    const recipient = standardPrincipalCV(
      "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    );
    const amount = 2500000;
    const fee = 0;
    const memo = "test memo";
    
    // private keys of the participants in the transaction
    const privKeyStrings = [
      "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601",
      "7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801",
      "530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101",
    ];
    
    // create private key objects from string array
    const privKeys = privKeyStrings.map(createStacksPrivateKey);
    
    // corresponding public keys
    const pubKeys = privKeyStrings.map(pubKeyfromPrivKey);
    
    // create public key string array from objects
    const pubKeyStrings = pubKeys.map(publicKeyToString);
    
    // number of signatures required
    const numberOfSignatureRequired = 3;

    const transaction = await makeUnsignedSTXTokenTransfer({
      recipient,
      amount,
      fee,
      memo,
      numSignatures: numberOfSignatureRequired, // number of signature required
      publicKeys: pubKeyStrings, // public key string array with >= numSignatures elements
      anchorMode: AnchorMode.Any,
    });
    expect(transaction).to.be.ok;
    const signer = new TransactionSigner(transaction);

    for (let i = 0; i < numberOfSignatureRequired; i++) {
      signer.signOrigin(privKeys[i]);
    }
    
    signer.appendOrigin(pubKeys[2]);
    expect(transaction.serialize()).to.be.instanceOf(Buffer);
    const serializedTx = transaction.serialize();
    const bufferReader = new BufferReader(serializedTx);
    const deserializedTx = deserializeTransaction(bufferReader);
    expect(deserializedTx).to.be.instanceOf(StacksTransaction);
    const serializedSignedTx = deserializedTx.serialize();
    expect(serializedSignedTx).to.be.instanceOf(Buffer);
  });

});