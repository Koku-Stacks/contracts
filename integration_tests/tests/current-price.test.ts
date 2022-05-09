import { readFileSync } from "fs";
import * as path from "path";
import { CONTRACT_FOLDER, STACKS_API_URL } from "../config";
import { StacksChain } from "dy-finance.lib";
import { expect } from "chai";
import { uintCV } from "@stacks/transactions";

const current_price_contract_name = "current-price";

const chain = new StacksChain(STACKS_API_URL, {
    defaultFee: 100000,
});

let current_price_contract_address: string;

describe("current-price contract", () => {
    before(async () => {
        await chain.loadAccounts();

        const deployer = chain.accounts.get("deployer")!;

        const current_price_contract_code = readFileSync(
            path.join(CONTRACT_FOLDER, `${current_price_contract_name}.clar`),
            {encoding: "utf8"}
        );

        const contract_id = await chain.deployContract(
            current_price_contract_name,
            current_price_contract_code,
            deployer.secretKey
        );

        current_price_contract_address = contract_id.split(".")[0];
    });

    it("Ensures current-price-clar contains data generated by btc_price_service script", async () => {
        const wallet1 = chain.accounts.get("wallet_1")!;
        const deployer = chain.accounts.get("deployer")!;

        const mocked_btc_price = 1000;
        const mocked_timestamp = 2000;

        const tx_id = await chain.callContract(
            deployer.address,
            "current-price",
            "update-price",
            [uintCV(mocked_btc_price), uintCV(mocked_timestamp)],
            deployer.secretKey
        );

        const price_result = await chain.callReadOnlyFn(
            current_price_contract_address,
            current_price_contract_name,
            "get-current-price",
            [],
            wallet1.address
        );

        expect(price_result.value).to.be.eq(mocked_btc_price.toString());

        const timestamp_result = await chain.callReadOnlyFn(
            current_price_contract_address,
            current_price_contract_name,
            "get-current-timestamp",
            [],
            wallet1.address
        );

        expect(timestamp_result.value).to.be.eq(mocked_timestamp.toString());
    });
});