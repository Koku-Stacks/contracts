import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";

const contractAlreadyAuthorized = 100
const contractIsNotAuthorized = 101
const notAuthorized = 102
const tokenOwnerOnly = 103
const contractOwnerOnly = 104
const ownershipTransferAlreadySubmitted = 105
const noOwnershipTransferToCancel = 106
const noOwnershipTransferToConfirm = 107
const notNewOwner = 108

Clarinet.test({
    name: "Ensure the ownership facilities work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        let tokenOwner = chain.callReadOnlyFn('token-v2', 'get-owner', [], wallet2.address);
        tokenOwner.result.expectPrincipal(deployer.address);

        const block1 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'submit-ownership-transfer',
                            [types.principal(wallet1.address)],
                            wallet1.address)
        ]);

        const [badSubmitOwnershipTransferCall1] = block1.receipts;

        badSubmitOwnershipTransferCall1.result.expectErr().expectUint(contractOwnerOnly);

        const block2 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'submit-ownership-transfer',
                            [types.principal(wallet1.address)],
                            deployer.address)
        ]);

        const [goodSubmitOwnershipTransferCall1] = block2.receipts;

        goodSubmitOwnershipTransferCall1.result.expectOk().expectBool(true);

        const block3 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'submit-ownership-transfer',
                            [types.principal(wallet2.address)],
                            deployer.address)
        ]);

        const [badSubmitOwnershipTransferCall3] = block3.receipts;

        badSubmitOwnershipTransferCall3.result.expectErr().expectUint(ownershipTransferAlreadySubmitted);

        const block4 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'cancel-ownership-transfer',
                            [],
                            wallet2.address)
        ]);

        const [badCancelOwnershipTransferCall1] = block4.receipts;

        badCancelOwnershipTransferCall1.result.expectErr().expectUint(contractOwnerOnly);

        const block5 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'cancel-ownership-transfer',
                            [],
                            deployer.address)
        ]);

        const [goodCancelOwnershipTransferCall] = block5.receipts;

        goodCancelOwnershipTransferCall.result.expectOk().expectBool(true);

        const block6 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'confirm-ownership-transfer',
                            [],
                            wallet1.address)
        ]);

        const [badConfirmOwnershipTransferCall1] = block6.receipts;

        badConfirmOwnershipTransferCall1.result.expectErr().expectUint(noOwnershipTransferToConfirm);

        const block7 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'cancel-ownership-transfer',
                            [],
                            deployer.address)
        ]);

        const [badCancelOwnershipTransferCall2] = block7.receipts;

        badCancelOwnershipTransferCall2.result.expectErr().expectUint(noOwnershipTransferToCancel);

        const block8 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'submit-ownership-transfer',
                            [types.principal(wallet2.address)],
                            deployer.address)
        ]);

        const [goodSubmitOwnershipTransferCall2] = block8.receipts;

        goodSubmitOwnershipTransferCall2.result.expectOk().expectBool(true);

        const block9 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'confirm-ownership-transfer',
                            [],
                            deployer.address)
        ]);

        const [badConfirmOwnershipTransferCall2] = block9.receipts;

        badConfirmOwnershipTransferCall2.result.expectErr().expectUint(notNewOwner);

        const block10 = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'confirm-ownership-transfer',
                            [],
                            wallet2.address)
        ]);

        const [goodConfirmOwnershipTransferCall] = block10.receipts;

        goodConfirmOwnershipTransferCall.result.expectOk().expectBool(true);

        tokenOwner = chain.callReadOnlyFn('token-v2', 'get-owner', [], wallet2.address);
        tokenOwner.result.expectPrincipal(wallet2.address);
    }
});

