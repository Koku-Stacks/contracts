import { StacksChain } from "dy-finance.lib"
import { readFileSync } from "fs"

import * as config from "../config";

const networkEndPoint = config.node_url;

export const chain = new StacksChain(networkEndPoint, {
    defaultFee: config.default_fee,
  });

export async function deploy_contract(contract_relative_path: string) {
    const slash_index = contract_relative_path.indexOf('/');
    
    let contract_name = contract_relative_path;
    if (slash_index !== -1) {
        contract_name = contract_relative_path.substring(slash_index + 1);
    }

    const contract_path = `contracts/${contract_relative_path}.clar`;

    const contract_code = readFileSync(contract_path).toString();

    await chain.loadAccounts();

    const deployer = chain.accounts.get('deployer')!;

    const contract_id = await chain.deployContract(
        contract_name,
        contract_code,
        deployer.secretKey
    );

    return contract_id;
}