import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const POSITION_UPDATE_COOLDOWN = 86400; // seconds in a day

const ORDER_TYPE_LONG = 1;

const INDEX_CHUNK_SIZE =
// ref-1
20
;

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

    const amount_to_mint = 10000;

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
    name: "Ensure batch-position-maintenance is able to update a whole chunk of positions eligible for update",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        initialize_contract(chain, accounts);

        mint_token_for_accounts(chain, accounts);

        const positions_to_open = INDEX_CHUNK_SIZE;

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

        call.receipts[0].result.expectOk().expectUint(opened_positions);
    }
});