Clarinet.test({
    name: "Ensure the uri facilities work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        let uri = chain.callReadOnlyFn('token-v2', 'get-token-uri', [], wallet1.address);
        uri.result.expectOk().expectSome().expectUtf8('www.token.com');

        const newUri = 'www.token.org';

        const block1 = chain.mineBlock([
            Tx.contractCall('token-v2', 'set-token-uri', [types.utf8(newUri)], deployer.address)
        ]);

        const [goodSetUriCall] = block1.receipts;
        goodSetUriCall.result.expectOk().expectBool(true);

        let uriQuery = chain.callReadOnlyFn('token-v2', 'get-token-uri', [], wallet1.address);
        uriQuery.result.expectOk().expectSome().expectUtf8(newUri);

        const block2 = chain.mineBlock([
            Tx.contractCall('token-v2', 'set-token-uri', [types.utf8('www.bad.com')], wallet1.address)
        ]);

        const [badSetUriCall] = block2.receipts;
        badSetUriCall.result.expectErr().expectUint(contractOwnerOnly);

        uriQuery = chain.callReadOnlyFn('token-v2', 'get-token-uri', [], wallet1.address);
        uriQuery.result.expectOk().expectSome().expectUtf8(newUri);
    }
});

Clarinet.test({
    name: "Ensure authorization mechanism works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        const authorizationBlock = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'add-authorized-contract',
                            [types.principal(`${deployer.address}.minting`)],
                            deployer.address)
        ]);

        let mintingAuthorization = chain.callReadOnlyFn('token-v2', 'is-authorized', [types.principal(`${deployer.address}.minting`)], deployer.address);
        mintingAuthorization.result.expectBool(true);

        const block1 = chain.mineBlock([
            Tx.contractCall('token-v2', 'revoke-authorized-contract', [types.principal(`${deployer.address}.minting`)], wallet1.address)
        ]);

        const [badRevokeCall1] = block1.receipts;

        badRevokeCall1.result.expectErr().expectUint(contractOwnerOnly);

        mintingAuthorization = chain.callReadOnlyFn('token-v2', 'is-authorized', [types.principal(`${deployer.address}.minting`)], deployer.address);
        mintingAuthorization.result.expectBool(true);

        const block2 = chain.mineBlock([
            Tx.contractCall('token-v2', 'revoke-authorized-contract', [types.principal(`${deployer.address}.minting`)], deployer.address)
        ]);

        const [goodRevokeCall1] = block2.receipts;

        goodRevokeCall1.result.expectOk().expectBool(true);

        mintingAuthorization = chain.callReadOnlyFn('token-v2', 'is-authorized', [types.principal(`${deployer.address}.minting`)], deployer.address);
        mintingAuthorization.result.expectBool(false);

        const block3 = chain.mineBlock([
            Tx.contractCall('token-v2', 'revoke-authorized-contract', [types.principal(`${deployer.address}.minting`)], deployer.address)
        ]);

        const [badRevokeCall2] = block3.receipts;

        badRevokeCall2.result.expectErr().expectUint(contractIsNotAuthorized);

        mintingAuthorization = chain.callReadOnlyFn('token-v2', 'is-authorized', [types.principal(`${deployer.address}.minting`)], deployer.address);
        mintingAuthorization.result.expectBool(false);

        const block4 = chain.mineBlock([
            Tx.contractCall('token-v2', 'add-authorized-contract', [types.principal(`${deployer.address}.minting`)], wallet1.address)
        ]);

        const [badAddCall1] = block4.receipts;

        badAddCall1.result.expectErr().expectUint(contractOwnerOnly);

        mintingAuthorization = chain.callReadOnlyFn('token-v2', 'is-authorized', [types.principal(`${deployer.address}.minting`)], deployer.address);
        mintingAuthorization.result.expectBool(false);

        const block5 = chain.mineBlock([
            Tx.contractCall('token-v2', 'add-authorized-contract', [types.principal(`${deployer.address}.minting`)], deployer.address)
        ]);

        const [goodAddCall1] = block5.receipts;

        goodAddCall1.result.expectOk().expectBool(true);

        mintingAuthorization = chain.callReadOnlyFn('token-v2', 'is-authorized', [types.principal(`${deployer.address}.minting`)], deployer.address);
        mintingAuthorization.result.expectBool(true);

        const block6 = chain.mineBlock([
            Tx.contractCall('token-v2', 'add-authorized-contract', [types.principal(`${deployer.address}.minting`)], deployer.address)
        ]);

        const [badAddCall2] = block6.receipts;

        badAddCall2.result.expectErr().expectUint(contractAlreadyAuthorized);
    }
});

