import { generateWallet, generateSecretKey, getStxAddress } from '@stacks/wallet-sdk'
import { TransactionVersion } from '@stacks/transactions';
const secretKey = generateSecretKey();

console.log('Secret key:', secretKey);
let password = 'password';

(async () => {
    try {

        const wallet = await generateWallet({
            secretKey,
            password,
          });

        const account = wallet.accounts[0];
        console.log(account);

        const testnetAddress = getStxAddress({ account, transactionVersion: TransactionVersion.Testnet });
        const mainnetAddress = getStxAddress({ account, transactionVersion: TransactionVersion.Mainnet});

        console.log(testnetAddress);
        console.log(mainnetAddress);
        
    } catch (e) {
        // Deal with the fact the chain failed
    }
})();

