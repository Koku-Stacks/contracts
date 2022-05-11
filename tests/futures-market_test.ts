import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_NOT_AUTHORIZED = 1000;
const ERR_NOT_NEW_OWNER = 2000;
const ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED = 2001;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL = 2002;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM = 2003;
const ERR_CONTRACT_NOT_INITIALIZED = 3005;

const futures_market_contract = "futures-market";
const token_contract = "token";

function prepare_time_tick_facilities(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    const increment_tick = (): string => {
        const block = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                "increment-tick",
                [],
                deployer.address
            )
        ]);

        return block.receipts[0].result;
    };

    const get_current_timestamp = (): string => {
        const call = chain.callReadOnlyFn(
            futures_market_contract,
            "get-current-timestamp",
            [],
            deployer.address
        );

        return call.result
    };

    return {inc_tick: increment_tick, curr_timestamp: get_current_timestamp};
}

function initialize_contract_in_test_mode(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
        Tx.contractCall(
            futures_market_contract,
            'initialize',
            [
                types.principal(`${deployer.address}.${token_contract}`),
                types.bool(true)
            ],
            deployer.address
        )
    ]);

    return block.receipts[0].result;
}

function unit_test_setup(chain: Chain, accounts: Map<string, Account>) {
    initialize_contract_in_test_mode(chain, accounts);
    
    const time_tick_facilities = prepare_time_tick_facilities(chain, accounts);

    return time_tick_facilities;
}

Clarinet.test({
    name: "Ensure initialized-in-test-mode returns false before contract initialization",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;
        
        const call = chain.callReadOnlyFn(
            futures_market_contract,
            "initialized-in-test-mode",
            [],
            userA.address
        );

        call.result.expectBool(false);
    }
});

Clarinet.test({
    name: "Ensure initialized-in-test-mode returns true after contract is initialized in test mode",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get("wallet_1")!;

        initialize_contract_in_test_mode(chain, accounts);

        const call = chain.callReadOnlyFn(
            futures_market_contract,
            "initialized-in-test-mode",
            [],
            userA.address
        );

        call.result.expectBool(true);
    }
});

Clarinet.test({
    name: "Ensure initialized-in-test-mode returns false after contract is initialized in production mode",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        const block = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'initialize',
                [
                    types.principal(`${deployer.address}.${token_contract}`),
                    types.bool(false)
                ],
                deployer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Ensure get-authorized-sip-010-token returns error before contract initialization",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        const call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-authorized-sip-010-token',
            [],
            userA.address
        );

        call.result.expectErr().expectUint(ERR_CONTRACT_NOT_INITIALIZED);
    }
});

Clarinet.test({
    name: "Ensure get-authorized-sip-010-token returns the correct token principal after contract initialization",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;
        const deployer = accounts.get('deployer')!;

        initialize_contract_in_test_mode(chain, accounts);

        const call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-authorized-sip-010-token',
            [],
            userA.address
        );

        call.result.expectOk().expectPrincipal(`${deployer.address}.${token_contract}`);
    }
});

Clarinet.test({
    name: "Ensure that submit ownership can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall(futures_market_contract,
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
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall(futures_market_contract,
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall(futures_market_contract,
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
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall(futures_market_contract,
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
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall(futures_market_contract,
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
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall(futures_market_contract,
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
                Tx.contractCall(futures_market_contract,
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall(futures_market_contract,
                'confirm-ownership-transfer',
                [],
                userA.address)
            ]);
        call.receipts[1].result.expectErr().expectUint(ERR_NOT_NEW_OWNER);
    }
});

Clarinet.test({
    name: "Ensure get-stx-reserve returns 0 for any principal before contract initialization",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        const call = chain.callReadOnlyFn(
            futures_market_contract,
            "get-stx-reserve",
            [types.principal(userA.address)],
            userA.address
        );

        call.result.expectUint(0);
    }
});

Clarinet.test({
    name: "Ensure get-stx-reserve returns 0 for a principal which has never interacted with the contract",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_contract_in_test_mode(chain, accounts);

        const call = chain.callReadOnlyFn(
            futures_market_contract,
            "get-stx-reserve",
            [types.principal(userA.address)],
            userA.address
        );

        call.result.expectUint(0);
    }
});