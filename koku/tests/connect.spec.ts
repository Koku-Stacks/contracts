import { HIRO_TESTNET_DEFAULT, StacksTestnet } from "@stacks/network";
import {
  AnchorMode,
  broadcastTransaction,
  makeContractCall,
  makeSTXTokenTransfer,
  callReadOnlyFunction,
  estimateContractFunctionCall,
  broadcastRawTransaction,
  ClarityType,
  stringUtf8CV,
  makeContractDeploy,
} from "@stacks/transactions";
import { expect } from "chai";

type Account = {
  address: string;
  btcAddress: string;
  secretKey: string;
};

const accounts = new Map<string, Account>([
  [
    "deployer",
    {
      address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      btcAddress: "mqVnk6NPRdhntvfm4hh9vvjiRkFDUuSYsH",
      secretKey:
        "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601",
    },
  ],
  [
    "wallet_1",
    {
      address: "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
      btcAddress: "mr1iPkD9N3RJZZxXRk7xF9d36gffa6exNC",
      secretKey:
        "7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801",
    },
  ],
  [
    "wallet_2",
    {
      address: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      btcAddress: "muYdXKmX9bByAueDe6KFfHd5Ff1gdN9ErG",
      secretKey:
        "530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101",
    },
  ],
  [
    "wallet_3",
    {
      address: "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
      btcAddress: "mvZtbibDAAA3WLpY7zXXFqRa3T4XSknBX7",
      secretKey:
        "d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901",
    },
  ],
  [
    "wallet_4",
    {
      address: "ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND",
      btcAddress: "mg1C76bNTutiCDV3t9nWhZs3Dc8LzUufj8",
      secretKey:
        "f9d7206a47f14d2870c163ebab4bf3e70d18f5d14ce1031f3902fbbc894fe4c701",
    },
  ],
  [
    "wallet_5",
    {
      address: "ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB",
      btcAddress: "mweN5WVqadScHdA81aATSdcVr4B6dNokqx",
      secretKey:
        "3eccc5dac8056590432db6a35d52b9896876a3d5cbdea53b72400bc9c2099fe801",
    },
  ],
  [
    "wallet_6",
    {
      address: "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0",
      btcAddress: "mzxXgV6e4BZSsz8zVHm3TmqbECt7mbuErt",
      secretKey:
        "7036b29cb5e235e5fd9b09ae3e8eec4404e44906814d5d01cbca968a60ed4bfb01",
    },
  ],
  [
    "wallet_7",
    {
      address: "ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ",
      btcAddress: "n37mwmru2oaVosgfuvzBwgV2ysCQRrLko7",
      secretKey:
        "b463f0df6c05d2f156393eee73f8016c5372caa0e9e29a901bb7171d90dc4f1401",
    },
  ],
  [
    "wallet_8",
    {
      address: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
      btcAddress: "n2v875jbJ4RjBnTjgbfikDfnwsDV5iUByw",
      secretKey:
        "6a1a754ba863d7bab14adbbc3f8ebb090af9e871ace621d3e5ab634e1422885e01",
    },
  ],
  [
    "wallet_9",
    {
      address: "STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6",
      btcAddress: "mjSrB3wS4xab3kYqFktwBzfTdPg367ZJ2d",
      secretKey:
        "de433bdfa14ec43aa1098d5be594c8ffb20a31485ff9de2923b2689471c401b801",
    },
  ],
]);

const contractAddress = "";

class StacksChain {
  private network: StacksTestnet;

  constructor(url: string) {
    this.network = new StacksTestnet({ url });
  }

  async transferSTX(
    amount: number,
    recipient: string,
    senderKey: string,
    options?: {
      memo?: string;
      fee?: number;
    }
  ) {
    const { memo = "", fee = 200 } = options ?? {};

    const transaction = await makeSTXTokenTransfer({
      network: this.network,
      recipient,
      amount,
      senderKey,
      memo,
      nonce: 0, // set a nonce manually if you don't want builder to fetch from a Stacks node
      fee, // set a tx fee if you don't want the builder to estimate
      anchorMode: AnchorMode.Any,
    });

    return transaction;
  }

