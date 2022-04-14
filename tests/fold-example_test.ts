import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

Clarinet.test({
    name: "ensures sum and product work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        const data = [1, 2, 3, 4, 5];
        const data_indices = [1, 2, 3, 4, 5];

        const data_inserter_call = (data: number) => Tx.contractCall(
            'fold-example',
            'insert-data',
            [types.uint(data), types.uint(data * 10)],
            userA.address
        );

        const prepare_indices = (indices: number[]) => {
            return types.list(indices.map(idx => types.uint(idx)));
        };

        let call = chain.mineBlock(data.map(data_inserter_call));
        call.receipts.map(receipt => receipt.result.expectOk().expectBool(true));

        let data_verification_calls = data_indices.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-a',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_indices.map(idx => data_verification_calls[idx - 1].result.expectUint(data[idx - 1]));

        data_verification_calls = data_indices.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-b',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_indices.map(idx => data_verification_calls[idx - 1].result.expectUint(data[idx - 1] * 10));

        const amount_to_increase = 10;

        call = chain.mineBlock([
            Tx.contractCall(
                'fold-example',
                'batch-increase-a',
                [prepare_indices(data_indices), types.uint(amount_to_increase)],
                userA.address
            )
        ]);

        data_verification_calls = data_indices.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-a',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_indices.map(idx => data_verification_calls[idx - 1].result.expectUint(data[idx - 1] + amount_to_increase));

        call = chain.mineBlock([
            Tx.contractCall(
                'fold-example',
                'batch-increase-b',
                [prepare_indices(data_indices), types.uint(amount_to_increase)],
                userA.address
            )
        ]);

        data_verification_calls = data_indices.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-b',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_indices.map(idx => data_verification_calls[idx - 1].result.expectUint(data[idx - 1] * 10 + amount_to_increase));
    }
});

Clarinet.test({
    name: "Ensures batch update operation works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const userA = accounts.get('wallet_1')!;

        const chunk_size = 100

        const data_size = 2 * chunk_size; // twice the chunk size so we call update twice

        const data_indices = Array.from(Array(data_size).keys()).map(idx => idx + 1);

        const constant_data_to_insert = 100;

        const data_inserter_call = (data: number) => Tx.contractCall(
            'fold-example',
            'insert-data',
            [types.uint(data), types.uint(data * 10)],
            userA.address
        );

        let call = chain.mineBlock(
            data_indices.map(
                _idx => data_inserter_call(constant_data_to_insert)
            )
        );

        call.receipts.map(receipt => receipt.result.expectOk().expectBool(true));

        let data_verification_calls = data_indices.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-a',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert));

        data_verification_calls = data_indices.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-b',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert * 10));

        const amount_to_add_on_update = 3;

        call = chain.mineBlock([
            Tx.contractCall(
                'fold-example',
                'update-next-index-chunk',
                [types.uint(amount_to_add_on_update)],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectBool(true);

        const indices_from_first_chunk = data_indices.slice(0, chunk_size);
        const indices_from_second_chunk = data_indices.slice(chunk_size);

        data_verification_calls = indices_from_first_chunk.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-a',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert + amount_to_add_on_update));

        data_verification_calls = indices_from_second_chunk.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-a',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert));

        data_verification_calls = indices_from_first_chunk.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-b',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert * 10 + amount_to_add_on_update));

        data_verification_calls = indices_from_second_chunk.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-b',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert * 10));

        call = chain.mineBlock([
            Tx.contractCall(
                'fold-example',
                'update-next-index-chunk',
                [types.uint(amount_to_add_on_update)],
                userA.address
            )
        ]);

        call.receipts[0].result.expectOk().expectBool(true);

        data_verification_calls = indices_from_first_chunk.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-a',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert + amount_to_add_on_update));

        data_verification_calls = indices_from_second_chunk.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-a',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert + amount_to_add_on_update));

        data_verification_calls = indices_from_first_chunk.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-b',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert * 10 + amount_to_add_on_update));

        data_verification_calls = indices_from_second_chunk.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-b',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_verification_calls.map(verification_call => verification_call.result.expectUint(constant_data_to_insert * 10 + amount_to_add_on_update));
    }
})