import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_NOT_INITIALIZED = 100;
const ERR_EMPTY = 101;
const ERR_CONTRACT_OWNER_ONLY = 103;

Clarinet.test({
    name: "Ensure amm can be initialized",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Ensure amm can only be initialized by owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'initialize-or-reset',
                [],
                userA.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);
    },
});

Clarinet.test({
    name: "Ensure get-item fails when called before the circular buffer is initialized",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.callReadOnlyFn(
            'amm',
            'get-item',
            [],
            deployer.address
        );

        call.result.expectErr().expectUint(ERR_NOT_INITIALIZED);
    },
});

Clarinet.test({
    name: "Ensure add-btc-price fails when called before the circular buffer is initialized",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'add-btc-price',
                [types.uint(1)],
                deployer.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_NOT_INITIALIZED);
    },
});

Clarinet.test({
    name: "Ensure add-btc-price fails when called by a non-owner principal",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'add-btc-price',
                [types.uint(1)],
                userA.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);
    },
});

Clarinet.test({
    name: "Ensure get-item fails when called with an empty buffer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        let getItemCall = chain.callReadOnlyFn(
            'amm',
            'get-item',
            [],
            deployer.address
        );

        getItemCall.result.expectErr().expectUint(ERR_EMPTY);

        call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'add-btc-price',
                [types.uint(1)],
                deployer.address)
        ]);

        getItemCall = chain.callReadOnlyFn(
            'amm',
            'get-item',
            [],
            deployer.address
        );

        getItemCall.result.expectErr().expectUint(ERR_EMPTY);
    },
});

Clarinet.test({
    name: "Ensure a meaningful item can be retrieved just after SIZE items have been inserted in buffer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        for (let element = 1; element <= 10; element++) {
            call = chain.mineBlock([
                Tx.contractCall(
                    'amm',
                    'add-btc-price',
                    [types.uint(element)],
                    deployer.address)
            ]);
        }

        let getItemCall = chain.callReadOnlyFn(
            'amm',
            'get-item',
            [],
            deployer.address
        );

        const getItemReturn = getItemCall.result.expectOk().expectTuple() as any;
        getItemReturn['btc-price'].expectUint(1);
    }
});

Clarinet.test({
    name: "Ensure the same meaningful item can be retrieved twice in a row if no other insertions are made",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        for (let element = 1; element <= 10; element++) {
            call = chain.mineBlock([
                Tx.contractCall(
                    'amm',
                    'add-btc-price',
                    [types.uint(element)],
                    deployer.address)
            ]);
        }

        let getItemCall = chain.callReadOnlyFn(
            'amm',
            'get-item',
            [],
            deployer.address
        );

        let getItemReturn = getItemCall.result.expectOk().expectTuple() as any;
        getItemReturn['btc-price'].expectUint(1);

        getItemCall = chain.callReadOnlyFn(
            'amm',
            'get-item',
            [],
            deployer.address
        );

        getItemReturn = getItemCall.result.expectOk().expectTuple() as any;
        getItemReturn['btc-price'].expectUint(1);
    }
});

Clarinet.test({
    name: "Ensure excessive insertions make the oldest content be overwritten",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'amm',
                'initialize-or-reset',
                [],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true);

        for (let element = 1; element <= 11; element++) {
            call = chain.mineBlock([
                Tx.contractCall(
                    'amm',
                    'add-btc-price',
                    [types.uint(element)],
                    deployer.address)
            ]);
        }

        let getItemCall = chain.callReadOnlyFn(
            'amm',
            'get-item',
            [],
            deployer.address
        );

        const getItemReturn = getItemCall.result.expectOk().expectTuple() as any;
        getItemReturn['btc-price'].expectUint(2);
    },
});

Clarinet.test({
    name: "Ensure that deposit and withdraw takes a valid token",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const token = `${deployer.address}.token1`;

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
                'amm',
                'deposit',
                [ 
                    types.principal(token),
                    types.uint(100),
                    types.none()
                ],
                userA.address),
            Tx.contractCall(
                'amm',
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
        call.receipts[2].result.expectErr().expectUint(3000)
        call.receipts[3].result.expectErr().expectUint(3000)
    }
});

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
                'amm',
                'deposit',
                [ 
                    types.principal(token),
                    types.uint(100),
                    types.none()
                ],
                userA.address),
            Tx.contractCall(
                'amm',
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