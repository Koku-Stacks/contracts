import axios from "axios";

async function fetch_future_price_from_deribit(): Promise<number> {
    try {
        const result = await axios.get("https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=future");

        return parseFloat(result.data.result.find((entry) => entry.instrument_name === 'BTC-PERPETUAL').mark_price);
    } catch (error) {
        console.error(error);
        
        return -1;
    }
}

async function fetch_future_price_from_ftx(): Promise<number> {
    try {
        const result = await axios.get("https://ftx.com/api/futures/BTC-PERP")

        return parseFloat(result.data.result.mark);
    } catch (error) {
        console.log(error);

        return -1;
    }
}

