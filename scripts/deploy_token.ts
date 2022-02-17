import { TransactionVersion } from "@stacks/transactions";
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk'
import { readFileSync } from "fs";
import { StacksChain } from "../integration/framework/stacks.chain";

// input parameters:
const networkEndPoint = "https://stacks-node-api.testnet.stacks.co";
const secretKey = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw";
const contract_name = "dyv-token";
/////////////////////////////

const chain = new StacksChain(networkEndPoint, {
    defaultFee: 100000,
  });
const password = "testing_password";

const contract_path = `contracts/${contract_name}.clar`;
const contract_code = readFileSync(contract_path).toString();

console.log("Deploy contract:", contract_path);

(async () => {
    try {
        const wallet = await generateWallet({
            secretKey,
            password,
          });
        const account = wallet.accounts[0];
        const deployerAddress = getStxAddress({ account, transactionVersion: TransactionVersion.Testnet });
        console.log("Deployer address:", deployerAddress);
        console.log("Deployer private key:", wallet.accounts[0].stxPrivateKey);

        // create contract
        const smartContractId = await chain.deployContract(
            contract_name,
            contract_code,
            wallet.accounts[0].stxPrivateKey
        );
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();
