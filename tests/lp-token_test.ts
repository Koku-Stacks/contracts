
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

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
    name: "Ensure that submit ownership can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('lp-token',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                userB.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(1000);
    }
})

Clarinet.test({
    name: "Ensure that submit ownership transfer cannot be called again if already submitted",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('lp-token',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall('lp-token',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address)
            ]);
        call.receipts[1].result.expectErr().expectUint(2001);
    }
})

Clarinet.test({
    name: "Ensure that cancel ownership can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('lp-token',
                'cancel-ownership-transfer',
                [],
                userB.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(1000);
    }
})

Clarinet.test({
    name: "Ensure that cancel ownership transfer cannot be called for non submitted user",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('lp-token',
                'cancel-ownership-transfer',
                [],
                deployer.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(2002);
    }
})

Clarinet.test({
    name: "Ensure that confirm ownership can only be called when a transfer has been submitted",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('lp-token',
                'confirm-ownership-transfer',
                [],
                userA.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(2003);
    }
})

Clarinet.test({
    name: "Ensure that confirm ownership transfer can only be called by submitted owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('lp-token',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall('lp-token',
                'confirm-ownership-transfer',
                [],
                userA.address)
            ]);
        call.receipts[1].result.expectErr().expectUint(2000);
    }
})

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
