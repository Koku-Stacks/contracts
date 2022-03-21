
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_NOT_AUTHORIZED = 1000;
const ERR_NOT_NEW_OWNER = 2000;
const ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED = 2001;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL = 2002;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM = 2003;
const ERR_TOO_SOON_TO_WITHDRAW = 4000;

Clarinet.test({
    name: "Ensure that submit ownership can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userB = accounts.get('wallet_2')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('vault',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                userB.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_NOT_AUTHORIZED);
    }
})

Clarinet.test({
    name: "Ensure that submit ownership transfer cannot be called again if already submitted",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userB = accounts.get('wallet_2')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('vault',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall('vault',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address)
            ]);
        call.receipts[1].result.expectErr().expectUint(ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED);
    }
})

Clarinet.test({
    name: "Ensure that cancel ownership can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userB = accounts.get('wallet_2')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('vault',
                'cancel-ownership-transfer',
                [],
                userB.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_NOT_AUTHORIZED);
    }
})

Clarinet.test({
    name: "Ensure that cancel ownership transfer cannot be called for non submitted user",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('vault',
                'cancel-ownership-transfer',
                [],
                deployer.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL);
    }
})

Clarinet.test({
    name: "Ensure that confirm ownership can only be called when a transfer has been submitted",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('vault',
                'confirm-ownership-transfer',
                [],
                userA.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM);
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
                Tx.contractCall('vault',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall('vault',
                'confirm-ownership-transfer',
                [],
                userA.address)
            ]);
        call.receipts[1].result.expectErr().expectUint(ERR_NOT_NEW_OWNER);
    }
})

Clarinet.test({
    name: "Ensure that deposit and withdraw are working fine",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const vault = `${deployer.address}.vault`;

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
                'deposit',
                [ 
                    types.uint(100),
                    types.none()
                ],
                userA.address)
        ]);

        call1.receipts[0].result.expectOk().expectBool(true)
        call1.receipts[1].result.expectOk().expectBool(true)
        call1.receipts[2].result.expectOk().expectBool(true)

        let balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(userA.address)], userA.address);
        balance.result.expectOk().expectUint(900);

        balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(vault)], userA.address);
        balance.result.expectOk().expectUint(100);

        let call2 = chain.mineBlock([
            Tx.contractCall(
                'vault',
                'withdraw',
                [ 
                    types.uint(100),
                    types.none()
                ],
                userA.address)
        ]);

        call2.receipts[0].result.expectOk().expectBool(true)

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
                'set-cooldown',
                [
                    types.uint(100),
                ],
                deployer.address)
        ]);

        call1.receipts[0].result.expectOk().expectBool(true);
        call1.receipts[1].result.expectOk().expectBool(true);
        call1.receipts[2].result.expectOk().expectBool(true);

        const call2 = chain.mineBlock([
            Tx.contractCall(
                'vault',
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
                'vault',
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
                'vault',
                'withdraw',
                [
                    types.uint(10),
                    types.none()
                ],
                userA.address
            )
        ]);

        call4.receipts[0].result.expectOk().expectBool(true);
    },
});
