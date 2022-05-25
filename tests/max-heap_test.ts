import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_EMPTY_HEAP = 4000;

function initialize_heap(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const call = chain.mineBlock([
        Tx.contractCall(
            'max-heap',
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
            'max-heap',
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
        'max-heap',
        'get-position',
        [types.uint(position_index)],
        deployer.address
    );

    const position: {[key: string]: string} = read_only_call.result.expectTuple() as any;

    position['priority'].expectUint(priority);
}

function extract_max(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const call = chain.mineBlock([
        Tx.contractCall(
            'max-heap',
            'heap-extract-max',
            [],
            deployer.address
        )
    ]);

    const position: {[key: string]: string} = call.receipts[0].result.expectOk().expectTuple() as any;

    return position['priority'];
}

Clarinet.test({
    name: "Ensure get-position returns a dummy default value for non existent positions",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const call = chain.mineBlock([
            Tx.contractCall(
                'max-heap',
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
            'max-heap',
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
                'max-heap',
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
            'max-heap',
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
            'max-heap',
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
            'max-heap',
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
            'max-heap',
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
            'max-heap',
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
            'max-heap',
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
                'max-heap',
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

        const constant_value = 0;

        insert_position(chain, accounts, 12, constant_value);

        // [12]
        verify_priority_position(chain, accounts, 1, 12);

        insert_position(chain, accounts, 15, constant_value);

        // [12] -> [12, 15] -> [15, 12]
        verify_priority_position(chain, accounts, 1, 15);
        verify_priority_position(chain, accounts, 2, 12);

        insert_position(chain, accounts, 2, constant_value);

        // [15, 12] -> [15, 12, 2]
        verify_priority_position(chain, accounts, 1, 15);
        verify_priority_position(chain, accounts, 2, 12);
        verify_priority_position(chain, accounts, 3, 2);

        insert_position(chain, accounts, 6, constant_value);

        // [15, 12, 2] -> [15, 12, 2, 6]
        verify_priority_position(chain, accounts, 1, 15);
        verify_priority_position(chain, accounts, 2, 12);
        verify_priority_position(chain, accounts, 3, 2);
        verify_priority_position(chain, accounts, 4, 6);

        insert_position(chain, accounts, 19, constant_value);

        // [15, 12, 2, 6] -> [15, 12, 2, 6, 19] -> [15, 19, 2, 6, 12] -> [19, 15, 2, 6, 12]
        verify_priority_position(chain, accounts, 1, 19);
        verify_priority_position(chain, accounts, 2, 15);
        verify_priority_position(chain, accounts, 3, 2);
        verify_priority_position(chain, accounts, 4, 6);
        verify_priority_position(chain, accounts, 5, 12);

        insert_position(chain, accounts, 3, constant_value);

        // [19, 15, 2, 6, 12] -> [19, 15, 2, 6, 12, 3] -> [19, 15, 3, 6, 12, 2]
        verify_priority_position(chain, accounts, 1, 19);
        verify_priority_position(chain, accounts, 2, 15);
        verify_priority_position(chain, accounts, 3, 3);
        verify_priority_position(chain, accounts, 4, 6);
        verify_priority_position(chain, accounts, 5, 12);
        verify_priority_position(chain, accounts, 6, 2);

        insert_position(chain, accounts, 5, constant_value);

        // [19, 15, 3, 6, 12, 2] -> [19, 15, 3, 6, 12, 2, 5] -> [19, 15, 5, 6, 12, 2, 3]
        verify_priority_position(chain, accounts, 1, 19);
        verify_priority_position(chain, accounts, 2, 15);
        verify_priority_position(chain, accounts, 3, 5);
        verify_priority_position(chain, accounts, 4, 6);
        verify_priority_position(chain, accounts, 5, 12);
        verify_priority_position(chain, accounts, 6, 2);
        verify_priority_position(chain, accounts, 7, 3);

        insert_position(chain, accounts, 8, constant_value);

        // [19, 15, 5, 6, 12, 2, 3] -> [19, 15, 5, 6, 12, 2, 3, 8] -> [19, 15, 5, 8, 12, 2, 3, 6]
        verify_priority_position(chain, accounts, 1, 19);
        verify_priority_position(chain, accounts, 2, 15);
        verify_priority_position(chain, accounts, 3, 5);
        verify_priority_position(chain, accounts, 4, 8);
        verify_priority_position(chain, accounts, 5, 12);
        verify_priority_position(chain, accounts, 6, 2);
        verify_priority_position(chain, accounts, 7, 3);
        verify_priority_position(chain, accounts, 8, 6);

        let max_priority_position = extract_max(chain, accounts);

        max_priority_position.expectUint(19);

        // [19, 15, 5, 8, 12, 2, 3, 6] -> [6, 15, 5, 8, 12, 2, 3] -> [15, 6, 5, 8, 12, 2, 3] -> [15, 12, 5, 8, 6, 2, 3]
        verify_priority_position(chain, accounts, 1, 15);
        verify_priority_position(chain, accounts, 2, 12);
        verify_priority_position(chain, accounts, 3, 5);
        verify_priority_position(chain, accounts, 4, 8);
        verify_priority_position(chain, accounts, 5, 6);
        verify_priority_position(chain, accounts, 6, 2);
        verify_priority_position(chain, accounts, 7, 3);

        max_priority_position = extract_max(chain, accounts);
        max_priority_position.expectUint(15);

        // [15, 12, 5, 8, 6, 2, 3] -> [3, 12, 5, 8, 6, 2] -> [12, 3, 5, 8, 6, 2] -> [12, 8, 5, 3, 6, 2]
        verify_priority_position(chain, accounts, 1, 12);
        verify_priority_position(chain, accounts, 2, 8);
        verify_priority_position(chain, accounts, 3, 5);
        verify_priority_position(chain, accounts, 4, 3);
        verify_priority_position(chain, accounts, 5, 6);
        verify_priority_position(chain, accounts, 6, 2);

        max_priority_position = extract_max(chain, accounts);
        max_priority_position.expectUint(12);

        // [12, 8, 5, 3, 6, 2] -> [2, 8, 5, 3, 6] -> [8, 2, 5, 3, 6] -> [8, 6, 5, 3, 2]
        verify_priority_position(chain, accounts, 1, 8);
        verify_priority_position(chain, accounts, 2, 6);
        verify_priority_position(chain, accounts, 3, 5);
        verify_priority_position(chain, accounts, 4, 3);
        verify_priority_position(chain, accounts, 5, 2);

        max_priority_position = extract_max(chain, accounts);
        max_priority_position.expectUint(8);

        // [8, 6, 5, 3, 2] -> [2, 6, 5, 3] -> [6, 2, 5, 3] -> [6, 3, 5, 2]
        verify_priority_position(chain, accounts, 1, 6);
        verify_priority_position(chain, accounts, 2, 3);
        verify_priority_position(chain, accounts, 3, 5);
        verify_priority_position(chain, accounts, 4, 2);

        max_priority_position = extract_max(chain, accounts);
        max_priority_position.expectUint(6);

        // [6, 3, 5, 2] -> [2, 3, 5] -> [5, 3, 2]
        verify_priority_position(chain, accounts, 1, 5);
        verify_priority_position(chain, accounts, 2, 3);
        verify_priority_position(chain, accounts, 3, 2);

        max_priority_position = extract_max(chain, accounts);
        max_priority_position.expectUint(5);

        // [5, 3, 2] -> [2, 3] -> [3, 2]
        verify_priority_position(chain, accounts, 1, 3);
        verify_priority_position(chain, accounts, 2, 2);

        max_priority_position = extract_max(chain, accounts);
        max_priority_position.expectUint(3);

        // [3, 2] -> [2]
        verify_priority_position(chain, accounts, 1, 2);

        max_priority_position = extract_max(chain, accounts);
        max_priority_position.expectUint(2);

        const call = chain.mineBlock([
            Tx.contractCall(
            'max-heap',
            'heap-extract-max',
            [],
            userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_EMPTY_HEAP);
    }
});