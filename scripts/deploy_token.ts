import { TransactionVersion } from "@stacks/transactions";
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk'
import { readFileSync } from "fs";
import { StacksChain } from "dy-finance.lib";

// input parameters:
const testnet = true;
const secretKey = "INPUT_YOUR_KEY_HERE";

/////////////////////////////
let networkEndPoint;
if(testnet) {
    networkEndPoint = "https://stacks-node-api.testnet.stacks.co";
} else {
    networkEndPoint = "https://stacks-node-api.mainnet.stacks.co";
}
            
const contract_path1 = "traits/mint-trait";
const contract_path2 = "traits/burn-trait";
const contract_path3 = "traits/sip-010-trait-ft-standard";
const contract_path4 = "token";
const contract_name1 = "mint-trait";
const contract_name2 = "burn-trait";
const contract_name3 = "sip-010-trait";
const contract_name4 = "token";

const chain = new StacksChain(networkEndPoint, {
    defaultFee: 100000,
});
const password = "testing_password";

(async () => {
    try {
        const wallet = await generateWallet({
            secretKey,
            password,
        });
        const account = wallet.accounts[0];
        if(testnet) {
            const deployerAddress = getStxAddress({ account, transactionVersion: TransactionVersion.Testnet });
            console.log("Deployer address:", deployerAddress);
        } else {
            const deployerAddress = getStxAddress({ account, transactionVersion: TransactionVersion.Mainnet });
            console.log("Deployer address:", deployerAddress);
        }

        console.log("Deployer private key:", wallet.accounts[0].stxPrivateKey);

        // 1
        console.log("Deploying contract:", contract_name1);
        let contract_code = readFileSync(`contracts/${contract_path1}.clar`).toString();
        let smartContractId = await chain.deployContract(
            contract_name1,
            contract_code,
            wallet.accounts[0].stxPrivateKey
        );
        // 2
        console.log("Deploying contract:", contract_name2);
        contract_code = readFileSync(`contracts/${contract_path2}.clar`).toString();
        smartContractId = await chain.deployContract(
            contract_name2,
            contract_code,
            wallet.accounts[0].stxPrivateKey
        );
        // 3
        console.log("Deploying contract:", contract_name3);
        contract_code = readFileSync(`contracts/${contract_path3}.clar`).toString();
        smartContractId = await chain.deployContract(
            contract_name3,
            contract_code,
            wallet.accounts[0].stxPrivateKey
        );
        // 4
        console.log("Deploying contract:", contract_name4);
        contract_code = readFileSync(`contracts/${contract_path4}.clar`).toString();
        smartContractId = await chain.deployContract(
            contract_name4,
            contract_code,
            wallet.accounts[0].stxPrivateKey
        );
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();