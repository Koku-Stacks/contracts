import {
    StacksTransaction,
  } from "@stacks/transactions";
  import {
    accountSigner,
    StacksChain,
  } from "../framework/stacks.chain";
  
  export function signMultiSignature(chain: StacksChain, transaction: StacksTransaction) {

    const wallet_1 = new accountSigner(chain.accounts.get("wallet_1")!);
    const signature2 = wallet_1.signTransaction(transaction);
    return signature2;
    
  }
  