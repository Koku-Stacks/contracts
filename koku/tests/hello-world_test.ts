import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';

Clarinet.test({
    name: "Ensure the read only functions are returning as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        const max_value = 1000;
        const sample_value = Math.floor(Math.random() * (max_value + 1));
        const echo = chain.callReadOnlyFn('hello-world', 'echo-number', [types.int(sample_value)], deployer.address);
        echo.result.expectOk().expectInt(sample_value);
    }
});

Clarinet.test({
    name: "Ensure the public function say-hi works as expected",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet_1 = accounts.get('wallet_1')!;

        const block = chain.mineBlock([
            Tx.contractCall('hello-world', 'say-hi', [], wallet_1.address)
        ]);

        const [call] = block.receipts;

        call.result.expectOk().expectUtf8('hello world');
    }
});