import { STACKS_API_URL } from "../integration/config";
import { StacksChain } from "../integration/framework/stacks.chain";
const https = require("http");

const chain = new StacksChain(STACKS_API_URL, {
  defaultFee: 100000,
});

const enum Event {
  smart_contract_log = "smart_contract_log",
  non_fungible_token_asset = "non_fungible_token_asset",
  fungible_token_asset = "fungible_token_asset",
  stx_lock = "stx_lock",
  stx_asset = "stx_asset",
}

const limit = 50; // max limit should <= 50 as per API call

let offset = 0;

const contract_principal = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

const url = `http://3.64.221.107:3999/extended/v1/address/${contract_principal}/transactions?limit=${limit}&offset=${offset}`;

let Transactions = [];

async function fetchTransaction() {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", (data) => {
        body += data;
      });
      res.on("end", async () => {
        body = JSON.parse(body);
        const total = body["total"]; // for testing one can hardcode upto 10 - 50 for all transactions otherwise it will take more time
        let FetchedTransactions = body["results"];

        for (let i = 0; i < FetchedTransactions.length; i++) {
          const block_hash = FetchedTransactions[i].block_hash;
          const blockInfo = await chain.searchByBlockHash(block_hash);
          if (blockInfo.found) {
            const blockTxns = await chain.getTxnsByBlockInfo(
              blockInfo,
              Event.fungible_token_asset
            );
            if (blockTxns.length > 0) {
              Transactions.push(blockTxns[0]);
            }
          }
        }

        resolve(total);
      });
    });
  });
}

async function fetchAllTransactions(total) {
  offset += limit;

  while (offset < total - limit) {
    const status = await fetchTransaction();
    offset += limit;
  }
}

const getEventTransactions = async () => {
  const Total = await fetchTransaction();
  console.log(Total);

  if (Total > limit) {
    await fetchAllTransactions(Total);

    console.log(Transactions);
    return Transactions;
  }
};

getEventTransactions();
