import {
  AnchorMode,
  PostConditionMode,
  publicKeyToString,
  StacksPublicKey,
  UnsignedMultiSigContractCallOptions,
} from "@stacks/transactions";
import {
  accountSigner,
  StacksChain,
} from "../integration/framework/stacks.chain";
import { signMultiSignature } from "./multisig_3";

export async function generateMultiSignature(
  chain: StacksChain,
  options: {
    contractAddress: any;
    contractName: any;
    functionName: any;
    functionArgs: any;
  }
) {
  const deployer = new accountSigner(chain.accounts.get("deployer")!);

  const wallet_1 = new accountSigner(chain.accounts.get("wallet_1")!);

  const pubKeys: StacksPublicKey[] = [
    deployer.getPublicKey(),
    wallet_1.getPublicKey(),
  ];

  const pubKeyStrings: string[] = pubKeys.map(publicKeyToString);

  // number of signatures required
  const numberOfSignatureRequired = 2;

  const multi_sig_options: UnsignedMultiSigContractCallOptions = {
    numSignatures: numberOfSignatureRequired,
    publicKeys: pubKeyStrings,
    contractAddress: options.contractAddress,
    contractName: options.contractName,
    functionName: options.functionName,
    functionArgs: options.functionArgs,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await chain.makeUnsignedMultiSigContractCall(
    multi_sig_options
  );
  let authFields = [];
  const signer1 = deployer.signTransaction(transaction);
  authFields.push(signer1);
  const signer2 = signMultiSignature(chain, transaction);
  authFields.push(signer2);
  return authFields;
}
