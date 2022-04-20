import { resolve } from "dns";
import * as fs from "fs";
import { ReadStream } from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, STACKS_API_URL, TRAITS_FOLDER } from "../config";
import { StacksChain } from "../framework/stacks.chain";
const chain = new StacksChain(STACKS_API_URL, {
  defaultFee: 100000,
});
let contractAddress: string;
const contractName = "token";
const sipContractName = "sip-010-trait-ft-standard";
const enum Event {
  smart_contract_log = "smart_contract_log",
  non_fungible_token_asset = "non_fungible_token_asset",
  fungible_token_asset = "fungible_token_asset",
  stx_lock = "stx_lock",
  stx_asset = "stx_asset",
}
describe("events contract", () => {
  before(async () => {
    await chain.loadAccounts();
    const deployer = chain.accounts.get("deployer")!;
    const sipContractCode = fs.readFileSync(
      path.join(TRAITS_FOLDER, `${sipContractName}.clar`),
      { encoding: "utf8" }
    );
    const contractCode = fs.readFileSync(
      path.join(CONTRACT_FOLDER, `${contractName}.clar`),
      { encoding: "utf8" }
    );
    // deploy the dependency contract first
    await chain.deployContract(
      sipContractName,
      sipContractCode,
      deployer.secretKey
    );
    const contractId = await chain.deployContract(
      contractName,
      contractCode,
      deployer.secretKey
    );
    contractAddress = contractId.split(".")[0];
  });

  it("Ensures print is working", async () => {
    const fungible_token_stream = fs.createWriteStream("ft_streams.txt", {
      flags: "a",
    });
    const txns = await chain.writeEventIntoStream(
      "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token",
      fungible_token_stream,
      Event.fungible_token_asset
    );
    const streamReader = async () => {
      return new Promise((resolve) => {
        let readStream: ReadStream = fs.createReadStream("ft_streams.txt");
        let data = "";
        readStream.on("data", (chunk) => {
          console.log("---------------------------------");
          console.log(chunk);
          data += chunk;
          console.log("---------------------------------");
        });

        readStream.on("open", () => {
          console.log("Stream opened...");
        });

        readStream.on("end", () => {
          console.log("Stream Closed...");
          resolve(data);
        });
      });
    };
    const data = await streamReader();
  });
});
