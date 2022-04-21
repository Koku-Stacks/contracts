import { execSync } from "child_process";
import { readFileSync } from "fs"

import { StacksChain } from "../integration/framework/stacks.chain"
import { STACKS_API_URL } from "../integration/config";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";

function read_deployment_order(filename?: string): string[] {
    filename = filename ?? "contracts/deployment_order.txt"

    const content = readFileSync(filename);
    
    const deployment_order = content.toString().split('\n');

    return deployment_order;
}

function deploy_contract(contract_name: string) {
    const output = execSync(`npm run deploy -- --contract ${contract_name}`);

    console.log(output.toString());
}

function deploy_all_contracts() {
    read_deployment_order().forEach((contract_name) => {
        deploy_contract(contract_name);
    })
}

const chain = new StacksChain(STACKS_API_URL, {
    defaultFee: 100000
});

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
    deploy_all_contracts();
    await post_deployment_transactions();
}

service();