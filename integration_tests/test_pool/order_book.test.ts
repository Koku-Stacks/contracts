import { uintCV } from "@stacks/transactions";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, STACKS_API_URL } from "../config";
import { StacksChain } from "dy-finance.lib";

describe("order book", () => {
  const chain = new StacksChain(STACKS_API_URL, {
    defaultFee: 100000,
  });

  let contractAddress: string;
  const tokenContractName = "max-heap";

  before(async () => {
    await chain.loadAccounts();

    const deployer = chain.accounts.get("deployer")!;

    const tokenContractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${tokenContractName}.clar`),
      { encoding: "utf8" }
    );
    const contractId = await chain.deployContract(tokenContractName, tokenContractCode, deployer.secretKey);

    contractAddress = contractId.split(".")[0];
  });

  it("batch position maintanence", async () => {
    const deployer = chain.accounts.get("deployer")!;
    const INDEX_CHUNK_SIZE = 20;
    const positions_to_open = INDEX_CHUNK_SIZE;

    // initialize contract
    await chain.callContract(
      contractAddress,
      tokenContractName,
      "initialize",
      [],
      deployer.secretKey
    );

    for (let i = 1; i <= positions_to_open; i++) {
      const position_size = 1;
      const insertPosition = await chain.callContract(
        contractAddress,
        "max-heap",
        "max-heap-insert",
        [
          uintCV(i),
          uintCV(position_size + i),
        ],
        deployer.secretKey
      );

      expect(insertPosition).to.be.ok;
    }

    const all_orders_tx = await chain.callContract(
      contractAddress,
      "max-heap",
      "get-orders",
      [],
      deployer.secretKey
    );

    const all_orders = await chain.getTransactionResponse(all_orders_tx.txid);

    all_orders.value.value.forEach(element => {
      const price = +element.value.price.value;
      const volume = +element.value.value.value;

      if(price !== 0 && volume !== 0){
        expect(price + 1).to.be.equal(volume);
      }
      else {
        expect(price).to.be.equal(volume);
      }
    });
  }).timeout(10000000);
});
