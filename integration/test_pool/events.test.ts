import { STACKS_API_URL } from "../config";
import { StacksChain } from "../framework/stacks.chain";
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
describe("events contract", () => {
  before(async () => {
    await chain.loadAccounts();
  });

  it("Ensures print is working", async () => {
    const deployer = chain.accounts.get("deployer")!;
    const txns_ids = await chain.getEventsByContract(
      deployer.address,
      Event.fungible_token_asset
    );
    console.log(txns_ids);
  });
});