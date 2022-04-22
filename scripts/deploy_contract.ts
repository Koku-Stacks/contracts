import { deploy_contract } from "./deploy_utils";

const yargs = require('yargs/yargs');

const argv = yargs(process.argv).argv;

const contract_relative_path: string = argv.contract;

console.log(`Deploy contract: ${contract_relative_path}`);
console.log('------');

async function service() {
    const contract_id = await deploy_contract(contract_relative_path);

    console.log(`${contract_id} successfully deployed`);
}

service();