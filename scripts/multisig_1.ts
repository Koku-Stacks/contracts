// made the interface of this file in the main stacks.chain.ts for better abstraction
import {
  AuthType,
  createTransactionAuthField,
  nextSignature,
  PubKeyEncoding,
  StacksPrivateKey,
  StacksTransaction,
  TransactionSigner,
} from "@stacks/transactions";

export function serialize(transaction: StacksTransaction): Buffer {
  return transaction.serialize();
}

export function signTransaction(
  transaction: StacksTransaction,
  privateKey: StacksPrivateKey
) {
  const signer = new TransactionSigner(transaction);
  const authType = AuthType.Standard;
  const nonce = 0;
  const sig1 = nextSignature(
    signer.sigHash,
    authType,
    transaction.auth.spendingCondition.fee,
    nonce,
    privateKey
  ).nextSig;

  const compressed1 = privateKey.data.toString("hex").endsWith("01");
  const field = createTransactionAuthField(
    compressed1 ? PubKeyEncoding.Compressed : PubKeyEncoding.Uncompressed,
    sig1
  );
  signer.signOrigin(privateKey);

  return {
    serialized: serialize(transaction),
    raw: transaction,
    authField: field,
    signer: signer,
  };
}
