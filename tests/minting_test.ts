import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const ERR_NOT_AUTHORIZED = 102;
const ERR_CONTRACT_OWNER_ONLY = 103;
const ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED = 104;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL = 105;
const ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM = 106;
const ERR_NOT_NEW_OWNER = 107;
const ERR_INSUFFICIENT_TOKENS_TO_MINT = 108;

Clarinet.test({
    name: "Ensure that submit ownership can only be called by owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const userA = accounts.get('wallet_1')!;
        const userB = accounts.get('wallet_2')!;
        
        let call = chain.mineBlock(
            [
                Tx.contractCall('minting',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                userB.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(1000);
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
                Tx.contractCall('minting',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall('minting',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address)
            ]);
        call.receipts[1].result.expectErr().expectUint(2001);
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
                Tx.contractCall('minting',
                'cancel-ownership-transfer',
                [],
                userB.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(1000);
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
                Tx.contractCall('minting',
                'cancel-ownership-transfer',
                [],
                deployer.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(2002);
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
                Tx.contractCall('minting',
                'confirm-ownership-transfer',
                [],
                userA.address)
            ]);
        call.receipts[0].result.expectErr().expectUint(2003);
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
                Tx.contractCall('minting',
                'submit-ownership-transfer',
                [types.principal(userB.address)],
                deployer.address),
                Tx.contractCall('minting',
                'confirm-ownership-transfer',
                [],
                userA.address)
            ]);
        call.receipts[1].result.expectErr().expectUint(2000);
    }
})

Clarinet.test({
    name: "Ensure the token max supply constraint is respected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        const authorizationBlock = chain.mineBlock([
            Tx.contractCall('token',
                            'add-authorized-contract',
                            [types.principal(`${deployer.address}.minting`)],
                            deployer.address)
        ]);

        const maxTokensToMint = 21_000_000_000_000;

        let remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint);

        const amountToMint = 21_000_000;

        let block1 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(amountToMint), types.principal(deployer.address)], deployer.address)
        ]);

        const [goodMintCall1] = block1.receipts;

        goodMintCall1.result.expectOk().expectBool(true);

        remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint - 1 * amountToMint);

        let block2 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(amountToMint), types.principal(deployer.address)], deployer.address)
        ]);

        const [goodMintCall2] = block2.receipts;

        // we can see here that minting an amount of 21_000_000 actually means 21.000000 tokens,
        // as the mint amount argument refers to the indivisible part of our token, that is, the amount of 0.000001 tokens we intend to mint.
        goodMintCall2.result.expectOk().expectBool(true);

        remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint - 2 * amountToMint);

        let block3 = chain.mineBlock([
            Tx.contractCall('token', 'burn', [types.uint(2 * amountToMint)], deployer.address)
        ])

        const [goodBurnCall] = block3.receipts;

        goodBurnCall.result.expectOk().expectBool(true);

        remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint - 2 * amountToMint);

        let block4 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(maxTokensToMint), types.principal(deployer.address)], deployer.address)
        ]);

        const [badMintCall1] = block4.receipts;

        badMintCall1.result.expectErr().expectUint(ERR_INSUFFICIENT_TOKENS_TO_MINT);

        remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint - 2 * amountToMint);

        let block5 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(maxTokensToMint - 2 * amountToMint), types.principal(deployer.address)], deployer.address)
        ]);

        const [goodMintCall3] = block5.receipts;

        goodMintCall3.result.expectOk().expectBool(true);

        remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(0);

        let block6 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(1), types.principal(deployer.address)], deployer.address)
        ]);

        const [badMintCall2] = block6.receipts;

        badMintCall2.result.expectErr().expectUint(ERR_INSUFFICIENT_TOKENS_TO_MINT);

        remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(0);
    }
});

Clarinet.test({
    name: "Ensure that token max supply is respected when there are multiple mint calls in the same block",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        const authorizationBlock = chain.mineBlock([
            Tx.contractCall('token',
                            'add-authorized-contract',
                            [types.principal(`${deployer.address}.minting`)],
                            deployer.address)
        ]);

        const maxTokensToMint = 21_000_000_000_000;

        let remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint);

        let toMintMoreThanHalf = Math.floor((Math.random() + 0.5) * maxTokensToMint);
        toMintMoreThanHalf = Math.min(toMintMoreThanHalf + 1, maxTokensToMint - 1);

        let block1 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(toMintMoreThanHalf), types.principal(wallet1.address)], deployer.address),
            Tx.contractCall('minting', 'mint', [types.uint(toMintMoreThanHalf), types.principal(wallet2.address)], deployer.address)
        ]);

        const [goodMintCall, badMintCall] = block1.receipts;

        goodMintCall.result.expectOk().expectBool(true);
        badMintCall.result.expectErr().expectUint(ERR_INSUFFICIENT_TOKENS_TO_MINT);

        remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint - toMintMoreThanHalf);
    }
});