Clarinet.test({
    name: "Not enough balance for transfer",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const notEnoughBalanceErr = 1;

        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        const authorizationBlock = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'add-authorized-contract',
                            [types.principal(`${deployer.address}.minting`)],
                            deployer.address)
        ]);

        const block1 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(50), types.principal(wallet1.address)], deployer.address)
        ]);

        const [mintCallToOtherWallet] = block1.receipts;

        mintCallToOtherWallet.result.expectOk().expectBool(true);

        const supply = chain.callReadOnlyFn('token-v2', 'get-total-supply', [], deployer.address);
        supply.result.expectOk().expectUint(50);

        let wallet1Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(50);

        const block2 = chain.mineBlock([
            Tx.contractCall('token-v2', 'transfer', [types.uint(10), types.principal(wallet1.address), types.principal(wallet2.address), types.none()], wallet1.address),
            Tx.contractCall('token-v2', 'transfer', [types.uint(50), types.principal(wallet1.address), types.principal(wallet2.address), types.none()], wallet1.address),
        ]);

        const [goodTransferCall, notEnoughBalance] = block2.receipts;

        goodTransferCall.result.expectOk().expectBool(true);
        notEnoughBalance.result.expectErr().expectUint(notEnoughBalanceErr);

        wallet1Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(40);

        let wallet2Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(10);
    }
});

Clarinet.test({
    name: "Ensure transfer facilities work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;

        const authorizationBlock = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'add-authorized-contract',
                            [types.principal(`${deployer.address}.minting`)],
                            deployer.address)
        ]);

        const block1 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(wallet1.address)], deployer.address),
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(wallet2.address)], deployer.address),
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(wallet3.address)], deployer.address)
        ]);

        const [mintCall1, mintCall2, mintCall3] = block1.receipts;

        mintCall1.result.expectOk().expectBool(true);
        mintCall2.result.expectOk().expectBool(true);
        mintCall3.result.expectOk().expectBool(true);

        let wallet1Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(100);

        let wallet2Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(100);

        let wallet3Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(100);

        const buffer = new ArrayBuffer(8);
        const view = new Int8Array(buffer);
        view[0] = 12;

        const block2 = chain.mineBlock([
            Tx.contractCall('token-v2', 'transfer', [types.uint(10), types.principal(wallet1.address), types.principal(wallet3.address), types.some(types.buff(buffer))], wallet1.address),
            Tx.contractCall('token-v2', 'transfer', [types.uint(10), types.principal(wallet2.address), types.principal(wallet3.address), types.none()], wallet2.address),
            Tx.contractCall('token-v2', 'transfer', [types.uint(10), types.principal(wallet3.address), types.principal(wallet1.address), types.none()], wallet1.address)
        ]);

        const [goodTransferCall1, goodTransferCall2, badTransferCall1] = block2.receipts;

        goodTransferCall1.result.expectOk().expectBool(true);
        assertEquals(goodTransferCall1.events[0],
            {
                ft_transfer_event: {
                    amount: '10',
                    asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-v2::token',
                    recipient: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
                    sender: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5'
                },
                type: 'ft_transfer_event'
            });
        assertEquals(goodTransferCall1.events[1],
            {
                contract_event: {
                    contract_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-v2',
                    topic: 'print',
                    value: '0x0c00000000000000'
                },
                type: 'contract_event'
            });

        goodTransferCall2.result.expectOk().expectBool(true);
        assertEquals(goodTransferCall2.events.length, 1)

        badTransferCall1.result.expectErr().expectUint(tokenOwnerOnly);

        wallet1Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(90);

        wallet2Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(90);

        wallet3Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(120);
    }
});

