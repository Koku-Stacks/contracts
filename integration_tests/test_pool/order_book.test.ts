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
  const maxHeapContractName = "max-heap";
  const minHeapContractName = "min-heap";

  before(async () => {
    await chain.loadAccounts();

    const deployer = chain.accounts.get("deployer")!;

    const maxHeapContractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${maxHeapContractName}.clar`),
      { encoding: "utf8" }
    );

    await chain.deployContract(maxHeapContractName, maxHeapContractCode, deployer.secretKey);

    const minHeapContractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${minHeapContractName}.clar`),
      { encoding: "utf8" }
    );
    const contractId = await chain.deployContract(minHeapContractName, minHeapContractCode, deployer.secretKey);

    contractAddress = contractId.split(".")[0];
  });

  it("max heap testing", async () => {
    const deployer = chain.accounts.get("deployer")!;
    const INDEX_CHUNK_SIZE = 20;
    const positions_to_open = INDEX_CHUNK_SIZE;

    // initialize contract
    await chain.callContract(
      contractAddress,
      maxHeapContractName,
      "initialize",
      [],
      deployer.secretKey
    );

    for (let i = 1; i <= positions_to_open; i++) {
      const position_size = 1;
      const insertPosition = await chain.callContract(
        contractAddress,
        maxHeapContractName,
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
      maxHeapContractName,
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


  it("min heap testing", async () => {
    const deployer = chain.accounts.get("deployer")!;
    const INDEX_CHUNK_SIZE = 20;
    const positions_to_open = INDEX_CHUNK_SIZE;

    // initialize contract
    await chain.callContract(
      contractAddress,
      minHeapContractName,
      "initialize",
      [],
      deployer.secretKey
    );

    for (let i = 1; i <= positions_to_open; i++) {
      const position_size = 1;
      const insertPosition = await chain.callContract(
        contractAddress,
        minHeapContractName,
        "min-heap-insert",
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
      minHeapContractName,
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
