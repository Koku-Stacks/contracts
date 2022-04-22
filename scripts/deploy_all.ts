import { readFileSync } from "fs"

import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { chain, deploy_contract } from "./deploy_utils";

function read_deployment_order(filename?: string): string[] {
    filename = filename ?? "contracts/deployment_order.txt"

    const content = readFileSync(filename);
    
    const deployment_order = content.toString().split('\n');

    return deployment_order;
}

async function deploy_all_contracts() {
    for (const contract_name of read_deployment_order()) {
        const contract_id = await deploy_contract(contract_name);

        console.log(`${contract_id} successfully deployed`);
    }
}

async function post_deployment_transactions() {
    await chain.loadAccounts();

    const deployer = chain.accounts.get("deployer")!;

    await chain.callContract(
        deployer.address,
        "token",
        "add-authorized-contract",
        [principalCV(`${deployer.address}.minting`)],
        deployer.secretKey
    );
}

async function service() {
    await deploy_all_contracts();
    await post_deployment_transactions();
}

service();