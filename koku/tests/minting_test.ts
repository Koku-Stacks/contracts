import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const insufficientTokensToMint = 101;
const ownershipTransferNotSubmittedByOwner = 107;
const anotherOwnershipTransferIsSubmitted = 108;
const ownershipTransferNotCancelledByOwner = 109;
const noOwnershipTransferToCancel = 110;
const noOwnershipTransferToConfirm = 111;
const ownershipTransferNotConfirmedByNewOwner = 112;

Clarinet.test({
    name: "Ensure the ownership facilities work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        let tokenOwner = chain.callReadOnlyFn('minting', 'get-owner', [], wallet2.address);
        tokenOwner.result.expectPrincipal(deployer.address);

        const block1 = chain.mineBlock([
            Tx.contractCall('minting',
                            'submit-ownership-transfer',
                            [types.principal(wallet1.address)],
                            wallet1.address)
        ]);

        const [badSubmitOwnershipTransferCall1] = block1.receipts;

        badSubmitOwnershipTransferCall1.result.expectErr().expectUint(ownershipTransferNotSubmittedByOwner);

        const block2 = chain.mineBlock([
            Tx.contractCall('minting',
                            'submit-ownership-transfer',
                            [types.principal(wallet1.address)],
                            deployer.address)
        ]);

        const [goodSubmitOwnershipTransferCall1] = block2.receipts;

        goodSubmitOwnershipTransferCall1.result.expectOk().expectBool(true);

        const block3 = chain.mineBlock([
            Tx.contractCall('minting',
                            'submit-ownership-transfer',
                            [types.principal(wallet2.address)],
                            deployer.address)
        ]);

        const [badSubmitOwnershipTransferCall3] = block3.receipts;

        badSubmitOwnershipTransferCall3.result.expectErr().expectUint(anotherOwnershipTransferIsSubmitted);

        const block4 = chain.mineBlock([
            Tx.contractCall('minting',
                            'cancel-ownership-transfer',
                            [],
                            wallet2.address)
        ]);

        const [badCancelOwnershipTransferCall1] = block4.receipts;

        badCancelOwnershipTransferCall1.result.expectErr().expectUint(ownershipTransferNotCancelledByOwner);

        const block5 = chain.mineBlock([
            Tx.contractCall('minting',
                            'cancel-ownership-transfer',
                            [],
                            deployer.address)
        ]);

        const [goodCancelOwnershipTransferCall] = block5.receipts;

        goodCancelOwnershipTransferCall.result.expectOk().expectBool(true);

        const block6 = chain.mineBlock([
            Tx.contractCall('minting',
                            'confirm-ownership-transfer',
                            [],
                            wallet1.address)
        ]);

        const [badConfirmOwnershipTransferCall1] = block6.receipts;

        badConfirmOwnershipTransferCall1.result.expectErr().expectUint(noOwnershipTransferToConfirm);

        const block7 = chain.mineBlock([
            Tx.contractCall('minting',
                            'cancel-ownership-transfer',
                            [],
                            deployer.address)
        ]);

        const [badCancelOwnershipTransferCall2] = block7.receipts;

        badCancelOwnershipTransferCall2.result.expectErr().expectUint(noOwnershipTransferToCancel);

        const block8 = chain.mineBlock([
            Tx.contractCall('minting',
                            'submit-ownership-transfer',
                            [types.principal(wallet2.address)],
                            deployer.address)
        ]);

        const [goodSubmitOwnershipTransferCall2] = block8.receipts;

        goodSubmitOwnershipTransferCall2.result.expectOk().expectBool(true);

        const block9 = chain.mineBlock([
            Tx.contractCall('minting',
                            'confirm-ownership-transfer',
                            [],
                            deployer.address)
        ]);

        const [badConfirmOwnershipTransferCall2] = block9.receipts;

        badConfirmOwnershipTransferCall2.result.expectErr().expectUint(ownershipTransferNotConfirmedByNewOwner);

        const block10 = chain.mineBlock([
            Tx.contractCall('minting',
                            'confirm-ownership-transfer',
                            [],
                            wallet2.address)
        ]);

        const [goodConfirmOwnershipTransferCall] = block10.receipts;

        goodConfirmOwnershipTransferCall.result.expectOk().expectBool(true);

        tokenOwner = chain.callReadOnlyFn('minting', 'get-owner', [], wallet2.address);
        tokenOwner.result.expectPrincipal(wallet2.address);
    }
});

Clarinet.test({
    name: "Ensure the token max supply constraint is respected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

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
            Tx.contractCall('token-v2', 'burn', [types.uint(2 * amountToMint)], deployer.address)
        ])

        const [goodBurnCall] = block3.receipts;

        goodBurnCall.result.expectOk().expectBool(true);

        remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint - 2 * amountToMint);

        let block4 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(maxTokensToMint), types.principal(deployer.address)], deployer.address)
        ]);

        const [badMintCall1] = block4.receipts;

        badMintCall1.result.expectErr().expectUint(insufficientTokensToMint);

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

        badMintCall2.result.expectErr().expectUint(insufficientTokensToMint);

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

        const maxTokensToMint = 21_000_000_000_000;

        let remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint);

        let block1 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(maxTokensToMint - 1), types.principal(wallet1.address)], deployer.address),
            Tx.contractCall('minting', 'mint', [types.uint(maxTokensToMint - 1), types.principal(wallet2.address)], deployer.address)
        ]);

        const [goodMintCall, badMintCall] = block1.receipts;

        goodMintCall.result.expectOk().expectBool(true);
        badMintCall.result.expectErr().expectUint(insufficientTokensToMint);
    }
});