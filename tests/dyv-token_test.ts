import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";

const ERR_CONTRACT_ALREADY_AUTHORIZED = 100;
const ERR_CONTRACT_IS_NOT_AUTHORIZED = 101;
const ERR_NOT_AUTHORIZED = 102;
const ERR_CONTRACT_OWNER_ONLY = 103;
const ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED = 104;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL = 105;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM = 106;
const ERR_NOT_NEW_OWNER = 107;
const ERR_INSUFFICIENT_TOKENS_TO_MINT = 108;
const ERR_CONTRACT_LOCKED = 109;
const ERR_SENDER_NOT_ENOUGH_BALANCE = 1;
const ERR_ZERO_CALL = 1;
const ERR_SENDER_RECIPIENT_SAME = 2;
const ERR_AMOUNT_NOT_POSITIVE = 3;
const ERR_SENDER_IS_NOT_HOLDER = 4;

Clarinet.test({
    name: "Ensure that set-contract-lock can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'dyv-token',
                'set-contract-lock',
                [ types.bool(true)],
                userA.address)
        ]);

        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY)
    }
})

Clarinet.test({
    name: "Ensure that submit ownership can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                userB.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);
    }
})

Clarinet.test({
    name: "Ensure that submit ownership transfer cannot be called again if already submitted",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall('dyv-token',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address)
            ]);
        call.receipts[1].result.expectErr().expectUint(ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED);
    }
})

Clarinet.test({
    name: "Ensure that cancel ownership can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'cancel-ownership-transfer',
                [],
                userB.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);
    }
})

Clarinet.test({
    name: "Ensure that cancel ownership transfer cannot be called for non submitted user",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'cancel-ownership-transfer',
                [],
                deployer.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL);
    }
})

Clarinet.test({
    name: "Ensure that confirm ownership can only be called when a transfer has been submitted",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'confirm-ownership-transfer',
                [],
                userA.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM);
    }
})

Clarinet.test({
    name: "Ensure that confirm ownership transfer can only be called by submitted owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall('dyv-token',
                'confirm-ownership-transfer',
                [],
                userA.address)
            ]);
        call.receipts[1].result.expectErr().expectUint(ERR_NOT_NEW_OWNER);
    }
})

Clarinet.test({
    name: "Ensure that add authorized contract can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                userA.address),
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);
    }
})

Clarinet.test({
    name: "Ensure that add authorized contract can only be called on new contracts",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
            ]);
        call.receipts[1].result.expectErr().expectUint(ERR_CONTRACT_ALREADY_AUTHORIZED);
    }
})

Clarinet.test({
    name: "Ensure that revoke authorized contract can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'revoke-authorized-contract',
                [types.principal(deployer.address)],
                userA.address),
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);
    }
})

Clarinet.test({
    name: "Ensure that revoke authorized contract can only be called on existing contracts",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'revoke-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_IS_NOT_AUTHORIZED);
    }
})

Clarinet.test({
    name: "Ensure that set-token-uri can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'set-token-uri',
                [types.utf8("www.new-token.com")],
                userA.address),
            ]);
        call.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);
    }
})

Clarinet.test({
    name: "Ensure that mint can only be called if contract is unlocked",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'dyv-token',
                'set-contract-lock',
                [ types.bool(true)],
                deployer.address),
            Tx.contractCall(
                'dyv-token',
                'mint',
                [
                    types.uint(1000),
                    types.principal(userA.address)
                ],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true)
        call.receipts[1].result.expectErr().expectUint(ERR_CONTRACT_LOCKED)
    }
})

Clarinet.test({
    name: "Ensure that authorized user can mint tokens",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
            ]);
        
        let readOnlyCall = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        readOnlyCall.result.expectBool(true);

        call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'mint',
                [
                    types.uint(1000),
                    types.principal(userA.address)
                ],
                userB.address),
            ]);
        
        call.receipts[0].result.expectErr().expectUint(ERR_NOT_AUTHORIZED);
    }
})

Clarinet.test({
    name: "Ensure that sufficient ammount is being minted in mint function",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
            ]);
        
        let readOnlyCall = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        readOnlyCall.result.expectBool(true);

        call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'mint',
                [
                    types.uint(10500000000000),
                    types.principal(userA.address)
                ],
                deployer.address),

                Tx.contractCall('dyv-token',
                'mint',
                [
                    types.uint(10500000000000),
                    types.principal(userB.address)
                ],
                deployer.address),

                Tx.contractCall(
                    'dyv-token',
                    'burn',
                    [types.uint(1000),],
                    userA.address),

                Tx.contractCall('dyv-token',
                    'mint',
                    [
                        types.uint(1),
                        types.principal(userB.address)
                    ],
                    deployer.address),
            ]);

        call.receipts[0].result.expectOk();
        call.receipts[1].result.expectOk();
        call.receipts[2].result.expectOk();
        call.receipts[3].result.expectErr().expectUint(ERR_INSUFFICIENT_TOKENS_TO_MINT);
    }
})

