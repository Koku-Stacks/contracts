import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

Clarinet.test({
    name: "Ensure the uri registry works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const unauthorizedUriChange = 100;

        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        let uri = chain.callReadOnlyFn('token', 'get-token-uri', [], wallet1.address);
        uri.result.expectOk().expectSome().expectUtf8('www.token.com');

        const newUri = 'www.token.org';

        const block1 = chain.mineBlock([
            Tx.contractCall('uri-registry', 'set-uri', [types.principal(`${deployer.address}.token`), types.utf8(newUri)], deployer.address)
        ]);

        const [goodSetUriCall] = block1.receipts;
        goodSetUriCall.result.expectOk().expectBool(true);

        let uriQuery = chain.callReadOnlyFn('token', 'get-token-uri', [], wallet1.address);
        uriQuery.result.expectOk().expectSome().expectUtf8(newUri);

        const block2 = chain.mineBlock([
            Tx.contractCall('uri-registry', 'set-uri', [types.principal(`${deployer.address}.token`), types.utf8('www.bad.com')], wallet1.address)
        ]);

        const [badSetUriCall] = block2.receipts;
        badSetUriCall.result.expectErr().expectUint(unauthorizedUriChange);

        uriQuery = chain.callReadOnlyFn('token', 'get-token-uri', [], wallet1.address);
        uriQuery.result.expectOk().expectSome().expectUtf8(newUri);
    }
});