import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_EMPTY_HEAP = 4000;

function initialize_heap(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const call = chain.mineBlock([
        Tx.contractCall(
            'heap',
            'initialize',
            [],
            deployer.address
        )
    ]);

    call.receipts[0].result.expectOk().expectBool(true);
}

function insert_position(
    chain: Chain,
    accounts: Map<string, Account>,
    priority: number,
    value: number
) {
    const deployer = accounts.get('deployer')!;

    const call = chain.mineBlock([
        Tx.contractCall(
            'heap',
            'max-heap-insert',
            [
                types.uint(priority),
                types.uint(value)
            ],
            deployer.address
        )
    ]);

    call.receipts[0].result.expectOk().expectBool(true);
}

function verify_priority_position(
    chain: Chain,
    accounts: Map<string, Account>,
    position_index: number,
    priority: number
) {
    const deployer = accounts.get('deployer')!;

    const read_only_call = chain.callReadOnlyFn(
        'heap',
        'get-position',
        [types.uint(position_index)],
        deployer.address
    );

    const position: {[key: string]: string} = read_only_call.result.expectTuple() as any;

    position['priority'].expectUint(priority);
}

Clarinet.test({
    name: "Ensure get-position returns a dummy default value for non existent positions",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const call = chain.mineBlock([
            Tx.contractCall(
                'heap',
                'max-heap-insert',
                [
                    types.uint(1),
                    types.uint(10)
                ],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectBool(true);

        const nonexistent_position_index = 2;

        const read_only_call = chain.callReadOnlyFn(
            'heap',
            'get-position',
            [types.uint(nonexistent_position_index)],
            userA.address
        );

        const dummy_position: {[key: string]: string} = read_only_call.result.expectTuple() as any;

        dummy_position['priority'].expectUint(0);
        dummy_position['value'].expectUint(0);
    }
});

Clarinet.test({
    name: "Ensure get-position returns the correct position content at a certain index",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const position_priority = 1;
        const position_value = 10;

        const call = chain.mineBlock([
            Tx.contractCall(
                'heap',
                'max-heap-insert',
                [
                    types.uint(position_priority),
                    types.uint(position_value)
                ],
                userA.address
            )
        ]);

        const position_index = 1;

        call.receipts[0].result.expectOk().expectBool(true);

        const read_only_call = chain.callReadOnlyFn(
            'heap',
            'get-position',
            [types.uint(position_index)],
            userA.address
        );

        const position: {[key: string]: string} = read_only_call.result.expectTuple() as any;

        position['priority'].expectUint(position_priority);
        position['value'].expectUint(position_value);
    }
});

Clarinet.test({
    name: "Ensure priority-position cannot be called for an empty heap",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const read_only_call = chain.callReadOnlyFn(
            'heap',
            'priority-position',
            [],
            userA.address
        );

        read_only_call.result.expectErr().expectUint(ERR_EMPTY_HEAP);
    }
});

Clarinet.test({
    name: "Ensure priority-position returns the position with most priority",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        insert_position(chain, accounts, 1, 10);

        // [1]
        verify_priority_position(chain, accounts, 1, 1);

        let max_priority = 1;

        let read_only_call = chain.callReadOnlyFn(
            'heap',
            'priority-position',
            [],
            userA.address
        );

        let priority_position: {[key: string]: string} = read_only_call.result.expectOk().expectTuple() as any;

        priority_position['priority'].expectUint(max_priority);

        insert_position(chain, accounts, 2, 20);

        // [2, 1]
        verify_priority_position(chain, accounts, 1, 2);
        verify_priority_position(chain, accounts, 2, 1);

        max_priority = 2;

        read_only_call = chain.callReadOnlyFn(
            'heap',
            'priority-position',
            [],
            userA.address
        );

        priority_position = read_only_call.result.expectOk().expectTuple() as any;

        priority_position['priority'].expectUint(max_priority);

        insert_position(chain, accounts, 3, 30);

        // [2, 1, 3] -> [3, 1, 2]
        verify_priority_position(chain, accounts, 1, 3);
        verify_priority_position(chain, accounts, 2, 1);
        verify_priority_position(chain, accounts, 3, 2);

        max_priority = 3;

        read_only_call = chain.callReadOnlyFn(
            'heap',
            'priority-position',
            [],
            userA.address
        );

        priority_position = read_only_call.result.expectOk().expectTuple() as any;

        priority_position['priority'].expectUint(max_priority);

        insert_position(chain, accounts, 4, 40);

        // [3, 1, 2, 4] -> [3, 4, 2, 1] -> [4, 3, 2, 1]
        verify_priority_position(chain, accounts, 1, 4);
        verify_priority_position(chain, accounts, 2, 3);
        verify_priority_position(chain, accounts, 3, 2);
        verify_priority_position(chain, accounts, 4, 1);

        max_priority = 4;

        read_only_call = chain.callReadOnlyFn(
            'heap',
            'priority-position',
            [],
            userA.address
        );

        priority_position = read_only_call.result.expectOk().expectTuple() as any;

        priority_position['priority'].expectUint(max_priority);
    }
});

Clarinet.test({
    name: "Ensure heap-extract-max cannot be called for an empty heap",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const call = chain.mineBlock([
            Tx.contractCall(
                'heap',
                'heap-extract-max',
                [],
                userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_EMPTY_HEAP);
    }
});

Clarinet.test({
    name: "Ensure heap-extract-max always returns the position with most priority",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const priorities = [12, 15, 2, 6, 19, 3, 5, 8];
        const sorted_priorities = [19, 15, 12, 8, 6, 5, 3, 2]
        const constant_value = 0;

        
    }
});