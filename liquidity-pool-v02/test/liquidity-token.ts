import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity";
import { assert } from "chai";

describe("liquidity token contract test suite", () => {
    let liquidityTokenClient: Client;
    let sip010v0aClient: Client;
    let provider: Provider;

    before(async () => {
        provider = await ProviderRegistry.createProvider();
        sip010v0aClient = new Client("SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB.sip-010-v0a", "sip-010-v0a", provider);
        liquidityTokenClient = new Client("SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB.liquidity-token", "liquidity-token", provider);
    });

    it("should have a valid syntax", async () => {
        await sip010v0aClient.checkContract();
        await sip010v0aClient.deployContract();

        await liquidityTokenClient.checkContract();
    });

    describe("deploying an instance of the contract", () => {
        before(async () => {
            await liquidityTokenClient.deployContract();
        });

        it("should return the number of decimals", async () => {
            const query = liquidityTokenClient.createQuery({ method: { name: "get-decimals", args: [] } });
            const receipt = await liquidityTokenClient.submitQuery(query);
            const result = Result.unwrapUInt(receipt);
            assert.equal(result, 3);
        });

        it("should return the contract name", async () => {
            const query = liquidityTokenClient.createQuery({ method: { name: "get-name", args: [] } });
            const receipt = await liquidityTokenClient.submitQuery(query);
            const result = Result.unwrapString(receipt, "ascii");
            assert.equal(result, "Koku Liquidity Token");
        });
    });

    after(async () => {
        await provider.close();
    });
});
