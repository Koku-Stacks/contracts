import { TransactionVersion } from "@stacks/transactions";

export const node_url = "http://3.64.221.107:3999";
export const default_fee = 100000;

export const contract_id_info_filename = "contracts/addresses.json"
export const deployment_order_filename = "contracts/deployment_order.txt";

export function get_transaction_version(network_type: string): TransactionVersion {
    if (network_type === 'mainnet') {
        return TransactionVersion.Mainnet;
    } else {
        return TransactionVersion.Testnet;
    }
}