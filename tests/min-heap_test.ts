import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_EMPTY_HEAP = 4000;

function initialize_heap(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const call = chain.mineBlock([
        Tx.contractCall(
            'min-heap',
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
    price: number,
    value: number
) {
    const deployer = accounts.get('deployer')!;

    const call = chain.mineBlock([
        Tx.contractCall(
            'min-heap',
            'min-heap-insert',
            [
                types.uint(price),
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
    price: number
) {
    const deployer = accounts.get('deployer')!;

    const read_only_call = chain.callReadOnlyFn(
        'min-heap',
        'get-position',
        [types.uint(position_index)],
        deployer.address
    );

    const position: {[key: string]: string} = read_only_call.result.expectTuple() as any;

    position['price'].expectUint(price);

    const get_orders_call = chain.callReadOnlyFn(
        'min-heap',
        'get-orders',
        [],
        deployer.address
    );

    const order_list = get_orders_call.result.expectOk().expectList();
    const order: {[key: string]: string} = order_list[position_index - 1].expectTuple() as any;
    order['price'].expectUint(price);
}

function extract_min(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const call = chain.mineBlock([
        Tx.contractCall(
            'min-heap',
            'heap-extract-min',
            [],
            deployer.address
        )
    ]);

    const position: {[key: string]: string} = call.receipts[0].result.expectOk().expectTuple() as any;

    return position['price'];
}

Clarinet.test({
    name: "Ensure get-position returns a dummy default value for non existent positions",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const call = chain.mineBlock([
            Tx.contractCall(
                'min-heap',
                'min-heap-insert',
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
            'min-heap',
            'get-position',
            [types.uint(nonexistent_position_index)],
            userA.address
        );

        const dummy_position: {[key: string]: string} = read_only_call.result.expectTuple() as any;

        dummy_position['price'].expectUint(0);
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
                'min-heap',
                'min-heap-insert',
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
            'min-heap',
            'get-position',
            [types.uint(position_index)],
            userA.address
        );

        const position: {[key: string]: string} = read_only_call.result.expectTuple() as any;

        position['price'].expectUint(position_priority);
        position['value'].expectUint(position_value);
    }
});

Clarinet.test({
    name: "Ensure priority-position cannot be called for an empty heap",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const read_only_call = chain.callReadOnlyFn(
            'min-heap',
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

        const min_priority = 1;

        let read_only_call = chain.callReadOnlyFn(
            'min-heap',
            'priority-position',
            [],
            userA.address
        );

        let priority_position: {[key: string]: string} = read_only_call.result.expectOk().expectTuple() as any;

        priority_position['price'].expectUint(min_priority);

        insert_position(chain, accounts, 2, 20);

        // [1, 2]
        verify_priority_position(chain, accounts, 1, 1);
        verify_priority_position(chain, accounts, 2, 2);

        read_only_call = chain.callReadOnlyFn(
            'min-heap',
            'priority-position',
            [],
            userA.address
        );

        priority_position = read_only_call.result.expectOk().expectTuple() as any;

        priority_position['price'].expectUint(min_priority);

        insert_position(chain, accounts, 3, 30);

        // [1, 2, 3]
        verify_priority_position(chain, accounts, 1, 1);
        verify_priority_position(chain, accounts, 2, 2);
        verify_priority_position(chain, accounts, 3, 3);

        read_only_call = chain.callReadOnlyFn(
            'min-heap',
            'priority-position',
            [],
            userA.address
        );

        priority_position = read_only_call.result.expectOk().expectTuple() as any;

        priority_position['price'].expectUint(min_priority);

        insert_position(chain, accounts, 4, 40);

        // [1, 2, 3, 4]
        verify_priority_position(chain, accounts, 1, 1);
        verify_priority_position(chain, accounts, 2, 2);
        verify_priority_position(chain, accounts, 3, 3);
        verify_priority_position(chain, accounts, 4, 4);

        read_only_call = chain.callReadOnlyFn(
            'min-heap',
            'priority-position',
            [],
            userA.address
        );

        priority_position = read_only_call.result.expectOk().expectTuple() as any;

        priority_position['price'].expectUint(min_priority);
    }
});

Clarinet.test({
    name: "Ensure heap-extract-min cannot be called for an empty heap",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const call = chain.mineBlock([
            Tx.contractCall(
                'min-heap',
                'heap-extract-min',
                [],
                userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_EMPTY_HEAP);
    }
});

Clarinet.test({
    name: "Ensure heap-extract-min always returns the position with least priority",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        initialize_heap(chain, accounts);

        const constant_value = 0;

        insert_position(chain, accounts, 12, constant_value);

        // [12]
        verify_priority_position(chain, accounts, 1, 12);

        insert_position(chain, accounts, 15, constant_value);

        // [12] -> [12, 15]
        verify_priority_position(chain, accounts, 1, 12);
        verify_priority_position(chain, accounts, 2, 15);

        insert_position(chain, accounts, 2, constant_value);

        // [12, 15] -> [12, 15, 2] -> [2, 15, 12]
        verify_priority_position(chain, accounts, 1, 2);
        verify_priority_position(chain, accounts, 2, 15);
        verify_priority_position(chain, accounts, 3, 12);

        insert_position(chain, accounts, 6, constant_value);

        // [2, 15, 12] -> [2, 15, 12, 6] -> [2, 6, 12, 15]
        verify_priority_position(chain, accounts, 1, 2);
        verify_priority_position(chain, accounts, 2, 6);
        verify_priority_position(chain, accounts, 3, 12);
        verify_priority_position(chain, accounts, 4, 15);

        insert_position(chain, accounts, 19, constant_value);

        // [2, 6, 12, 15] -> [2, 6, 12, 15, 19]
        verify_priority_position(chain, accounts, 1, 2);
        verify_priority_position(chain, accounts, 2, 6);
        verify_priority_position(chain, accounts, 3, 12);
        verify_priority_position(chain, accounts, 4, 15);
        verify_priority_position(chain, accounts, 5, 19);

        insert_position(chain, accounts, 3, constant_value);

        // [2, 6, 12, 15, 19] -> [2, 6, 12, 15, 19, 3] -> [2, 6, 3, 15, 19, 12]
        verify_priority_position(chain, accounts, 1, 2);
        verify_priority_position(chain, accounts, 2, 6);
        verify_priority_position(chain, accounts, 3, 3);
        verify_priority_position(chain, accounts, 4, 15);
        verify_priority_position(chain, accounts, 5, 19);
        verify_priority_position(chain, accounts, 6, 12);

        insert_position(chain, accounts, 5, constant_value);

        // [2, 6, 3, 15, 19, 12] -> [2, 6, 3, 15, 19, 12, 5]
        verify_priority_position(chain, accounts, 1, 2);
        verify_priority_position(chain, accounts, 2, 6);
        verify_priority_position(chain, accounts, 3, 3);
        verify_priority_position(chain, accounts, 4, 15);
        verify_priority_position(chain, accounts, 5, 19);
        verify_priority_position(chain, accounts, 6, 12);
        verify_priority_position(chain, accounts, 7, 5);

        insert_position(chain, accounts, 8, constant_value);

        // [2, 6, 3, 15, 19, 12, 5] -> [2, 6, 3, 15, 19, 12, 5, 8] -> [2, 6, 3, 8, 19, 12, 5, 15]
        verify_priority_position(chain, accounts, 1, 2);
        verify_priority_position(chain, accounts, 2, 6);
        verify_priority_position(chain, accounts, 3, 3);
        verify_priority_position(chain, accounts, 4, 8);
        verify_priority_position(chain, accounts, 5, 19);
        verify_priority_position(chain, accounts, 6, 12);
        verify_priority_position(chain, accounts, 7, 5);
        verify_priority_position(chain, accounts, 8, 15);

        let min_priority_position = extract_min(chain, accounts);

        min_priority_position.expectUint(2);

        // [2, 6, 3, 8, 19, 12, 5, 15] -> [15, 6, 3, 8, 19, 12, 5] -> [3, 6, 15, 8, 19, 12, 5] -> [3, 6, 5, 8, 19, 12, 15]
        verify_priority_position(chain, accounts, 1, 3);
        verify_priority_position(chain, accounts, 2, 6);
        verify_priority_position(chain, accounts, 3, 5);
        verify_priority_position(chain, accounts, 4, 8);
        verify_priority_position(chain, accounts, 5, 19);
        verify_priority_position(chain, accounts, 6, 12);
        verify_priority_position(chain, accounts, 7, 15);

        min_priority_position = extract_min(chain, accounts);
        min_priority_position.expectUint(3);

        // [3, 6, 5, 8, 19, 12, 15] -> [15, 6, 5, 8, 19, 12] -> [5, 6, 15, 8, 19, 12] -> [5, 6, 12, 8, 19, 15]
        verify_priority_position(chain, accounts, 1, 5);
        verify_priority_position(chain, accounts, 2, 6);
        verify_priority_position(chain, accounts, 3, 12);
        verify_priority_position(chain, accounts, 4, 8);
        verify_priority_position(chain, accounts, 5, 19);
        verify_priority_position(chain, accounts, 6, 15);

        min_priority_position = extract_min(chain, accounts);
        min_priority_position.expectUint(5);

        // [5, 6, 12, 8, 19, 15] -> [15, 6, 12, 8, 19] -> [6, 15, 12, 8, 19] -> [6, 8, 12, 15, 19]
        verify_priority_position(chain, accounts, 1, 6);
        verify_priority_position(chain, accounts, 2, 8);
        verify_priority_position(chain, accounts, 3, 12);
        verify_priority_position(chain, accounts, 4, 15);
        verify_priority_position(chain, accounts, 5, 19);

        min_priority_position = extract_min(chain, accounts);
        min_priority_position.expectUint(6);

        // [6, 8, 12, 15, 19] -> [19, 8, 12, 15] -> [8, 19, 12, 15] -> [8, 15, 12, 19]
        verify_priority_position(chain, accounts, 1, 8);
        verify_priority_position(chain, accounts, 2, 15);
        verify_priority_position(chain, accounts, 3, 12);
        verify_priority_position(chain, accounts, 4, 19);

        min_priority_position = extract_min(chain, accounts);
        min_priority_position.expectUint(8);

        // [8, 15, 12, 19] -> [19, 15, 12] -> [12, 15, 19]
        verify_priority_position(chain, accounts, 1, 12);
        verify_priority_position(chain, accounts, 2, 15);
        verify_priority_position(chain, accounts, 3, 19);

        min_priority_position = extract_min(chain, accounts);
        min_priority_position.expectUint(12);

        // [12, 15, 19] -> [19, 15] -> [15, 19]
        verify_priority_position(chain, accounts, 1, 15);
        verify_priority_position(chain, accounts, 2, 19);

        min_priority_position = extract_min(chain, accounts);
        min_priority_position.expectUint(15);

        // [15, 19] -> [19]
        verify_priority_position(chain, accounts, 1, 19);

        min_priority_position = extract_min(chain, accounts);
        min_priority_position.expectUint(19);

        const call = chain.mineBlock([
            Tx.contractCall(
            'min-heap',
            'heap-extract-min',
            [],
            userA.address
            )
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_EMPTY_HEAP);
    }
});