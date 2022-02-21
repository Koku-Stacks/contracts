
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that set-owner can only be called by contract owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'dyv-vault',
                'set-owner',
                [ types.principal(userA.address)],
                userA.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(1000)
    },
});
