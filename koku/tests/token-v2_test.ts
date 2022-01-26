import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";

const onlyOwnerCanAddAuthorizedContracts = 100;
const onlyOwnerCanRevokeAuthorizedContracts = 101;
const contractAlreadyAuthorized = 102;
const contractIsNotAuthorized = 103;
const onlyAuthorizedContractsCanSetUri = 104;
const onlyAuthorizedContractsCanMintToken = 105;
const unauthorizedTransfer = 106;
const ownershipTransferNotSubmittedByOwner = 107;
const anotherOwnershipTransferIsSubmitted = 108;
const ownershipTransferNotCancelledByOwner = 109;
const noOwnershipTransferToCancel = 110;
const noOwnershipTransferToConfirm = 111;
const ownershipTransferNotConfirmedByNewOwner = 112;


Clarinet.test({
    name: "Ensure mint and burn functions work as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const unauthorizedMinter = 100;

        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        const block1 = chain.mineBlock([
            Tx.contractCall('token-v2', 'mint', [types.uint(100), types.principal(deployer.address)], deployer.address)
        ]);

        const [badMintCall1] = block1.receipts;

        badMintCall1.result.expectErr().expectUint(onlyAuthorizedContractsCanMintToken);

        const block2 = chain.mineBlock([
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(deployer.address)], deployer.address),
            Tx.contractCall('minting', 'mint', [types.uint(100), types.principal(wallet1.address)], wallet1.address),
            Tx.contractCall('minting', 'mint', [types.uint(50), types.principal(wallet1.address)], deployer.address)
        ]);

        const [goodMintCall, badMintCall2, mintCallToOtherWallet] = block2.receipts;

        goodMintCall.result.expectOk().expectBool(true);
        badMintCall2.result.expectErr().expectUint(unauthorizedMinter);
        mintCallToOtherWallet.result.expectOk().expectBool(true);

        const supply = chain.callReadOnlyFn('token-v2', 'get-total-supply', [], deployer.address);
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

