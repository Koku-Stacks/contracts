import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

Clarinet.test({
    name: "Ensure the ownership registry contract works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const ownershipAlreadyRegistered = 100;
        const ownershipNotRegistered = 101;
        const ownershipTransferNotSubmittedByOwner = 102;
        const anotherOwnershipTransferIsSubmitted = 103;
        const ownershipTransferNotCancelledByOwner = 104;
        const noOwnershipTransferToCancel = 105;
        const noOwnershipTransferToConfirm = 106;
        const ownershipTransferNotConfirmedByNewOwner = 107;

        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        let tokenOwner = chain.callReadOnlyFn('ownership-registry', 'get-owner', [types.principal(`${deployer.address}.token`)], wallet2.address);
        let tokenOwnerTuple = tokenOwner.result.expectTuple() as any;
        tokenOwnerTuple['owner'].expectPrincipal(deployer.address);

        const block1 = chain.mineBlock([
            Tx.contractCall('ownership-registry', 'register-ownership', [types.principal(`${deployer.address}.token`)], wallet1.address)
        ]);

        const [badRegisterOwnershipCall] = block1.receipts;

        badRegisterOwnershipCall.result.expectErr().expectUint(ownershipAlreadyRegistered);

        const block2 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'submit-ownership-transfer',
                            [types.principal(`${deployer.address}.hello-world`), types.principal(wallet1.address)],
                            deployer.address),
            Tx.contractCall('ownership-registry',
                            'submit-ownership-transfer',
                            [types.principal(`${deployer.address}.token`), types.principal(wallet1.address)],
                            wallet1.address)
        ]);

        const [badSubmitOwnershipTransferCall1, badSubmitOwnershipTransferCall2] = block2.receipts;

        badSubmitOwnershipTransferCall1.result.expectErr().expectUint(ownershipNotRegistered);
        badSubmitOwnershipTransferCall2.result.expectErr().expectUint(ownershipTransferNotSubmittedByOwner);

        const block3 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'submit-ownership-transfer',
                            [types.principal(`${deployer.address}.token`), types.principal(wallet1.address)],
                            deployer.address)
        ]);

        const [goodSubmitOwnershipTransferCall1] = block3.receipts;

        goodSubmitOwnershipTransferCall1.result.expectOk().expectBool(true);

        const block4 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'submit-ownership-transfer',
                            [types.principal(`${deployer.address}.token`), types.principal(wallet2.address)],
                            deployer.address)
        ]);

        const [badSubmitOwnershipTransferCall3] = block4.receipts;

        badSubmitOwnershipTransferCall3.result.expectErr().expectUint(anotherOwnershipTransferIsSubmitted);

        const block5 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'cancel-ownership-transfer',
                            [types.principal(`${deployer.address}.token`)],
                            wallet2.address)
        ]);

        const [badCancelOwnershipTransferCall1] = block5.receipts;

        badCancelOwnershipTransferCall1.result.expectErr().expectUint(ownershipTransferNotCancelledByOwner);

        const block6 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'cancel-ownership-transfer',
                            [types.principal(`${deployer.address}.token`)],
                            deployer.address)
        ]);

        const [goodCancelOwnershipTransferCall] = block6.receipts;

        goodCancelOwnershipTransferCall.result.expectOk().expectBool(true);

        const block7 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'confirm-ownership-transfer',
                            [types.principal(`${deployer.address}.token`)],
                            wallet1.address)
        ]);

        const [badConfirmOwnershipTransferCall1] = block7.receipts;

        badConfirmOwnershipTransferCall1.result.expectErr().expectUint(noOwnershipTransferToConfirm);

        const block8 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'cancel-ownership-transfer',
                            [types.principal(`${deployer.address}.token`)],
                            deployer.address)
        ]);

        const [badCancelOwnershipTransferCall2] = block8.receipts;

        badCancelOwnershipTransferCall2.result.expectErr().expectUint(noOwnershipTransferToCancel);

        const block9 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'submit-ownership-transfer',
                            [types.principal(`${deployer.address}.token`), types.principal(wallet2.address)],
                            deployer.address)
        ]);

        const [goodSubmitOwnershipTransferCall2] = block9.receipts;

        goodSubmitOwnershipTransferCall2.result.expectOk().expectBool(true);

        const block10 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'confirm-ownership-transfer',
                            [types.principal(`${deployer.address}.token`)],
                            deployer.address)
        ]);

        const [badConfirmOwnershipTransferCall2] = block10.receipts;

        badConfirmOwnershipTransferCall2.result.expectErr().expectUint(ownershipTransferNotConfirmedByNewOwner);

        const block11 = chain.mineBlock([
            Tx.contractCall('ownership-registry',
                            'confirm-ownership-transfer',
                            [types.principal(`${deployer.address}.token`)],
                            wallet2.address)
        ]);

        const [goodConfirmOwnershipTransferCall] = block11.receipts;

        goodConfirmOwnershipTransferCall.result.expectOk().expectBool(true);

        tokenOwner = chain.callReadOnlyFn('ownership-registry', 'get-owner', [types.principal(`${deployer.address}.token`)], wallet2.address);
        tokenOwnerTuple = tokenOwner.result.expectTuple() as any;
        tokenOwnerTuple['owner'].expectPrincipal(wallet2.address);
    }
});