Clarinet.test({
    name: "Ensure mint and burn functions work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const unauthorizedMinter = 100;

        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        const authorizationBlock = chain.mineBlock([
            Tx.contractCall('token-v2',
                            'add-authorized-contract',
                            [types.principal(`${deployer.address}.minting`)],
                            deployer.address)
        ]);

        const block1 = chain.mineBlock([
            Tx.contractCall('token-v2', 'mint', [types.uint(100), types.principal(deployer.address)], deployer.address)
        ]);

        const [badMintCall1] = block1.receipts;

        badMintCall1.result.expectErr().expectUint(notAuthorized);

        const block2 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(deployer.address)], deployer.address),
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(wallet1.address)], wallet1.address),
            Tx.contractCall('minting', 'mint', [types.uint(50), types.principal(wallet1.address)], deployer.address)
        ]);

        const [goodMintCall, badMintCall2, mintCallToOtherWallet] = block2.receipts;

        goodMintCall.result.expectOk().expectBool(true);
        badMintCall2.result.expectErr().expectUint(unauthorizedMinter);
        mintCallToOtherWallet.result.expectOk().expectBool(true);

        let supply = chain.callReadOnlyFn('token-v2', 'get-total-supply', [], deployer.address);
        supply.result.expectOk().expectUint(150);

        let deployerBalance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(deployer.address)], deployer.address);
        deployerBalance.result.expectOk().expectUint(100);

        let wallet1Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(50);

        const block3 = chain.mineBlock([
            Tx.contractCall('token-v2', 'burn', [types.uint(10)], deployer.address),
            Tx.contractCall('token-v2', 'burn', [types.uint(0)], deployer.address)
        ]);

        const [goodBurnCall, zeroBurnCall] = block3.receipts;

        goodBurnCall.result.expectOk().expectBool(true);
        zeroBurnCall.result.expectErr().expectUint(1);

        deployerBalance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(deployer.address)], deployer.address);
        deployerBalance.result.expectOk().expectUint(90);

        wallet1Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(50);

        supply = chain.callReadOnlyFn('token-v2', 'get-total-supply', [], deployer.address);
        supply.result.expectOk().expectUint(140);
    }
});

Clarinet.test({
    name: "Direct mint call",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        const block1 = chain.mineBlock([
            Tx.contractCall('token-v2', 'mint', [types.uint(100), types.principal(deployer.address)], deployer.address)
        ]);

        const [badMintCall1] = block1.receipts;

        badMintCall1.result.expectErr().expectUint(notAuthorized);

        const block2 = chain.mineBlock([
            Tx.contractCall('token-v2', 'add-authorized-contract', [types.principal(`${deployer.address}`)], deployer.address)
        ]);

        const [goodAddCall1] = block2.receipts;

        goodAddCall1.result.expectOk().expectBool(true);

        const block3 = chain.mineBlock([
            Tx.contractCall('token-v2', 'mint', [types.uint(20), types.principal(deployer.address)], deployer.address),
            Tx.contractCall('token-v2', 'mint', [types.uint(100), types.principal(wallet1.address)], wallet1.address),
            Tx.contractCall('token-v2', 'mint', [types.uint(30), types.principal(wallet1.address)], deployer.address)
        ]);

        const [goodMintCall, badMintCall2, mintCallToOtherWallet] = block3.receipts;

        goodMintCall.result.expectOk().expectBool(true);
        badMintCall2.result.expectErr().expectUint(notAuthorized);
        mintCallToOtherWallet.result.expectOk().expectBool(true);

        const deployerBalance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(deployer.address)], deployer.address);
        deployerBalance.result.expectOk().expectUint(20);

        const wallet1Balance = chain.callReadOnlyFn('token-v2', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(30);

        const supply = chain.callReadOnlyFn('token-v2', 'get-total-supply', [], deployer.address);
        supply.result.expectOk().expectUint(50);
    }
});

Clarinet.test({
    name: "Ensure the constant read only functions are returning as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        const decimals = chain.callReadOnlyFn('token-v2', 'get-decimals', [], deployer.address);
        decimals.result.expectOk().expectUint(6);

        const symbol = chain.callReadOnlyFn('token-v2', 'get-symbol', [], deployer.address);
        symbol.result.expectOk().expectAscii('TKN');

        const name = chain.callReadOnlyFn('token-v2', 'get-name', [], deployer.address);
        name.result.expectOk().expectAscii('token');
    }
});