import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";

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

