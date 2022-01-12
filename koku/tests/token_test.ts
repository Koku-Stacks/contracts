import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";

Clarinet.test({
    name: "Ensure the ownership related functions work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const unauthorizedOwnershipTransfer = 104;
        const attemptToTransferOwnershipToOwner = 105;
        const noOwnershipTransferSubmitted = 106;
        const unauthorizedOwnershipTransferConfirmation = 107;
        const unauthorizedOnwershipTransferCancellation = 108;
        const previousOwnershipTransferSubmissionNotCancelled = 109;

        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        let contractOwner = chain.callReadOnlyFn('token', 'get-contract-owner', [], wallet1.address);
        contractOwner.result.expectPrincipal(deployer.address);

        const block1 = chain.mineBlock([
            Tx.contractCall('token', 'submit-ownership-transfer', [types.principal(deployer.address)], deployer.address),
            Tx.contractCall('token', 'submit-ownership-transfer', [types.principal(wallet1.address)], wallet1.address)
        ]);

        const [badOwnershipTransferSubmissionCall1, badOwnershipTransferSubmissionCall2] = block1.receipts;

        badOwnershipTransferSubmissionCall1.result.expectErr().expectUint(attemptToTransferOwnershipToOwner);
        badOwnershipTransferSubmissionCall2.result.expectErr().expectUint(unauthorizedOwnershipTransfer);

        const block2 = chain.mineBlock([
            Tx.contractCall('token', 'submit-ownership-transfer', [types.principal(wallet2.address)], deployer.address)
        ]);

        const [goodOwnershipTransferSubmissionCall1] = block2.receipts;

        goodOwnershipTransferSubmissionCall1.result.expectOk().expectBool(true);

        const block3 = chain.mineBlock([
            Tx.contractCall('token', 'submit-ownership-transfer', [types.principal(wallet1.address)], deployer.address)
        ]);

        const [badOwnershipTransferSubmissionCall3] = block3.receipts;
        badOwnershipTransferSubmissionCall3.result.expectErr().expectUint(previousOwnershipTransferSubmissionNotCancelled);

        const block4 = chain.mineBlock([
            Tx.contractCall('token', 'cancel-ownership-transfer', [], wallet1.address)
        ]);

        const [badCancelOwnershipTransferCall] = block4.receipts;

        badCancelOwnershipTransferCall.result.expectErr().expectUint(unauthorizedOnwershipTransferCancellation);

        const block5 = chain.mineBlock([
            Tx.contractCall('token', 'cancel-ownership-transfer', [], deployer.address)
        ]);

        const [goodCancelOwnershipTransferCall] = block5.receipts;

        goodCancelOwnershipTransferCall.result.expectOk().expectBool(true);

        const block6 = chain.mineBlock([
            Tx.contractCall('token', 'confirm-ownership-transfer', [], deployer.address)
        ]);

        const [badConfirmOwnershipTransferCall1] = block6.receipts;

        badConfirmOwnershipTransferCall1.result.expectErr().expectUint(noOwnershipTransferSubmitted);

        const block7 = chain.mineBlock([
            Tx.contractCall('token', 'submit-ownership-transfer', [types.principal(wallet1.address)], deployer.address)
        ]);

        const [goodOwnershipTransferSubmissionCall2] = block7.receipts;

        goodOwnershipTransferSubmissionCall2.result.expectOk().expectBool(true);

        const block8 = chain.mineBlock([
            Tx.contractCall('token', 'confirm-ownership-transfer', [], deployer.address)
        ]);

        const [badConfirmOwnershipTransferCall2] = block8.receipts;

        badConfirmOwnershipTransferCall2.result.expectErr().expectUint(unauthorizedOwnershipTransferConfirmation);

        const block9 = chain.mineBlock([
            Tx.contractCall('token', 'confirm-ownership-transfer', [], wallet1.address)
        ]);

        const [goodConfirmOwnershipTransferCall] = block9.receipts;

        goodConfirmOwnershipTransferCall.result.expectOk().expectBool(true);

        contractOwner = chain.callReadOnlyFn('token', 'get-contract-owner', [], wallet1.address);
        contractOwner.result.expectPrincipal(wallet1.address);
    }
});

Clarinet.test({
    name: "Ensure the token uri facilities work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const unauthorizedUriUpdate = 110;

        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        let uri = chain.callReadOnlyFn('token', 'get-token-uri', [], wallet1.address);
        uri.result.expectOk().expectNone();

        const newUri = 'www.token.com';

        const block1 = chain.mineBlock([
            Tx.contractCall('token', 'set-token-uri', [types.utf8(newUri)], deployer.address)
        ]);

        const [goodSetTokenUriCall] = block1.receipts;
        goodSetTokenUriCall.result.expectOk().expectBool(true);

        let uriQuery = chain.callReadOnlyFn('token', 'get-token-uri', [], wallet1.address);
        uriQuery.result.expectOk().expectSome().expectUtf8(newUri);

        const block2 = chain.mineBlock([
            Tx.contractCall('token', 'set-token-uri', [types.utf8('www.bad.com')], wallet1.address)
        ]);

        const [badSetTokenUriCall] = block2.receipts;
        badSetTokenUriCall.result.expectErr().expectUint(unauthorizedUriUpdate);

        uriQuery = chain.callReadOnlyFn('token', 'get-token-uri', [], wallet1.address);
        uriQuery.result.expectOk().expectSome().expectUtf8(newUri);
    }
});

