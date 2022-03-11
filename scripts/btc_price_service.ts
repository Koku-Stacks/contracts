import { StacksMainnet, StacksTestnet } from "@stacks/network";
import { AnchorMode, broadcastTransaction, makeContractCall, uintCV } from "@stacks/transactions";
import { generateWallet } from "@stacks/wallet-sdk";
import { readFileSync } from "fs";

const axios = require('axios').default;

const config = read_config();

function read_config() {
    const raw_file_content = readFileSync('btc_price_service_config.json');

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
        const api_key = config.coinmarketcap_api_key;

        const response = await axios.get(request_url, { headers: { 'X-CMC_PRO_API_KEY': api_key } });

        return parseFloat(response.data.data.find((entry) => entry.name === 'Bitcoin').quote.USD.price);
    } catch (error) {
        console.error(error);
    }
}

async function fetch_btc_price_from_nomics(): Promise<number> {
    try {
        const api_key = config.nomics_api_key;
        const request_url = `https://api.nomics.com/v1/currencies/ticker?key=${api_key}&ids=BTC&per-page=1&page=1`

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

    const outlier_margin = config.outlier_price_margin;

    const average_price = average(prices);

    const non_outlier_prices = drop_outliers(prices, average_price, outlier_margin);

    return average(non_outlier_prices);
}

async function register_btc_price_on_chain(btc_price: number, timestamp: number) {
    let network_builder = StacksTestnet;
    if (config.btc_price_contract.network_type === 'mainnet') {
        network_builder = StacksMainnet;
    }

    const network = new network_builder({url: config.btc_price_contract.node_url});

    const wallet = generateWallet({
        secretKey: config.price_sender.secret_key,
        password: config.price_sender.password
    });

    const btc_price_as_fixed_point_uint = Math.floor(btc_price * 10 ** config.btc_price_contract.fp_decimal_places);

    const postConditions = [];

    const tx_options = {
        contractAddress: config.btc_price_contract.address,
        contractName: config.btc_price_contract.name,
        functionName: config.btc_price_contract.function,
        functionArgs: [uintCV(btc_price_as_fixed_point_uint), uintCV(timestamp)],
        senderKey: (await wallet).accounts[0].stxPrivateKey,
        validateWithAbi: true,
        network,
        postConditions,
        anchorMode: AnchorMode.Any
    };

    const transaction = await makeContractCall(tx_options);

    const response = await broadcastTransaction(transaction, network);

    return response.txid;
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
    console.log(`-- Outlier price margin: ${config.outlier_price_margin}`);
    console.log(`-- Price fetching interval (ms): ${config.price_fetching_interval}`);
    console.log(`-- BTC price contract:`);
    console.log(`-- -- node url: ${config.btc_price_contract.node_url}`);
    console.log(`-- -- network type: ${config.btc_price_contract.network_type}`);
    console.log(`-- -- address: ${config.btc_price_contract.address}`);
    console.log(`-- -- name: ${config.btc_price_contract.name}`);
    console.log(`-- -- function: ${config.btc_price_contract.function}`);
    console.log(`-- -- fixed point decimal places: ${config.btc_price_contract.fp_decimal_places}`);

    setInterval(service_iteration, config.price_fetching_interval);
}

service();