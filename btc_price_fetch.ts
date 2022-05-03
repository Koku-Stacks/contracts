const axios = require('axios').default;

const coinmarketcap_api_key = "0acaf66d-e715-4d7b-bae2-f7648453f8e6";
const nomics_api_key = "3bf7ef015adadeaa258ffca8145c56c7475e427d";
const outlier_price_margin = 0.05;
const price_fetching_timeout_ms = 1000;

async function fetch_btc_price_from_coinbase(): Promise<number> {
    try {
        const response = await axios.get('https://api.coinbase.com/v2/prices/spot?currency=USD')

        return parseFloat(response.data.data.amount)
    } catch (error) {
        console.error(error);

        return -1;
    }
}

async function fetch_btc_price_from_gemini(): Promise<number> {
    try {
        const response = await axios.get('https://api.gemini.com/v1/pricefeed');

        return parseFloat(response.data.find((entry: any) => entry.pair === "BTCUSD").price);
    } catch (error) {
        console.error(error);

        return -1;
    }
}

async function fetch_btc_price_from_coindesk(): Promise<number> {
    try {
        const response = await axios.get('https://api.coindesk.com/v1/bpi/currentprice.json');

        return parseFloat(response.data.bpi.USD.rate_float);
    } catch (error) {
        console.error(error);

        return -1;
    }
}

async function fetch_btc_price_from_messari(): Promise<number> {
    try {
        const response = await axios.get('https://data.messari.io/api/v1/assets/btc/metrics');

        return parseFloat(response.data.data.market_data.price_usd);
    } catch (error) {
        console.error(error);

        return -1;
    }
}

async function fetch_btc_price_from_coingecko(): Promise<number> {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin');

        return parseFloat(response.data.find((entry: any) => entry.id === "bitcoin").current_price);
    } catch (error) {
        console.error(error);

        return -1;
    }
}

async function fetch_btc_price_from_coinmarketcap(): Promise<number> {
    try {
        const request_url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=1';

        const response = await axios.get(request_url, { headers: { 'X-CMC_PRO_API_KEY': coinmarketcap_api_key } });

        return parseFloat(response.data.data.find((entry: any) => entry.name === 'Bitcoin').quote.USD.price);
    } catch (error) {
        console.error(error);

        return -1;
    }
}

async function fetch_btc_price_from_nomics(): Promise<number> {
    try {
        const request_url = `https://api.nomics.com/v1/currencies/ticker?key=${nomics_api_key}&ids=BTC&per-page=1&page=1`

        const response = await axios.get(request_url);

        return parseFloat(response.data.find((entry: any) => entry.id === 'BTC').price);
    } catch (error) {
        console.error(error);

        return -1;
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

function promiseTimeoutDefaultValue<T>(promise: Promise<T>, timeout: number, default_value: T): Promise<T> {
    const timeout_promise: Promise<T> = new Promise((resolve, _reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            resolve(default_value);
        }, timeout);
    });

    return Promise.race([promise, timeout_promise]);
}

async function calculate_btc_price_average(price_sources: Array<() => Promise<number>>): Promise<number> {
    const price_promises = price_sources.map((price_source) => price_source());

    const price_promises_with_timeout = price_promises.map(
        (price_promise) => promiseTimeoutDefaultValue(price_promise, price_fetching_timeout_ms, -1)
    );

    const prices = await Promise.all(price_promises_with_timeout);

    const non_time_out_prices = prices.filter((price) => price !== -1);

    const average_price = average(non_time_out_prices);

    const non_outlier_prices = drop_outliers(prices, average_price, outlier_price_margin);

    return average(non_outlier_prices);
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

export async function fetch_btc_price(): Promise<number> {
    return calculate_btc_price_average(btc_price_sources);
}