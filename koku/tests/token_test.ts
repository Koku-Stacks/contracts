import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

Clarinet.test({
    name: "Ensure the constant read only functions are returning as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        const uri = chain.callReadOnlyFn('token', 'get-token-uri', [], deployer.address);
        uri.result.expectOk().expectSome().expectUtf8('www.token.com');

        const decimals = chain.callReadOnlyFn('token', 'get-decimals', [], deployer.address);
        decimals.result.expectOk().expectUint(2);

        const symbol = chain.callReadOnlyFn('token', 'get-symbol', [], deployer.address);
        symbol.result.expectOk().expectAscii('TKN');

        const name = chain.callReadOnlyFn('token', 'get-name', [], deployer.address);
        name.result.expectOk().expectAscii('token');
    }
});

Clarinet.test({
    name: "Ensure mint and burn functions work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const unauthorizedMinter = 100;

        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        const block1 = chain.mineBlock([
            Tx.contractCall('token', 'mint', [types.uint(100), types.principal(deployer.address)], deployer.address),
            Tx.contractCall('token', 'mint', [types.uint(100), types.principal(wallet1.address)], wallet1.address),
            Tx.contractCall('token', 'mint', [types.uint(50), types.principal(wallet1.address)], deployer.address)
        ]);

        const [goodMintCall, badMintCall, mintCallToOtherWallet] = block1.receipts;

        goodMintCall.result.expectOk().expectBool(true);
        badMintCall.result.expectErr().expectUint(unauthorizedMinter);
        mintCallToOtherWallet.result.expectOk().expectBool(true);

        const supply = chain.callReadOnlyFn('token', 'get-total-supply', [], deployer.address);
        supply.result.expectOk().expectUint(150);

        let deployerBalance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(deployer.address)], deployer.address);
        deployerBalance.result.expectOk().expectUint(100);

        let wallet1Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(50);

        const block2 = chain.mineBlock([
            Tx.contractCall('token', 'burn', [types.uint(10)], deployer.address),
            Tx.contractCall('token', 'burn', [types.uint(0)], deployer.address)
        ]);

        const [goodBurnCall, zeroBurnCall] = block2.receipts;

        goodBurnCall.result.expectOk().expectBool(true);
        zeroBurnCall.result.expectErr().expectUint(1);

        deployerBalance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(deployer.address)], deployer.address);
        deployerBalance.result.expectOk().expectUint(90);

        wallet1Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(50);
    }
});

Clarinet.test({
    name: "Ensure transfer facilities work as expected",
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
            Tx.contractCall('token', 'mint', [types.uint(100), types.principal(wallet1.address)], deployer.address),
            Tx.contractCall('token', 'mint', [types.uint(100), types.principal(wallet2.address)], deployer.address),
            Tx.contractCall('token', 'mint', [types.uint(100), types.principal(wallet3.address)], deployer.address)
        ]);

        const [mintCall1, mintCall2, mintCall3] = block1.receipts;

        mintCall1.result.expectOk().expectBool(true);
        mintCall2.result.expectOk().expectBool(true);
        mintCall3.result.expectOk().expectBool(true);

        let wallet1Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(100);

        let wallet2Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(100);

        let wallet3Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(100);

        const block2 = chain.mineBlock([
            Tx.contractCall('token', 'transfer', [types.uint(10), types.principal(wallet1.address), types.principal(wallet3.address)], wallet1.address),
            Tx.contractCall('token', 'transfer', [types.uint(10), types.principal(wallet2.address), types.principal(wallet3.address)], wallet2.address),
            Tx.contractCall('token', 'transfer', [types.uint(10), types.principal(wallet3.address), types.principal(wallet1.address)], wallet1.address)
        ]);

        const [goodTransferCall1, goodTransferCall2, badTransferCall1] = block2.receipts;

        goodTransferCall1.result.expectOk().expectBool(true);
        goodTransferCall2.result.expectOk().expectBool(true);
        badTransferCall1.result.expectErr().expectUint(unauthorizedTransfer);

        wallet1Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(90);

        wallet2Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(90);

        wallet3Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(120);

        const block3 = chain.mineBlock([
            Tx.contractCall('token', 'approve', [types.principal(wallet1.address), types.uint(20)], wallet3.address),
            Tx.contractCall('token', 'approve', [types.principal(wallet2.address), types.uint(20)], wallet3.address)
        ]);

        const [approveCall1, approveCall2] = block3.receipts;

        approveCall1.result.expectOk().expectBool(true);
        approveCall2.result.expectOk().expectBool(true);

        const allowanceQuery1 = chain.callReadOnlyFn('token', 'allowance', [types.principal(wallet3.address), types.principal(wallet1.address)], wallet3.address);
        allowanceQuery1.result.expectOk().expectUint(20);

        const allowanceQuery2 = chain.callReadOnlyFn('token', 'allowance', [types.principal(wallet3.address), types.principal(wallet2.address)], wallet2.address);
        allowanceQuery2.result.expectOk().expectUint(20);

        const badAllowanceQuery = chain.callReadOnlyFn('token', 'allowance', [types.principal(wallet3.address), types.principal(wallet2.address)], wallet1.address);
        badAllowanceQuery.result.expectErr().expectUint(unauthorizedAllowanceQuery);

        const block4 = chain.mineBlock([
            Tx.contractCall('token', 'transfer', [types.uint(5), types.principal(wallet3.address), types.principal(wallet4.address)], wallet1.address),
            Tx.contractCall('token', 'transfer', [types.uint(5), types.principal(wallet3.address), types.principal(wallet4.address)], wallet2.address),
            Tx.contractCall('token', 'transfer', [types.uint(5), types.principal(wallet3.address), types.principal(wallet4.address)], wallet4.address)
        ]);

        const [goodTransferCall3, goodTransferCall4, badTransferCall2] = block4.receipts;

        goodTransferCall3.result.expectOk().expectBool(true);
        goodTransferCall4.result.expectOk().expectBool(true);
        badTransferCall2.result.expectErr().expectUint(unauthorizedTransfer);

        wallet3Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(110);

        const wallet4Balance = chain.callReadOnlyFn('token', 'get-balance-of', [types.principal(wallet4.address)], wallet4.address);
        wallet4Balance.result.expectOk().expectUint(10);

        const allowanceQuery3 = chain.callReadOnlyFn('token', 'allowance', [types.principal(wallet3.address), types.principal(wallet1.address)], wallet1.address);
        allowanceQuery3.result.expectOk().expectUint(15);

        const allowanceQuery4 = chain.callReadOnlyFn('token', 'allowance', [types.principal(wallet3.address), types.principal(wallet2.address)], wallet3.address);
        allowanceQuery4.result.expectOk().expectUint(15);

        const block5 = chain.mineBlock([
            Tx.contractCall('token', 'decrease-allowance', [types.principal(wallet1.address), types.uint(10)], wallet3.address),
            Tx.contractCall('token', 'decrease-allowance', [types.principal(wallet1.address), types.uint(10)], wallet4.address)
        ]);

        const [goodDecreaseAllowanceCall, badDecreaseAllowanceCall] = block5.receipts;

        goodDecreaseAllowanceCall.result.expectOk().expectBool(true);
        badDecreaseAllowanceCall.result.expectErr().expectUint(attemptToDecreaseInexistentAllowance);

        const allowanceQuery5 = chain.callReadOnlyFn('token', 'allowance', [types.principal(wallet3.address), types.principal(wallet1.address)], wallet1.address);
        allowanceQuery5.result.expectOk().expectUint(5);
    }
});
