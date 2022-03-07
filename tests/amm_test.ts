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
    name: "Ensure that deposit and withdraw are working fine",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const token = `${deployer.address}.token`;
        const amm = `${deployer.address}.amm`;

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
                'amm',
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

        balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(amm)], userA.address);
        balance.result.expectOk().expectUint(100);

        let call2 = chain.mineBlock([
            Tx.contractCall(
                'amm',
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

        balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(amm)], userA.address);
        balance.result.expectOk().expectUint(0);
    },
});

Clarinet.test({
    name: "Ensure that set-token-uri can only be called by contract owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        
        let call = chain.mineBlock([
            Tx.contractCall(
                'amm',
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
                'amm',
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