Clarinet.test({
    name: "Ensure that ft-mint is working fine",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
            ]);
        
        call.receipts[0].result.expectOk();

        let readOnlyCall = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        readOnlyCall.result.expectBool(true);

        call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'mint',
                [
                    types.uint(0),
                    types.principal(userA.address)
                ],
                deployer.address),
            ]);
        
        call.receipts[0].result.expectErr().expectUint(ERR_ZERO_CALL);
    }
})

Clarinet.test({
    name: "Ensure that ft-burn is working fine",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
            ]);
        
        let readOnlyCall = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        readOnlyCall.result.expectBool(true);

        call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'burn',
                [
                    types.uint(0),
                ],
                deployer.address),
            ]);
        
        call.receipts[0].result.expectErr().expectUint(ERR_ZERO_CALL);
    }
})


Clarinet.test({
    name: "Ensure that burn can only be called if contract is unlocked",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'dyv-token',
                'set-contract-lock',
                [types.bool(true)],
                deployer.address),
            Tx.contractCall(
                'dyv-token',
                'burn',
                [types.uint(1000),],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true)
        call.receipts[1].result.expectErr().expectUint(ERR_CONTRACT_LOCKED)
    }
})

Clarinet.test({
    name: "Ensure that transfer can only be called if contract is unlocked",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;

        let call = chain.mineBlock([
            Tx.contractCall(
                'dyv-token',
                'set-contract-lock',
                [types.bool(true)],
                deployer.address),
            Tx.contractCall(
                'dyv-token',
                'transfer',
                [
                    types.uint(1000),
                    types.principal(userA.address),
                    types.principal(deployer.address),
                    types.none()
                ],
                deployer.address)
        ]);

        call.receipts[0].result.expectOk().expectBool(true)
        call.receipts[1].result.expectErr().expectUint(ERR_CONTRACT_LOCKED)
    }
})

Clarinet.test({
    name: "Ensure that transfer can only be called by token-owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
            ]);
        
        let readOnlyCall = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        readOnlyCall.result.expectBool(true);

        call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'mint',
                [
                    types.uint(1000),
                    types.principal(userA.address)
                ],
                deployer.address),

                Tx.contractCall('dyv-token',
                'transfer',
                [
                    types.uint(100),
                    types.principal(userA.address),
                    types.principal(userB.address),
                    types.none(),
                ],
                deployer.address),
            ]);
        
        call.receipts[1].result.expectErr().expectUint(ERR_SENDER_IS_NOT_HOLDER);
    }
})

Clarinet.test({
    name: "Ensure that transfer is working fine",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
            ]);
        
        let readOnlyCall = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        readOnlyCall.result.expectBool(true);

        call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'mint',
                [
                    types.uint(1000),
                    types.principal(userA.address)
                ],
                deployer.address),

                Tx.contractCall('dyv-token',
                'mint',
                [
                    types.uint(1000),
                    types.principal(userB.address)
                ],
                deployer.address),

                Tx.contractCall('dyv-token',
                'transfer',
                [
                    types.uint(10000),
                    types.principal(userA.address),
                    types.principal(userB.address),
                    types.none(),
                ],
                userA.address),

                Tx.contractCall('dyv-token',
                'transfer',
                [
                    types.uint(1000),
                    types.principal(userA.address),
                    types.principal(userA.address),
                    types.none(),
                ],
                userA.address),

                Tx.contractCall('dyv-token',
                'transfer',
                [
                    types.uint(0),
                    types.principal(userA.address),
                    types.principal(userB.address),
                    types.none(),
                ],
                userA.address),

                Tx.contractCall('dyv-token',
                'transfer',
                [
                    types.uint(100),
                    types.principal(userB.address),
                    types.principal(userA.address),
                    types.none(),
                ],
                userA.address),
            ]);
        
        call.receipts[0].result.expectOk().expectBool(true);
        call.receipts[1].result.expectOk().expectBool(true);
        call.receipts[2].result.expectErr().expectUint(ERR_SENDER_NOT_ENOUGH_BALANCE);
        call.receipts[3].result.expectErr().expectUint(ERR_SENDER_RECIPIENT_SAME);
        call.receipts[4].result.expectErr().expectUint(ERR_AMOUNT_NOT_POSITIVE);
        call.receipts[5].result.expectErr().expectUint(ERR_SENDER_IS_NOT_HOLDER);

        let balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(userB.address)], userB.address);
        balance.result.expectOk().expectUint(1000);

        balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(userB.address)], userB.address);
        balance.result.expectOk().expectUint(1000);
    }
})

