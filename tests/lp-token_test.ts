
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that set-owner can only be called by contract owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'lp-token',
                'set-owner',
                [ types.principal(userA.address)],
                userA.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(1000)
    },
});

Clarinet.test({
    name: "Ensure that set-token-uri can only be called by contract owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'lp-token',
                'set-token-uri',
                [ types.utf8("www.dyv.com")],
                userA.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(1000)
    },
});

Clarinet.test({
    name: "Ensure that transfer can only be called by token owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'lp-token',
                'transfer',
                [ 
                    types.uint(100),
                    types.principal(userA.address),
                    types.principal(deployer.address),
                    types.none()
                ],
                deployer.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(1001)
    },
});

Clarinet.test({
    name: "Ensure that mint can only be called by approved contracts",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'lp-token',
                'mint',
                [ 
                    types.uint(100),
                    types.principal(userA.address),
                ],
                userA.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(1000)
    },
});

Clarinet.test({
    name: "Ensure that burn can only be called by approved contracts",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'lp-token',
                'burn',
                [ 
                    types.uint(100),
                ],
                userA.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(1000)
    },
});
