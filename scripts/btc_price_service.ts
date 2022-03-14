import { TransactionVersion, uintCV } from "@stacks/transactions";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";
import { readFileSync } from "fs";
import { StacksChain } from "../integration/framework/stacks.chain";

const axios = require('axios').default;

const coinmarketcap_api_key = "0acaf66d-e715-4d7b-bae2-f7648453f8e6";
const nomics_api_key = "3bf7ef015adadeaa258ffca8145c56c7475e427d";
const outlier_price_margin = 0.05;
const price_fetching_interval_ms = 60000;
const contract_name = "current-price";
const method_name = "update-price";
const fp_decimal_places = 6;

const config = read_config();

function read_config() {
    const raw_file_content = readFileSync('stacks_config.json');

    const json_config = JSON.parse(raw_file_content.toString());

    return json_config;
}

async function fetch_btc_price_from_coinbase(): Promise<number> {
    try {
        const response = await axios.get('https://api.coinbase.com/v2/prices/spot?currency=USD')

        return parseFloat(response.data.data.amount)
    } catch (error) {
        console.error(error);
    }
}

async function fetch_btc_price_from_gemini(): Promise<number> {
    try {
        const response = await axios.get('https://api.gemini.com/v1/pricefeed');

        return parseFloat(response.data.find((entry) => entry.pair === "BTCUSD").price);
    } catch (error) {
        console.error(error);
    }
}

async function fetch_btc_price_from_coindesk(): Promise<number> {
    try {
        const response = await axios.get('https://api.coindesk.com/v1/bpi/currentprice.json');

        return parseFloat(response.data.bpi.USD.rate_float);
    } catch (error) {
        console.error(error);
    }
}

async function fetch_btc_price_from_messari(): Promise<number> {
    try {
        const response = await axios.get('https://data.messari.io/api/v1/assets/btc/metrics');

        return parseFloat(response.data.data.market_data.price_usd);
    } catch (error) {
        console.error(error);
    }
}

async function fetch_btc_price_from_coingecko(): Promise<number> {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin');

        return parseFloat(response.data.find((entry) => entry.id === "bitcoin").current_price);
    } catch (error) {
        console.error(error);
    }
}

async function fetch_btc_price_from_coinmarketcap(): Promise<number> {
    try {
        const request_url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=1';

        const response = await axios.get(request_url, { headers: { 'X-CMC_PRO_API_KEY': coinmarketcap_api_key } });

        return parseFloat(response.data.data.find((entry) => entry.name === 'Bitcoin').quote.USD.price);
    } catch (error) {
        console.error(error);
    }
}

async function fetch_btc_price_from_nomics(): Promise<number> {
    try {
        const request_url = `https://api.nomics.com/v1/currencies/ticker?key=${nomics_api_key}&ids=BTC&per-page=1&page=1`

        const response = await axios.get(request_url);

        return parseFloat(response.data.find((entry) => entry.id === 'BTC').price);
    } catch (error) {
        console.error(error);
    }
}

function average(prices: number[]): number {
    const total = prices.reduce((acc, curr) => acc + curr, 0);

    return total / prices.length;
}

function within_margin(x: number, y: number, margin: number): boolean {
    const delta = y * margin;

    return x >= y - delta && x <= y + delta;
}

function drop_outliers(prices: number[], average: number, margin: number): number[] {
    return prices.filter((price) => within_margin(price, average, margin));
}

async function calculate_btc_price_average(price_sources: Array<() => Promise<number>>): Promise<number> {
    const price_promises = price_sources.map((price_source) => price_source());

    const prices = await Promise.all(price_promises);

    const average_price = average(prices);

    const non_outlier_prices = drop_outliers(prices, average_price, outlier_price_margin);

    return average(non_outlier_prices);
}

const transaction_version = get_transaction_version(config.network_type);

function get_transaction_version(network_type): TransactionVersion {
    if (network_type === 'mainnet') {
        return TransactionVersion.Mainnet;
    } else {
        return TransactionVersion.Testnet;
    }
}

const networkEndPoint = config.node_url;

const chain = new StacksChain(networkEndPoint, {
    defaultFee: config.default_fee,
});

async function register_btc_price_on_chain(btc_price: number, timestamp: number) {
    const wallet = await generateWallet({
        secretKey: config.seed_phrase,
        password: "testing_password"
    });

    const account = wallet.accounts[0];

    const address = getStxAddress({ account, transactionVersion: transaction_version });

    const btc_price_as_fixed_point_uint = Math.floor(btc_price * 10 ** fp_decimal_places);

    const tx_id = await chain.callContract(
        address,
        contract_name,
        method_name,
        [uintCV(btc_price_as_fixed_point_uint), uintCV(timestamp)],
        account.stxPrivateKey
    )

    return tx_id;
}

const btc_price_sources = [
    fetch_btc_price_from_coinbase,
    fetch_btc_price_from_coindesk,
    fetch_btc_price_from_coingecko,
    fetch_btc_price_from_coinmarketcap,
    fetch_btc_price_from_gemini,
    fetch_btc_price_from_messari,
    fetch_btc_price_from_nomics
];

async function service_iteration() {
    const btc_price = await calculate_btc_price_average(btc_price_sources);

    const timestamp = Date.now();

    const transaction_id = await register_btc_price_on_chain(btc_price, timestamp);

    console.log(`BTC price ${btc_price} registered at ${new Date(timestamp).toString()} by transaction ${transaction_id}`);
}

async function service() {
    console.log("Parameters:");
    console.log(`-- node url: ${config.node_url}`);
    console.log(`-- network type: ${config.network_type}`);
    console.log(`-- default fee: ${config.default_fee}`);
    console.log('------');

    setInterval(service_iteration, price_fetching_interval_ms);
}

service();
