
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const dyvToken = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dyv-token"

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

Clarinet.test({
    name: "Ensure that deposit and withdraw are working fine",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'dyv-token',
                'add-authorized-contract',
                [ 
                    types.principal(deployer.address),
                ],
                deployer.address),
            Tx.contractCall(
                'dyv-token',
                'mint',
                [ 
                    types.uint(1000),
                    types.principal(userA.address),
                ],
                deployer.address),
            Tx.contractCall(
                'dyv-vault',
                'deposit',
                [ 
                    types.principal(dyvToken),
                    types.uint(100)
                ],
                userA.address),
            Tx.contractCall(
                'dyv-vault',
                'withdraw',
                [ 
                    types.principal(dyvToken),
                    types.uint(100)
                ],
                userA.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true)
        call.receipts[1].result.expectOk().expectBool(true)
        call.receipts[2].result.expectOk().expectBool(true)
        call.receipts[3].result.expectOk().expectBool(true)
    },
});
