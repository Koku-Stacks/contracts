
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

Clarinet.test({
    name: "Ensure circular buffer can be initialized",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'circular-buffer',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Ensure an meaningful item can be retrieved just after SIZE items have been inserted in buffer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'circular-buffer',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        for (let element = 1; element <= 10; element++) {
            call = chain.mineBlock([
                Tx.contractCall(
                    'circular-buffer',
                    'put-item',
                    [types.uint(element)],
                    deployer.address)
            ]);
        }

        call = chain.mineBlock([
            Tx.contractCall(
                'circular-buffer',
                'get-item',
                [],
                deployer.address)
        ]);

        call.receipts[0].result.expectUint(1);
    }
});

Clarinet.test({
    name: "Ensure the same meaningful item can be retrieved twice in a row if no other insertions are made",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'circular-buffer',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        for (let element = 1; element <= 10; element++) {
            call = chain.mineBlock([
                Tx.contractCall(
                    'circular-buffer',
                    'put-item',
                    [types.uint(element)],
                    deployer.address)
            ]);
        }

        call = chain.mineBlock([
            Tx.contractCall(
                'circular-buffer',
                'get-item',
                [],
                deployer.address)
        ]);

        call.receipts[0].result.expectUint(1);

        call = chain.mineBlock([
            Tx.contractCall(
                'circular-buffer',
                'get-item',
                [],
                deployer.address)
        ]);

        call.receipts[0].result.expectUint(1);
    }
});

Clarinet.test({
    name: "Ensure excessive insertions make the oldest content be overwritten",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'circular-buffer',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true);

        for (let element = 1; element <= 11; element++) {
            call = chain.mineBlock([
                Tx.contractCall(
                    'circular-buffer',
                    'put-item',
                    [types.uint(element)],
                    deployer.address)
            ]);
        }

        call = chain.mineBlock([
            Tx.contractCall(
                'circular-buffer',
                'get-item',
                [],
                deployer.address)
        ]);

        call.receipts[0].result.expectUint(2);
    },
});