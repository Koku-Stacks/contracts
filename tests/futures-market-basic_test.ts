import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_NOT_AUTHORIZED = 1000;
const ERR_NOT_NEW_OWNER = 2000;
const ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED = 2001;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL = 2002;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM = 2003;
const ERR_POSITION_NOT_FOUND = 3000;
const ERR_POSITION_OWNER_ONLY = 3001;
const ERR_TOO_SOON_TO_UPDATE_POSITION = 3002;
const ERR_CONTRACT_ALREADY_INITIALIZED = 3004;
const ERR_CONTRACT_NOT_INITIALIZED = 3005;

const ORDER_TYPE_LONG = 1;
const ORDER_TYPE_SHORT = 2;

const STATUS_LIQUIDATED = 1;
const STATUS_ACTIVE = 2;
const STATUS_CLOSED = 3;

const POSITION_MAX_DURATION = 10; // in days

const POSITION_UPDATE_COOLDOWN = 86400; // seconds in a day

const INDEX_CHUNK_SIZE =
// ref-4
20
;

const gas_fee = 1;

const block_mining_time = 600; // in seconds

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

function mint_token_for_accounts(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    let call = chain.mineBlock([
        Tx.contractCall(
            token_contract,
            "add-authorized-contract",
            [types.principal(deployer.address)],
            deployer.address
        )
    ]);

    const account_principals = Array
        .from(accounts.values())
        .map(account => account.address);

    const amount_to_mint = 1000;

    for (const principal_str of account_principals) {
        call = chain.mineBlock([
            Tx.contractCall(
                token_contract,
                "mint",
                [
                    types.uint(amount_to_mint),
                    types.principal(principal_str)
                ],
                deployer.address
            )
        ])

        const read_only_call = chain.callReadOnlyFn(
            token_contract,
            "get-balance",
            [types.principal(principal_str)],
            principal_str
        )

        read_only_call.result.expectOk().expectUint(amount_to_mint);
    }
}

function open_positions(
    chain: Chain,
    accounts: Map<string, Account>,
    principal: string,
    amount: number) {
        const deployer = accounts.get('deployer')!;

        const position_size = 1;

        for (let i = 1; i <= amount; i++) {
            const call = chain.mineBlock([
                Tx.contractCall(
                    futures_market_contract,
                    'insert-position',
                    [
                        types.uint(position_size),
                        types.uint(ORDER_TYPE_LONG),
                        types.principal(`${deployer.address}.${token_contract}`)
                    ],
                    principal
                )
            ]);

            call.receipts[0].result.expectOk();
        }

        return amount;
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

Clarinet.test({
    name: "Ensure get-stx-reserve returns the correct stx amount for a principal which has opened one position",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        const position_size = 1;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const next_position_index = 1;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                "insert-position",
                [
                    types.uint(position_size),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectUint(next_position_index);

        const read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            "get-stx-reserve",
            [types.principal(userA.address)],
            userA.address
        );

        read_only_call.result.expectUint(POSITION_MAX_DURATION * gas_fee);
    }
});

Clarinet.test({
    name: "Ensure get-current-timestamp works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        const curr_time = () => {
            const call = chain.callReadOnlyFn(
                futures_market_contract,
                'get-current-timestamp',
                [],
                userA.address
            );

            return call.result;
        }

        curr_time().expectUint(0)

        const number_of_blocks_to_verify = 10;

        for (let i = 1; i <= number_of_blocks_to_verify; i++) {
            chain.mineEmptyBlock(1);

            curr_time().expectUint(i * block_mining_time);
        }
    }
});

Clarinet.test({
    name: "Ensure insert-position cannot be called before contract initialization",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(1),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_NOT_INITIALIZED);
    }
});

Clarinet.test({
    name: "Ensure insert-position returns index of inserted position",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const next_position_index = 1;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(1),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectUint(next_position_index);
    }
});

Clarinet.test({
    name: "Ensure get-sender works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const next_position_index = 1;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(1),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectUint(next_position_index);

        let read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-sender',
            [types.uint(next_position_index)],
            userB.address
        );

        read_only_call.result.expectOk().expectPrincipal(userA.address);

        read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-sender',
            [types.uint(next_position_index + 1)],
            userB.address
        );

        read_only_call.result.expectErr().expectUint(ERR_POSITION_NOT_FOUND);
    }
});

