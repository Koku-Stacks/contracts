import { TransactionVersion } from "@stacks/transactions";

export const seed_phrase = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw";
export const network_type = "testnet";
export const node_url = "http://3.64.221.107:3999";
export const default_fee = 100000;

export const contract_id_info_filename = "contracts/addresses.json"

export function get_transaction_version(network_type: string): TransactionVersion {
    if (network_type === 'mainnet') {
        return TransactionVersion.Mainnet;
    } else {
        return TransactionVersion.Testnet;
    }
}