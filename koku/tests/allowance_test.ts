import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

Clarinet.test({
    name: "Ensure allowance facilities work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const unauthorizedTransfer = 101;
        const unauthorizedAllowanceQuery = 102;
        const attemptToDecreaseInexistentAllowance = 103;

        const deployer = accounts.get('deployer')!;

        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        const wallet4 = accounts.get('wallet_4')!;

        const block1 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(wallet1.address)], deployer.address),
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(wallet2.address)], deployer.address),
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(wallet3.address)], deployer.address)
        ]);

        const [mintCall1, mintCall2, mintCall3] = block1.receipts;

        mintCall1.result.expectOk().expectBool(true);
        mintCall2.result.expectOk().expectBool(true);
        mintCall3.result.expectOk().expectBool(true);

        const block2 = chain.mineBlock([
            Tx.contractCall('allowance', 'approve', [types.principal(wallet1.address), types.uint(20)], wallet3.address),
            Tx.contractCall('allowance', 'approve', [types.principal(wallet2.address), types.uint(20)], wallet3.address)
        ]);

        const [approveCall1, approveCall2] = block2.receipts;

        approveCall1.result.expectOk().expectBool(true);
        approveCall2.result.expectOk().expectBool(true);

        const allowanceQuery1 = chain.callReadOnlyFn('allowance', 'get-allowance', [types.principal(wallet3.address), types.principal(wallet1.address)], wallet3.address);
        allowanceQuery1.result.expectOk().expectUint(20);

        const allowanceQuery2 = chain.callReadOnlyFn('allowance', 'get-allowance', [types.principal(wallet3.address), types.principal(wallet2.address)], wallet2.address);
        allowanceQuery2.result.expectOk().expectUint(20);

        const badAllowanceQuery = chain.callReadOnlyFn('allowance', 'get-allowance', [types.principal(wallet3.address), types.principal(wallet2.address)], wallet1.address);
        badAllowanceQuery.result.expectErr().expectUint(unauthorizedAllowanceQuery);

        const block3 = chain.mineBlock([
            Tx.contractCall('allowance', 'transfer-from', [types.uint(5), types.principal(wallet3.address), types.principal(wallet4.address), types.none()], wallet1.address),
            Tx.contractCall('allowance', 'transfer-from', [types.uint(5), types.principal(wallet3.address), types.principal(wallet4.address), types.none()], wallet2.address),
            Tx.contractCall('allowance', 'transfer-from', [types.uint(5), types.principal(wallet3.address), types.principal(wallet4.address), types.none()], wallet4.address)
        ]);

        const [goodTransferFromCall1, goodTransferFromCall2, badTransferFromCall] = block3.receipts;

        goodTransferFromCall1.result.expectOk().expectBool(true);
        goodTransferFromCall2.result.expectOk().expectBool(true);
        badTransferFromCall.result.expectErr().expectUint(unauthorizedTransfer);

        let wallet3Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(90);

        const wallet4Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet4.address)], wallet4.address);
        wallet4Balance.result.expectOk().expectUint(10);

        const allowanceQuery3 = chain.callReadOnlyFn('allowance', 'get-allowance', [types.principal(wallet3.address), types.principal(wallet1.address)], wallet1.address);
        allowanceQuery3.result.expectOk().expectUint(15);

        const allowanceQuery4 = chain.callReadOnlyFn('allowance', 'get-allowance', [types.principal(wallet3.address), types.principal(wallet2.address)], wallet3.address);
        allowanceQuery4.result.expectOk().expectUint(15);

        const block5 = chain.mineBlock([
            Tx.contractCall('allowance', 'decrease-allowance', [types.principal(wallet1.address), types.uint(10)], wallet3.address),
            Tx.contractCall('allowance', 'decrease-allowance', [types.principal(wallet1.address), types.uint(10)], wallet4.address)
        ]);

        const [goodDecreaseAllowanceCall, badDecreaseAllowanceCall] = block5.receipts;

        goodDecreaseAllowanceCall.result.expectOk().expectBool(true);
        badDecreaseAllowanceCall.result.expectErr().expectUint(attemptToDecreaseInexistentAllowance);

        const allowanceQuery5 = chain.callReadOnlyFn('allowance', 'get-allowance', [types.principal(wallet3.address), types.principal(wallet1.address)], wallet1.address);
        allowanceQuery5.result.expectOk().expectUint(5);
    }
});