Clarinet.test({
    name: "Ensure the constant read only functions are returning as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

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

        let deployerBalance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(deployer.address)], deployer.address);
        deployerBalance.result.expectOk().expectUint(100);

        let wallet1Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(50);

        const block2 = chain.mineBlock([
            Tx.contractCall('token', 'burn', [types.uint(10)], deployer.address),
            Tx.contractCall('token', 'burn', [types.uint(0)], deployer.address)
        ]);

        const [goodBurnCall, zeroBurnCall] = block2.receipts;

        goodBurnCall.result.expectOk().expectBool(true);
        zeroBurnCall.result.expectErr().expectUint(1);

        deployerBalance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(deployer.address)], deployer.address);
        deployerBalance.result.expectOk().expectUint(90);

        wallet1Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
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

        let wallet1Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(100);

        let wallet2Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(100);

        let wallet3Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(100);

        const buffer = new ArrayBuffer(8);
        const view = new Int8Array(buffer);
        view[0] = 12;

        const block2 = chain.mineBlock([
            Tx.contractCall('token', 'transfer', [types.uint(10), types.principal(wallet1.address), types.principal(wallet3.address), types.some(types.buff(buffer))], wallet1.address),
            Tx.contractCall('token', 'transfer', [types.uint(10), types.principal(wallet2.address), types.principal(wallet3.address), types.none()], wallet2.address),
            Tx.contractCall('token', 'transfer', [types.uint(10), types.principal(wallet3.address), types.principal(wallet1.address), types.none()], wallet1.address)
        ]);

        const [goodTransferCall1, goodTransferCall2, badTransferCall1] = block2.receipts;

        goodTransferCall1.result.expectOk().expectBool(true);
        assertEquals(goodTransferCall1.events[0],
            {ft_transfer_event: {
                amount: '10',
                asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token::token',
                recipient: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
                sender: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5'
            },
             type: 'ft_transfer_event'});
        assertEquals(goodTransferCall1.events[1],
            {contract_event: {
                contract_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token',
                topic: 'print',
                value: '0x0c00000000000000'
            },
             type: 'contract_event'});

        goodTransferCall2.result.expectOk().expectBool(true);
        assertEquals(goodTransferCall2.events.length, 1)

        badTransferCall1.result.expectErr().expectUint(unauthorizedTransfer);

        wallet1Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(90);

        wallet2Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(90);

        wallet3Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet3.address)], wallet3.address);
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
            Tx.contractCall('token', 'transfer-from', [types.uint(5), types.principal(wallet3.address), types.principal(wallet4.address)], wallet1.address),
            Tx.contractCall('token', 'transfer-from', [types.uint(5), types.principal(wallet3.address), types.principal(wallet4.address)], wallet2.address),
            Tx.contractCall('token', 'transfer-from', [types.uint(5), types.principal(wallet3.address), types.principal(wallet4.address)], wallet4.address)
        ]);

        const [goodTransferFromCall1, goodTransferFromCall2, badTransferFromCall] = block4.receipts;

        goodTransferFromCall1.result.expectOk().expectBool(true);
        goodTransferFromCall2.result.expectOk().expectBool(true);
        badTransferFromCall.result.expectErr().expectUint(unauthorizedTransfer);

        wallet3Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(110);

        const wallet4Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet4.address)], wallet4.address);
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

Clarinet.test({
    name: "Not enough balance for transfer",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const notEnoughBalanceErr = 1;

        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        const block1 = chain.mineBlock([
            Tx.contractCall('token', 'mint', [types.uint(50), types.principal(wallet1.address)], deployer.address)
        ]);

        const [mintCallToOtherWallet] = block1.receipts;

        mintCallToOtherWallet.result.expectOk().expectBool(true);

        const supply = chain.callReadOnlyFn('token', 'get-total-supply', [], deployer.address);
        supply.result.expectOk().expectUint(50);

        let wallet1Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(50);

        const block2 = chain.mineBlock([
            Tx.contractCall('token', 'transfer', [types.uint(10), types.principal(wallet1.address), types.principal(wallet2.address), types.none()], wallet1.address),
            Tx.contractCall('token', 'transfer', [types.uint(50), types.principal(wallet1.address), types.principal(wallet2.address), types.none()], wallet1.address),
        ]);

        const [goodTransferCall, notEnoughBalance] = block2.receipts;

        goodTransferCall.result.expectOk().expectBool(true);
        notEnoughBalance.result.expectErr().expectUint(notEnoughBalanceErr);

        wallet1Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(40);

        let wallet2Balance = chain.callReadOnlyFn('token', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(10);
    }
});