  async callReadOnlyFn(
    contractAddress: string,
    contractName: string,
    method: string,
    args: Array<any>,
    senderAddress: string
  ) {
    let readResult = await callReadOnlyFunction({
      network: this.network,
      contractAddress,
      contractName,
      functionName: method,
      functionArgs: args,
      senderAddress,
    });

    return readResult;
  }

  async callContract(
    contractAddress: string,
    contractName: string,
    method: string,
    args: Array<any>,
    senderSecretKey: string
  ) {
    const writeResult = await makeContractCall({
      network: this.network,
      contractAddress,
      contractName,
      functionName: method,
      functionArgs: args,
      senderKey: senderSecretKey,
      anchorMode: AnchorMode.Any,
    });

    return writeResult;
  }

  async deployContract(
    contractName: string,
    code: string,
    senderSecretKey: string,
    options?: {
      fee?: number;
    }
  ) {
    const { fee = 200 } = options ?? {};

    const result = await makeContractDeploy({
      network: this.network,
      contractName,
      codeBody: code,
      senderKey: senderSecretKey,
      anchorMode: AnchorMode.Any,
      fee,
    });

    return result;
  }

  async waitNextBlockToBeMined(): Promise<any> {
    // TODO: implementation
    // it should return the block
  }
}

const chain = new StacksChain("http://3.121.232.80:3999");

describe("test", () => {
  it("should have a valid syntax", async () => {
    const network = new StacksTestnet({ url: "http://3.121.232.80:3999" });

    const transaction = await chain.transferSTX(
      12345,
      "SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159",
      "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601"
    );

    // to see the raw serialized tx
    const serializedTx = transaction.serialize().toString("hex");

    // broadcasting transaction to the specified network
    const broadcastResponse = await broadcastTransaction(transaction, network);
    const txId = broadcastResponse.txid;
  });

  it("Ensure the token uri facilities work as expected", async () => {
    const unauthorizedUriUpdate = 104;

    const deployer = accounts.get("deployer")!;
    const wallet1 = accounts.get("wallet_1")!;

    let readResult = await chain.callReadOnlyFn(
      contractAddress,
      "token",
      "get-token-uri",
      [],
      wallet1.address
    );

    expect(readResult).to.be.ok;

    //     console.log(result)
    //     switch(result.type){
    //       case ClarityType.ResponseOk:
    //         {
    // result.value
    //         }
    //         break
    //     }

    const newUri = "www.token.com";

    const writeResult = await chain.callContract(
      contractAddress,
      "token",
      "set-token-uri",
      [stringUtf8CV(newUri)],
      deployer.secretKey
    );

    expect(writeResult).to.be.ok;

    const block1 = await chain.waitNextBlockToBeMined();

    readResult = await chain.callReadOnlyFn(
      contractAddress,
      "token",
      "get-token-uri",
      [],
      wallet1.address
    );
    // const [goodSetTokenUriCall] = block1.receipts;
    // goodSetTokenUriCall.result.expectOk().expectBool(true);

    // let uriQuery = chain.callReadOnlyFn(
    //   "token",
    //   "get-token-uri",
    //   [],
    //   wallet1.address
    // );
    // uriQuery.result.expectOk().expectSome().expectUtf8(newUri);

    // const block2 = chain.mineBlock([
    //   Tx.contractCall(
    //     "token",
    //     "set-token-uri",
    //     [types.utf8("www.bad.com")],
    //     wallet1.address
    //   ),
    // ]);

    // const [badSetTokenUriCall] = block2.receipts;
    // badSetTokenUriCall.result.expectErr().expectUint(unauthorizedUriUpdate);

    // uriQuery = chain.callReadOnlyFn(
    //   "token",
    //   "get-token-uri",
    //   [],
    //   wallet1.address
    // );
    // uriQuery.result.expectOk().expectSome().expectUtf8(newUri);
  });
});
