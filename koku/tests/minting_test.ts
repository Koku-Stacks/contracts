import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

const insufficientTokensToMint = 109;
const minterTransferNotSubmittedByMinter = 107;
const anotherMinterTransferIsSubmitted = 108;
const minterTransferNotCancelledByMinter = 109;
const noMinterTransferToCancel = 110;
const noMinterTransferToConfirm = 111;
const minterTransferNotConfirmedByNewMinter = 112;

Clarinet.test({
    name: "Ensure the minter management facilities work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        let minter = chain.callReadOnlyFn('minting', 'get-minter', [], wallet2.address);
        minter.result.expectPrincipal(deployer.address);

        const block1 = chain.mineBlock([
            Tx.contractCall('minting',
                            'submit-minter-transfer',
                            [types.principal(wallet1.address)],
                            wallet1.address)
        ]);

        const [badSubmitMinterTransferCall1] = block1.receipts;

        badSubmitMinterTransferCall1.result.expectErr().expectUint(minterTransferNotSubmittedByMinter);

        const block2 = chain.mineBlock([
            Tx.contractCall('minting',
                            'submit-minter-transfer',
                            [types.principal(wallet1.address)],
                            deployer.address)
        ]);

        const [goodSubmitMinterTransferCall1] = block2.receipts;

        goodSubmitMinterTransferCall1.result.expectOk().expectBool(true);

        const block3 = chain.mineBlock([
            Tx.contractCall('minting',
                            'submit-minter-transfer',
                            [types.principal(wallet2.address)],
                            deployer.address)
        ]);

        const [badSubmitMinterTransferCall3] = block3.receipts;

        badSubmitMinterTransferCall3.result.expectErr().expectUint(anotherMinterTransferIsSubmitted);

        const block4 = chain.mineBlock([
            Tx.contractCall('minting',
                            'cancel-minter-transfer',
                            [],
                            wallet2.address)
        ]);

        const [badCancelMinterTransferCall1] = block4.receipts;

        badCancelMinterTransferCall1.result.expectErr().expectUint(minterTransferNotCancelledByMinter);

        const block5 = chain.mineBlock([
            Tx.contractCall('minting',
                            'cancel-minter-transfer',
                            [],
                            deployer.address)
        ]);

        const [goodCancelMinterTransferCall] = block5.receipts;

        goodCancelMinterTransferCall.result.expectOk().expectBool(true);

        const block6 = chain.mineBlock([
            Tx.contractCall('minting',
                            'confirm-minter-transfer',
                            [],
                            wallet1.address)
        ]);

        const [badConfirmMinterTransferCall1] = block6.receipts;

        badConfirmMinterTransferCall1.result.expectErr().expectUint(noMinterTransferToConfirm);

        const block7 = chain.mineBlock([
            Tx.contractCall('minting',
                            'cancel-minter-transfer',
                            [],
                            deployer.address)
        ]);

        const [badCancelMinterTransferCall2] = block7.receipts;

        badCancelMinterTransferCall2.result.expectErr().expectUint(noMinterTransferToCancel);

        const block8 = chain.mineBlock([
            Tx.contractCall('minting',
                            'submit-minter-transfer',
                            [types.principal(wallet2.address)],
                            deployer.address)
        ]);

        const [goodSubmitMinterTransferCall2] = block8.receipts;

        goodSubmitMinterTransferCall2.result.expectOk().expectBool(true);

        const block9 = chain.mineBlock([
            Tx.contractCall('minting',
                            'confirm-minter-transfer',
                            [],
                            deployer.address)
        ]);

        const [badConfirmMinterTransferCall2] = block9.receipts;

        badConfirmMinterTransferCall2.result.expectErr().expectUint(minterTransferNotConfirmedByNewMinter);

        const block10 = chain.mineBlock([
            Tx.contractCall('minting',
                            'confirm-minter-transfer',
                            [],
                            wallet2.address)
        ]);

        const [goodConfirmMinterTransferCall] = block10.receipts;

        goodConfirmMinterTransferCall.result.expectOk().expectBool(true);

        minter = chain.callReadOnlyFn('minting', 'get-minter', [], wallet2.address);
        minter.result.expectPrincipal(wallet2.address);
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

        let toMintMoreThanHalf = Math.floor((Math.random() + 0.5) * maxTokensToMint);
        toMintMoreThanHalf = Math.min(toMintMoreThanHalf + 1, maxTokensToMint - 1);

        let block1 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(toMintMoreThanHalf), types.principal(wallet1.address)], deployer.address),
            Tx.contractCall('minting', 'mint', [types.uint(toMintMoreThanHalf), types.principal(wallet2.address)], deployer.address)
        ]);

        const [goodMintCall, badMintCall] = block1.receipts;

        goodMintCall.result.expectOk().expectBool(true);
        badMintCall.result.expectErr().expectUint(insufficientTokensToMint);

        remainingTokensToMint = chain.callReadOnlyFn('minting', 'get-remaining-tokens-to-mint', [], deployer.address);
        remainingTokensToMint.result.expectUint(maxTokensToMint - toMintMoreThanHalf);
    }
});