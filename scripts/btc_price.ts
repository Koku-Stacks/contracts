import { uintCV } from "@stacks/transactions";
import { fetch_btc_price } from "../btc_price_fetch";
import * as config from "../config";
import { StacksChain } from "../integration/framework/stacks.chain";

const cron_job = require('cron').CronJob;

const cron_schedule_string = "0 * * * * *"
const contract_name = "current-price";
const method_name = "update-price";
const fp_decimal_places = 6;

export async function register_btc_price_on_chain(btc_price: number,
                                                  timestamp: number,
                                                  chain: StacksChain,
                                                  address: string,
                                                  secret_key: string) {
    const tx_id = await chain.callContract(
        address,
        contract_name,
        method_name,
        [uintCV(btc_price), uintCV(timestamp)],
        secret_key
    )

    return tx_id;
}

async function service() {
    console.log("Parameters:");
    console.log(`-- node url: ${config.node_url}`);
    console.log(`-- network type: ${config.network_type}`);
    console.log(`-- default fee: ${config.default_fee}`);
    console.log('------');

    const btc_price = await fetch_btc_price();

    const timestamp = Date.now();

    const btc_price_as_fixed_point_uint = Math.floor(btc_price * 10 ** fp_decimal_places);

    const chain = new StacksChain(config.node_url, {
        defaultFee: config.default_fee,
    });

    await chain.loadAccounts();

    const account = chain.accounts.get("deployer")!;

    const address = account.address;

    const secret_key = account.secretKey;

    await register_btc_price_on_chain(btc_price_as_fixed_point_uint, timestamp, chain, address, secret_key);

    console.log(`BTC price ${btc_price} registered at ${timestamp}`);
}

if (process.argv[2] === "--service") {
    console.log('started as a service');
    console.log(`cron schedule string: ${cron_schedule_string}`)

    const job = new cron_job(cron_schedule_string, service);

    job.start();
} else {
    service();
}