Clarinet.test({
    name: "Ensure the uri registry works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        let uri = chain.callReadOnlyFn('dyv-token', 'get-token-uri', [], wallet1.address);
        uri.result.expectOk().expectSome().expectUtf8('www.token.com');

        const newUri = 'www.token.org';

        const block1 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'set-token-uri', [types.utf8(newUri)], deployer.address)
        ]);

        const [goodSetUriCall] = block1.receipts;
        goodSetUriCall.result.expectOk().expectBool(true);

        let uriQuery = chain.callReadOnlyFn('dyv-token', 'get-token-uri', [], wallet1.address);
        uriQuery.result.expectOk().expectSome().expectUtf8(newUri);

        const block2 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'set-token-uri', [ types.utf8('www.bad.com')], wallet1.address)
        ]);

        const [badSetUriCall] = block2.receipts;
        badSetUriCall.result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);

        uriQuery = chain.callReadOnlyFn('dyv-token', 'get-token-uri', [], wallet1.address);
        uriQuery.result.expectOk().expectSome().expectUtf8(newUri);
    }
})

Clarinet.test({
    name: "Ensure the constant read only functions are returning as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const decimals = chain.callReadOnlyFn('dyv-token', 'get-decimals', [], deployer.address);
         decimals.result.expectOk().expectUint(6);

         const symbol = chain.callReadOnlyFn('dyv-token', 'get-symbol', [], deployer.address);
         symbol.result.expectOk().expectAscii('DYV');

         const name = chain.callReadOnlyFn('dyv-token', 'get-name', [], deployer.address);
         name.result.expectOk().expectAscii('dYrivaNative');
     }
 })

 Clarinet.test({
    name: "Ensure transfer memo parameter works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
            ]);

        let readOnlyCall = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        readOnlyCall.result.expectBool(true);

        const block1 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'mint', [types.uint(100), types.principal(wallet1.address)], deployer.address),
            Tx.contractCall('dyv-token', 'mint', [types.uint(200), types.principal(wallet2.address)], deployer.address),
            Tx.contractCall('dyv-token', 'mint', [types.uint(300), types.principal(wallet3.address)], deployer.address)
        ]);

        const [mintCall1, mintCall2, mintCall3] = block1.receipts;

        mintCall1.result.expectOk().expectBool(true);
        mintCall2.result.expectOk().expectBool(true);
        mintCall3.result.expectOk().expectBool(true);

        let wallet1Balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(100);

        let wallet2Balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(200);

        let wallet3Balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(300);

        const buffer = new ArrayBuffer(8);
        const view = new Int8Array(buffer);
        view[0] = 12;

        const block2 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'transfer', [types.uint(10), types.principal(wallet1.address), types.principal(wallet3.address), types.some(types.buff(buffer))], wallet1.address),
            Tx.contractCall('dyv-token', 'transfer', [types.uint(10), types.principal(wallet2.address), types.principal(wallet3.address), types.none()], wallet2.address),
        ]);

        const [goodTransferCall1, goodTransferCall2] = block2.receipts;

        goodTransferCall1.result.expectOk().expectBool(true);
        assertEquals(goodTransferCall1.events[1].contract_event.value,'0x0c00000000000000');

        goodTransferCall2.result.expectOk().expectBool(true);
        assertEquals(goodTransferCall2.events.length, 1)

        wallet1Balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(90);

        wallet2Balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(190);

        wallet3Balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(wallet3.address)], wallet3.address);
        wallet3Balance.result.expectOk().expectUint(320);
    }
})

Clarinet.test({
    name: "Ensure mint and burn functions work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        let call = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(wallet1.address)],
                deployer.address),
            ]);

        const block2 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'mint', [types.uint(100), types.principal(deployer.address)], wallet1.address),
            Tx.contractCall('dyv-token', 'mint', [types.uint(50), types.principal(wallet1.address)], wallet1.address)
        ]);

        const [mintCallToOtherWallet, goodMintCall] = block2.receipts;

        goodMintCall.result.expectOk().expectBool(true);
        mintCallToOtherWallet.result.expectOk().expectBool(true);

        let remainingTokensToMint = chain.callReadOnlyFn('dyv-token', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(20999999999850);

        let supply = chain.callReadOnlyFn('dyv-token', 'get-total-supply', [], deployer.address);
        supply.result.expectOk().expectUint(150);

        let deployerBalance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(deployer.address)], deployer.address);
        deployerBalance.result.expectOk().expectUint(100);

        let wallet1Balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(50);

        const block3 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'burn', [types.uint(10)], deployer.address)
        ]);

        block3.receipts[0].result.expectOk().expectBool(true);

        deployerBalance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(deployer.address)], deployer.address);
        deployerBalance.result.expectOk().expectUint(90);

        wallet1Balance = chain.callReadOnlyFn('dyv-token', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(50);

        supply = chain.callReadOnlyFn('dyv-token', 'get-total-supply', [], deployer.address);
        supply.result.expectOk().expectUint(140);

        remainingTokensToMint = chain.callReadOnlyFn('dyv-token', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(20999999999850);

        const block4 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'burn', [types.uint(91)], deployer.address)
        ]);

        block4.receipts[0].result.expectErr().expectUint(ERR_SENDER_NOT_ENOUGH_BALANCE);
    }
})

