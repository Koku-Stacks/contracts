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
            [types.uint(data)],
            userA.address
        );

        const prepare_indices = (indices: number[]) => {
            return types.list(indices.map(idx => types.uint(idx)));
        };

        let call = chain.mineBlock(data.map(data_inserter_call));
        call.receipts.map(receipt => receipt.result.expectOk().expectBool(true));

        const data_verification_calls = data_indices.map(idx => chain.callReadOnlyFn(
            'fold-example',
            'get-data',
            [types.uint(idx), types.uint(0)],
            userA.address
        ));
        data_indices.map(idx => data_verification_calls[idx - 1].result.expectUint(data[idx - 1]));

        // sum of the first element: 1(idx 1) == 1
        let sum = chain.callReadOnlyFn(
            'fold-example',
            'sum',
            [prepare_indices([1])],
            userA.address
        );
        sum.result.expectUint(1); // passing, returns 1

        // sum of the first two elements: 1(idx 1) + 2(idx 2) == 3
        sum = chain.callReadOnlyFn(
            'fold-example',
            'sum',
            [prepare_indices([1, 2])],
            userA.address
        );
        sum.result.expectUint(3); // passing, returns 3

        // sum of the first three elements: 1(idx 1) + 2(idx 2) + 3(idx 3) == 6
        sum = chain.callReadOnlyFn(
            'fold-example',
            'sum',
            [prepare_indices([1, 2, 3])],
            userA.address
        );
        sum.result.expectUint(6); // passing, returns 6

        // sum of the first four elements: 1(idx 1) + 2(idx 2) + 3(idx 3) + 4(idx 4) == 10
        sum = chain.callReadOnlyFn(
            'fold-example',
            'sum',
            [prepare_indices([1, 2, 3, 4])],
            userA.address
        );
        sum.result.expectUint(10); // passing, returns 10

        // sum of the elements
        sum = chain.callReadOnlyFn(
            'fold-example',
            'sum',
            [prepare_indices(data_indices)],
            userA.address
        );
        sum.result.expectUint(15); // passing, returns 15

        // product of the elements
        const product = chain.callReadOnlyFn(
            'fold-example',
            'product',
            [prepare_indices(data_indices)],
            userA.address
        )
        product.result.expectUint(120);
    }
});