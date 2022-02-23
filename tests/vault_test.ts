
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that deposit and withdraw are working fine",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const token = `${deployer.address}.token`;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'token',
                'add-authorized-contract',
                [ 
                    types.principal(deployer.address),
                ],
                deployer.address),
            Tx.contractCall(
                'token',
                'mint',
                [ 
                    types.uint(1000),
                    types.principal(userA.address),
                ],
                deployer.address),
            Tx.contractCall(
                'vault',
                'deposit',
                [ 
                    types.principal(token),
                    types.uint(100),
                    types.none()
                ],
                userA.address),
            Tx.contractCall(
                'vault',
                'withdraw',
                [ 
                    types.principal(token),
                    types.uint(100),
                    types.none()
                ],
                userA.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true)
        call.receipts[1].result.expectOk().expectBool(true)
        call.receipts[2].result.expectOk().expectBool(true)
        call.receipts[3].result.expectOk().expectBool(true)
    },
});