Clarinet.test({
    name: "Full flow of ownership transfer",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        let tokenOwner = chain.callReadOnlyFn('dyv-token', 'get-owner', [], wallet2.address);
        tokenOwner.result.expectPrincipal(deployer.address);

        const block1 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'submit-ownership-transfer',
                            [types.principal(wallet1.address)],
                            wallet1.address)
        ]);

        block1.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);

        const block2 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'submit-ownership-transfer',
                            [types.principal(wallet1.address)],
                            deployer.address)
        ]);

        block2.receipts[0].result.expectOk().expectBool(true);

        const block3 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'submit-ownership-transfer',
                            [types.principal(wallet2.address)],
                            deployer.address)
        ]);

        block3.receipts[0].result.expectErr().expectUint(ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED);

        const block4 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'cancel-ownership-transfer',
                            [],
                            wallet2.address)
        ]);

        block4.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);

        const block5 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'cancel-ownership-transfer',
                            [],
                            deployer.address)
        ]);

        block5.receipts[0].result.expectOk().expectBool(true);

        const block6 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'confirm-ownership-transfer',
                            [],
                            wallet1.address)
        ]);

        block6.receipts[0].result.expectErr().expectUint(ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM);

        const block7 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'cancel-ownership-transfer',
                            [],
                            deployer.address)
        ]);

        block7.receipts[0].result.expectErr().expectUint(ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL);

        const block8 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'submit-ownership-transfer',
                            [types.principal(wallet2.address)],
                            deployer.address)
        ]);

        block8.receipts[0].result.expectOk().expectBool(true);

        const block9 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'confirm-ownership-transfer',
                            [],
                            deployer.address)
        ]);

        block9.receipts[0].result.expectErr().expectUint(ERR_NOT_NEW_OWNER);

        const block10 = chain.mineBlock([
            Tx.contractCall('dyv-token',
                            'confirm-ownership-transfer',
                            [],
                            wallet2.address)
        ]);

        block10.receipts[0].result.expectOk().expectBool(true);

        tokenOwner = chain.callReadOnlyFn('dyv-token', 'get-owner', [], wallet2.address);
        tokenOwner.result.expectPrincipal(wallet2.address);
    }
})

Clarinet.test({
    name: "Ensure authorization mechanism works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        let block0 = chain.mineBlock(
            [
                Tx.contractCall('dyv-token',
                'add-authorized-contract',
                [types.principal(deployer.address)],
                deployer.address),
            ]);

        let mintingAuthorization = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        mintingAuthorization.result.expectBool(true);

        const block1 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'revoke-authorized-contract', [types.principal(deployer.address)], wallet1.address)
        ]);

        block1.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);

        mintingAuthorization = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        mintingAuthorization.result.expectBool(true);

        const block2 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'revoke-authorized-contract', [types.principal(deployer.address)], deployer.address)
        ]);

        block2.receipts[0].result.expectOk().expectBool(true);

        mintingAuthorization = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        mintingAuthorization.result.expectBool(false);

        const block3 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'revoke-authorized-contract', [types.principal(deployer.address)], deployer.address)
        ]);

        block3.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_IS_NOT_AUTHORIZED);

        mintingAuthorization = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        mintingAuthorization.result.expectBool(false);

        const block4 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'add-authorized-contract', [types.principal(deployer.address)], wallet1.address)
        ]);

        block4.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_OWNER_ONLY);

        mintingAuthorization = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        mintingAuthorization.result.expectBool(false);

        const block5 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'add-authorized-contract', [types.principal(deployer.address)], deployer.address)
        ]);

        block5.receipts[0].result.expectOk().expectBool(true);

        mintingAuthorization = chain.callReadOnlyFn('dyv-token', 'is-authorized', [types.principal(deployer.address)], deployer.address);
        mintingAuthorization.result.expectBool(true);

        const block6 = chain.mineBlock([
            Tx.contractCall('dyv-token', 'add-authorized-contract', [types.principal(deployer.address)], deployer.address)
        ]);

        block6.receipts[0].result.expectErr().expectUint(ERR_CONTRACT_ALREADY_AUTHORIZED);
    }
})