Clarinet.test({
    name: "Ensure get-size works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const next_position_index = 1;

        const position_size = 1;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(position_size),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectUint(next_position_index);

        let read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-size',
            [types.uint(next_position_index)],
            userB.address
        );

        read_only_call.result.expectOk().expectUint(position_size);

        read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-size',
            [types.uint(next_position_index + 1)],
            userB.address
        );

        read_only_call.result.expectErr().expectUint(ERR_POSITION_NOT_FOUND);
    }
});

Clarinet.test({
    name: "Ensure get-updated-on-timestamp works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        // 1 block
        initialize_contract(chain, accounts);

        // 1 auth block + 10 mint blocks = 11 blocks
        mint_token_for_accounts(chain, accounts);

        let blocks_mined = 12;

        const next_position_index = 1;

        const position_size = 1;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(position_size),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        blocks_mined++;
        // in the previous call (block 13), get-current-timestamp refers to block 12 timestamp

        call.receipts[0].result.expectOk().expectUint(next_position_index);

        let read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-updated-on-timestamp',
            [types.uint(next_position_index)],
            userB.address
        );

        read_only_call.result.expectOk().expectUint((blocks_mined - 1) * block_mining_time);

        read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-updated-on-timestamp',
            [types.uint(next_position_index + 1)],
            userB.address
        );

        read_only_call.result.expectErr().expectUint(ERR_POSITION_NOT_FOUND);
    }
});

Clarinet.test({
    name: "Ensure get-order-type works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const next_position_index = 1;

        const position_size = 1;
        const position_type = ORDER_TYPE_LONG

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(position_size),
                    types.uint(position_type),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectUint(next_position_index);

        let read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-order-type',
            [types.uint(next_position_index)],
            userB.address
        );

        read_only_call.result.expectOk().expectUint(position_type);

        read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-order-type',
            [types.uint(next_position_index + 1)],
            userB.address
        );

        read_only_call.result.expectErr().expectUint(ERR_POSITION_NOT_FOUND);
    }
});

// TODO skipping get-pnl tests for now as positions' pnls are hardcoded as zero at insert-position

Clarinet.test({
    name: "Ensure positions are inserted with active status",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const next_position_index = 1;

        const position_size = 1;
        const position_type = ORDER_TYPE_LONG

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(position_size),
                    types.uint(position_type),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectUint(next_position_index);

        const read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-status',
            [types.uint(next_position_index)],
            userB.address
        );

        read_only_call.result.expectOk().expectUint(STATUS_ACTIVE);
    }
});

Clarinet.test({
    name: "Ensure get-status returns error for non existing positions",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const next_position_index = 1;

        const position_size = 1;
        const position_type = ORDER_TYPE_LONG

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(position_size),
                    types.uint(position_type),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectUint(next_position_index);

        const read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'get-status',
            [types.uint(next_position_index + 1)],
            userB.address
        );

        read_only_call.result.expectErr().expectUint(ERR_POSITION_NOT_FOUND);
    }
});

// TODO skipping calculate-funding-fee tests as it is a simple mockup for now

// TODO skipping position-profit-status tests as it is a simple mockup for now

Clarinet.test({
    name: "Ensure position-is-eligible-for-update works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        // 1 block
        initialize_contract(chain, accounts);

        // 1 auth block + 10 mint blocks = 11 blocks
        mint_token_for_accounts(chain, accounts);

        let blocks_mined = 12;

        const next_position_index = 1;

        const position_size = 1;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(position_size),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        blocks_mined++;
        // in the previous call (block 13), get-current-timestamp refers to block 12 timestamp

        call.receipts[0].result.expectOk().expectUint(next_position_index);

        let read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'position-is-eligible-for-update',
            [types.uint(next_position_index)],
            userB.address
        );

        read_only_call.result.expectOk().expectBool(false);

        // 144 blocks for passing an update cooldown
        const blocks_in_an_update_cooldown = POSITION_UPDATE_COOLDOWN / block_mining_time;

        chain.mineEmptyBlock(blocks_in_an_update_cooldown);

        read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'position-is-eligible-for-update',
            [types.uint(next_position_index)],
            userB.address
        );

        read_only_call.result.expectOk().expectBool(true);

        read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'position-is-eligible-for-update',
            [types.uint(next_position_index + 1)],
            userB.address
        );

        read_only_call.result.expectErr().expectUint(ERR_POSITION_NOT_FOUND);
    }
});

Clarinet.test({
    name: "Ensure update-position cannot be called before contract initialization",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'update-position',
                [types.uint(1)],
                userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_NOT_INITIALIZED);
    }
});

