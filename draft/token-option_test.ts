
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const ERR_NOT_AUTHORIZED = 1000; 
const ERR_INVALID_SENDER = 111;
const ERR_INSUFFICIENT_BALANCE = 110;
const ERR_CONTRACT_OWNER_ONLY = 103;
const ERR_AMOUNT_IS_NON_POSITIVE = 112;

const defaultPaymentAssetContract = 'token-option';

function mintFt({ chain, deployer, amount, token_id, recipient, paymentAssetContract = defaultPaymentAssetContract }: { chain: Chain, deployer: Account, amount: number, token_id: number, recipient: Account, paymentAssetContract?: string }) {
    const block = chain.mineBlock([
        Tx.contractCall(paymentAssetContract, 'mint', [types.uint(token_id), types.uint(amount), types.principal(recipient.address)], deployer.address),
    ]);
    block.receipts[0].result.expectOk();
    const ftMintEvent = block.receipts[0].events[0].ft_mint_event;
    const [paymentAssetContractPrincipal, paymentAssetId] = ftMintEvent.asset_identifier.split('::');
    return { paymentAssetContract: paymentAssetContractPrincipal, paymentAssetId, block };
}



Clarinet.test({
    name: "Ensure that set-token-uri can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('token-option',
                'set-token-uri',
                [types.utf8("https://dy.finance/")],
                userA.address),
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_NOT_AUTHORIZED);
    }
})

Clarinet.test({
    name: "Ensure that transfer can only be called by token owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'token-option',
                'transfer',
                [ 
                    types.uint(101),
                    types.uint(1000),
                    types.principal(userA.address),
                    types.principal(deployer.address),
                    
                ],
                deployer.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_INVALID_SENDER);
    },
});


Clarinet.test({
    name: "Ensure that transfer is working!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const Price = 50;
        const { paymentAssetContract, paymentAssetId } = mintFt({ chain, deployer, amount: 100, token_id: 101, recipient: deployer});
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'token-option',
                'transfer',
                [ 
                    types.uint(101),
                    types.uint(Price),
                    types.principal(deployer.address),
                    types.principal(userA.address),
                    
                ],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true);

        call.receipts[0].events.expectFungibleTokenTransferEvent(Price, deployer.address, userA.address, paymentAssetId);
    },
});

Clarinet.test({
    name: "Ensure that transfer is not more than the balance!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'token-option',
                'mint',
                [ 
                    types.uint(101),
                    types.uint(100),
                    types.principal(deployer.address),
                    
                ],
                deployer.address),
            Tx.contractCall(
                'token-option',
                'transfer',
                [ 
                    types.uint(101),
                    types.uint(1000),
                    types.principal(deployer.address),
                    types.principal(userA.address),
                    
                ],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk();
        call.receipts[1].result.expectErr().expectUint(ERR_INSUFFICIENT_BALANCE);
    },
});

Clarinet.test({
    name: "Ensure that minting function is working",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'token-option',
                'mint',
                [ 
                    types.uint(1001),
                    types.uint(10),
                    types.principal(userA.address),
                    
                ],
                deployer.address),
        ]);

        call.receipts[0].result.expectOk();
        call.receipts[0].events.expectFungibleTokenMintEvent(10, userA.address, "sft");


    },
});

Clarinet.test({
    name: "Ensure that burn function is working",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const Price = 50;
        const { paymentAssetContract, paymentAssetId } = mintFt({ chain, deployer, amount: 100, token_id: 101, recipient: deployer});
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'token-option',
                'burn',
                [ 
                    types.uint(101),
                    types.uint(10),
                    types.principal(deployer.address),
                    
                    
                ],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk();
        call.receipts[0].events.expectFungibleTokenBurnEvent(10, deployer.address, paymentAssetId);


    },
});

Clarinet.test({
    name: "Ensure that minting function is only called by the contract owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'token-option',
                'mint',
                [ 
                    types.uint(1000),
                    types.uint(10),
                    types.principal(userA.address),
                    
                ],
                userA.address),
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);
    },
});

Clarinet.test({
    name: "Ensure that amount is greater than 0 while minting",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'token-option',
                'mint',
                [ 
                    types.uint(1000),
                    types.uint(0),
                    types.principal(userA.address),
                    
                ],
                deployer.address),
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_AMOUNT_IS_NON_POSITIVE);
    },
});

Clarinet.test({
    name: "Ensure that burn doesn't work on less balance",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let readOnlyCall = chain.callReadOnlyFn('token-option', 'get-balance', [types.uint(10), types.principal(deployer.address)], deployer.address);
        readOnlyCall.result.expectOk().expectUint(0);
        

        let call = chain.mineBlock([
            Tx.contractCall(
                'token-option',
                'burn',
                [ 
                    types.uint(1000),
                    types.uint(10),
                    types.principal(deployer.address),
                    
                ],
                deployer.address),
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_INSUFFICIENT_BALANCE);
    },
});

