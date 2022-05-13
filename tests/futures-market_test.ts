import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_NOT_AUTHORIZED = 1000;
const ERR_NOT_NEW_OWNER = 2000;
const ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED = 2001;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL = 2002;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM = 2003;
const ERR_CONTRACT_NOT_INITIALIZED = 3005;

const futures_market_contract = "futures-market";
const token_contract = "token";

function initialize_contract(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
        Tx.contractCall(
            futures_market_contract,
            'initialize',
            [
                types.principal(`${deployer.address}.${token_contract}`),
            ],
            deployer.address
        )
    ]);

    return block.receipts[0].result;
}

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

        initialize_contract(chain, accounts);

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

        initialize_contract(chain, accounts);

        const call = chain.callReadOnlyFn(
            futures_market_contract,
            "get-stx-reserve",
            [types.principal(userA.address)],
            userA.address
        );

        call.result.expectUint(0);
    }
});