Clarinet.test({
    name: "Ensure update-position cannot be called with unknown position index",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        let call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(1),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        const position_index = 1;

        call.receipts[0].result.expectOk().expectUint(position_index);

        call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'update-position',
                [types.uint(position_index + 1)],
                userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_POSITION_NOT_FOUND);
    }
});

Clarinet.test({
    name: "Ensure update-position must be called by the position owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        let call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(1),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        const position_index = 1;

        call.receipts[0].result.expectOk().expectUint(position_index);

        call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'update-position',
                [types.uint(position_index)],
                userB.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_POSITION_OWNER_ONLY);
    }
});

Clarinet.test({
    name: "Ensure update-position cannot update positions not eligible for update",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        let call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(1),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        const position_index = 1;

        call.receipts[0].result.expectOk().expectUint(position_index);

        call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'update-position',
                [types.uint(position_index)],
                userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_TOO_SOON_TO_UPDATE_POSITION);
    }
});

Clarinet.test({
    name: "Ensure update-position can update position which are eligible for update",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        let call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'insert-position',
                [
                    types.uint(1),
                    types.uint(ORDER_TYPE_LONG),
                    types.principal(`${deployer.address}.${token_contract}`)
                ],
                userA.address
            )
        ]);

        const position_index = 1;

        call.receipts[0].result.expectOk().expectUint(position_index);

        // 144 blocks for passing an update cooldown
        const blocks_in_an_update_cooldown = POSITION_UPDATE_COOLDOWN / block_mining_time;

        chain.mineEmptyBlock(blocks_in_an_update_cooldown);

        call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'update-position',
                [types.uint(position_index)],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Ensure batch-position-maintenance cannot be called before contract initialization",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'batch-position-maintenance',
                [],
                userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_NOT_INITIALIZED);
    }
});

Clarinet.test({
    name: "Ensure batch-position-maintenance does not update positions which were recently updated by their owners",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const positions_to_open = INDEX_CHUNK_SIZE;

        open_positions(chain, accounts, userA.address, positions_to_open);

        const position_index_opened_by_userA = 1;

        const opened_positions = positions_to_open;

        // in order to be able to update that whole chunk of created positions,
        // we need to skip the following amount of blocks, which happens to be 144 blocks
        const blocks_in_an_update_cooldown = POSITION_UPDATE_COOLDOWN / block_mining_time;

        chain.mineEmptyBlock(blocks_in_an_update_cooldown);

        let call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'update-position',
                [types.uint(position_index_opened_by_userA)],
                userA.address
            )
        ]);

        call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'batch-position-maintenance',
                [],
                userB.address
            )
        ]);

        call.receipts[0].result.expectOk().expectUint(opened_positions - 1);
    }
});

Clarinet.test({
    name: "Ensure batch-position-maintenance only updates one chunk per call",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const positions_to_open = 2 * INDEX_CHUNK_SIZE;

        open_positions(chain, accounts, userA.address, positions_to_open);

        const opened_positions = positions_to_open;

        // in order to be able to update that whole chunk of created positions,
        // we need to skip the following amount of blocks, which happens to be 144 blocks
        const blocks_in_an_update_cooldown = POSITION_UPDATE_COOLDOWN / block_mining_time;

        chain.mineEmptyBlock(blocks_in_an_update_cooldown);

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'batch-position-maintenance',
                [],
                userB.address
            )
        ]);

        call.receipts[0].result.expectOk().expectUint(opened_positions / 2);

        const last_updated_position_index = opened_positions / 2;

        let read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'position-is-eligible-for-update',
            [types.uint(last_updated_position_index)],
            userA.address
        );
        read_only_call.result.expectOk().expectBool(false);

        read_only_call = chain.callReadOnlyFn(
            futures_market_contract,
            'position-is-eligible-for-update',
            [types.uint(last_updated_position_index + 1)],
            userA.address
        );
        read_only_call.result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Ensure initialize can only be called by contract owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        const call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'initialize',
                [types.principal(`${deployer.address}.${token_contract}`)],
                userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_NOT_AUTHORIZED);
    }
});

Clarinet.test({
    name: "Ensure initialize cannot be successfully called twice",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'initialize',
                [types.principal(`${deployer.address}.${token_contract}`)],
                deployer.address
            )
        ]);

        call.receipts[0].result.expectOk().expectBool(true);

        call = chain.mineBlock([
            Tx.contractCall(
                futures_market_contract,
                'initialize',
                [types.principal(`${deployer.address}.${token_contract}`)],
                deployer.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_ALREADY_INITIALIZED);
    }
});
