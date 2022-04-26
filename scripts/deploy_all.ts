import { readFileSync, writeFileSync } from "fs"

import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { chain, deploy_contract } from "./deploy_utils";

import * as config from "../config";

function read_deployment_order(filename?: string): string[] {
    filename = filename ?? "contracts/deployment_order.txt"

    const content = readFileSync(filename);
    
    const deployment_order = content.toString().split('\n');

    return deployment_order;
}

async function deploy_all_contracts() {
    let contracts_id_registry: Map<string, string> = new Map();

    for (const contract_name of read_deployment_order()) {
        const contract_id = await deploy_contract(contract_name);

        console.log(`${contract_id} successfully deployed`);

        contracts_id_registry[contract_name] = contract_id;
    }

    return contracts_id_registry;
}

async function post_deployment_transactions() {
    await chain.loadAccounts();

    const deployer = chain.accounts.get("deployer")!;

    await chain.callContract(
        deployer.address,
        "token",
        "add-authorized-contract",
        [principalCV(`${deployer.address}.minting`)],
        deployer.secretKey,
        {
            waitForTransactionConfirmation: true
        }
    );

    await chain.callContract(
        deployer.address,
        "token",
        "add-authorized-contract",
        [principalCV(deployer.address)],
        deployer.secretKey,
        {
            waitForTransactionConfirmation: true
        }
    );
}

function register_contracts_id(contracts_id_registry: Map<string, string>, filename?: string) {
    filename = filename ?? config.contract_id_info_filename;

    writeFileSync(filename, JSON.stringify(contracts_id_registry, null, '\t'));
}

async function service() {
    const contracts_id_registry =  await deploy_all_contracts();
    await post_deployment_transactions();
    register_contracts_id(contracts_id_registry);
}

service();