// for every individual that will sign the transaction, private keys are abstracted here.
import { AuthType, createStacksPrivateKey, createTransactionAuthField, nextSignature, PubKeyEncoding, pubKeyfromPrivKey, StacksTransaction, TransactionSigner } from "@stacks/transactions";
import { Account } from "../integration/framework/stacks.chain";

export function getSignerPublicKey(user:Account){
  const privateKey = createStacksPrivateKey(user.secretKey);
  return pubKeyfromPrivKey(privateKey.data);
}

export function signTransaction(transaction:StacksTransaction, user:Account) {

  const privKey = createStacksPrivateKey(user.secretKey);
  
  const signer = new TransactionSigner(transaction);
    const authType = AuthType.Standard;
    const nonce = 0;
    const sig1 = nextSignature(
      signer.sigHash,
      authType,
      transaction.auth.spendingCondition.fee,
      nonce,
      privKey
    ).nextSig;

    const compressed1 = privKey.data.toString("hex").endsWith("01");
    const field = createTransactionAuthField(
      compressed1 ? PubKeyEncoding.Compressed : PubKeyEncoding.Uncompressed,
      sig1
    );
    signer.signOrigin(privKey);
  
    return {field: field, signer: signer};
}

