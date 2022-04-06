import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_TOO_SOON_TO_WITHDRAW = 4000;

Clarinet.test({
    name: "Ensure that deposit and withdraw are working fine",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const vault = `${deployer.address}.vault`;
        const timestamp_vault_accessor = `${deployer.address}.timestamp-vault-accessor`;

        let call1 = chain.mineBlock([
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
                'authorize-contract',
                [
                    types.principal(timestamp_vault_accessor)
                ],
                deployer.address)
        ]);

        call1.receipts[0].result.expectOk().expectBool(true)
        call1.receipts[1].result.expectOk().expectBool(true)
        call1.receipts[2].result.expectOk().expectBool(true)

        let call2 = chain.mineBlock([
            Tx.contractCall(
                'timestamp-vault-accessor',
                'deposit',
                [types.uint(100), types.none()],
                userA.address
            )
        ])

        let balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(userA.address)], userA.address);
        balance.result.expectOk().expectUint(900);

        balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(vault)], userA.address);
        balance.result.expectOk().expectUint(100);

        let balance_in_vault = chain.callReadOnlyFn('vault', 'get-balance', [types.principal(userA.address)], userA.address);
        balance_in_vault.result.expectUint(100);

        let call3 = chain.mineBlock([
            Tx.contractCall(
                'timestamp-vault-accessor',
                'withdraw',
                [
                    types.uint(100),
                    types.none()
                ],
                userA.address)
        ]);

        call2.receipts[0].result.expectOk().expectBool(true);

        balance_in_vault = chain.callReadOnlyFn('vault', 'get-balance', [types.principal(userA.address)], userA.address);
        balance_in_vault.result.expectUint(0);

        balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(userA.address)], userA.address);
        balance.result.expectOk().expectUint(1000);

        balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(vault)], userA.address);
        balance.result.expectOk().expectUint(0);
    },
});

Clarinet.test({
    name: "Ensure the cooldown mechanism works as expected",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        const call1 = chain.mineBlock([
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
                'authorize-contract',
                [
                    types.principal(`${deployer.address}.timestamp-vault-accessor`)
                ],
                deployer.address
            ),
            Tx.contractCall(
                'timestamp-vault-accessor',
                'set-cooldown',
                [
                    types.uint(1),
                ],
                deployer.address)
        ]);

        call1.receipts[0].result.expectOk().expectBool(true);
        call1.receipts[1].result.expectOk().expectBool(true);
        call1.receipts[2].result.expectOk().expectBool(true);

        const call2 = chain.mineBlock([
            Tx.contractCall(
                'timestamp-vault-accessor',
                'deposit',
                [
                    types.uint(100),
                    types.none()
                ],
                userA.address)
        ]);

        call2.receipts[0].result.expectOk().expectBool(true);

        const call3 = chain.mineBlock([
            Tx.contractCall(
                'timestamp-vault-accessor',
                'withdraw',
                [
                    types.uint(10),
                    types.none()
                ],
                userA.address
            )
        ]);

        call3.receipts[0].result.expectErr().expectUint(ERR_TOO_SOON_TO_WITHDRAW);

        chain.mineEmptyBlock(100);

        const call4 = chain.mineBlock([
            Tx.contractCall(
                'timestamp-vault-accessor',
                'withdraw',
                [
                    types.uint(10),
                    types.none()
                ],
                userA.address
            )
        ]);

        // FIXME clarinet needs to properly support block timestamp in order to test for the positive case 
        // call4.receipts[0].result.expectOk().expectBool(true);
    },
});