import { TransactionVersion, uintCV } from "@stacks/transactions";
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk'
import { StacksChain } from "dy-finance.lib";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";

// input parameters:
const testnet = true;
const secretKey = "INPUT_YOUR_KEY_HERE";
const amountToMint = 100000000; // input number of tokens here, including 6 decimals
const destinationAddressToMint = "INPUT_YOUR_ADDRESS_HERE";

/////////////////////////////
let networkEndPoint;
if(testnet) {
    networkEndPoint = "https://stacks-node-api.testnet.stacks.co";
} else {
    networkEndPoint = "https://stacks-node-api.mainnet.stacks.co";
}

const contractName = "token";

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
        let deployerAddress;
        if(testnet) {
            deployerAddress = getStxAddress({ account, transactionVersion: TransactionVersion.Testnet });
        } else {
            deployerAddress = getStxAddress({ account, transactionVersion: TransactionVersion.Mainnet });
        }

        console.log("Deployer address:", deployerAddress);
        console.log("Deployer private key:", wallet.accounts[0].stxPrivateKey);
        const isAuthorizedContract = await chain.callReadOnlyFn(
            deployerAddress,
            contractName,
            "is-authorized",
            [principalCV(deployerAddress)],
            deployerAddress
          );
        if(isAuthorizedContract.value == false){
            console.log("NOT AUTHORIZED");
            const authorizeContract = await chain.callContract(
                deployerAddress,
                contractName,
                "add-authorized-contract",
                [principalCV(deployerAddress)],
                wallet.accounts[0].stxPrivateKey
            );
            console.log("done:", authorizeContract);
          } else {
            console.log("AUTHORIZED");
          }
      
          const tx = await chain.callContract(
            deployerAddress,
            contractName,
            "mint",
            [uintCV(amountToMint), principalCV(destinationAddressToMint)],
            wallet.accounts[0].stxPrivateKey
          );
          console.log("done:", tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();