import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
const ERR_CONTRACT_ALREADY_AUTHORIZED = 100;
const ERR_CONTRACT_IS_NOT_AUTHORIZED = 101;
const ERR_NOT_AUTHORIZED = 102;
const ERR_TOKEN_OWNER_ONLY = 103;
const ERR_CONTRACT_OWNER_ONLY = 104;
const ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED = 105;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL = 106;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM = 107;
const ERR_NOT_NEW_OWNER = 108;
const ERR_INSUFFICIENT_TOKENS_TO_MINT = 109;
const ERR_CONTRACT_LOCKED = 110;
const ERR_SENDER_NOT_ENOUGH_BALANCE = 1;
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
                    types.uint(21000000000001),
                    types.principal(userA.address)
                ],
                deployer.address),
            ]);
        
        call.receipts[0].result.expectErr().expectUint(ERR_INSUFFICIENT_TOKENS_TO_MINT);
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
        
        call.receipts[0].result.expectErr().expectUint(ERR_SENDER_NOT_ENOUGH_BALANCE);
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
        
        call.receipts[0].result.expectErr().expectUint(ERR_SENDER_NOT_ENOUGH_BALANCE);
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
        
        call.receipts[1].result.expectErr().expectUint(ERR_TOKEN_OWNER_ONLY);
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
            ]);
        
        call.receipts[0].result.expectOk().expectBool(true);
        call.receipts[1].result.expectErr().expectUint(ERR_SENDER_NOT_ENOUGH_BALANCE);
        call.receipts[2].result.expectErr().expectUint(ERR_SENDER_RECIPIENT_SAME);
        call.receipts[3].result.expectErr().expectUint(ERR_AMOUNT_NOT_POSITIVE);
    }
})

