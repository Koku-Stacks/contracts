import { readFileSync, writeFileSync } from "fs";

import { principalCV } from " @stacks/transactions/dist/clarity/types/principalCV";
import { chain, deploy_contract } from "./deploy_utils";

import * as config from "../config";
import { uintCV } from "@stacks/transactions";
import { Account } from "../integration/framework/stacks.chain";

function read_deployment_order(filename?: string): string[] {
  filename = filename ?? config.deployment_order_filename;

  const content = readFileSync(filename);

  const deployment_order = content.toString().split("\n");

  return deployment_order;
}

async function deploy_all_contracts() {
  let contracts_id_registry: Map<string, string> = new Map();

  for (const contract_name of read_deployment_order()) {
    const contract_id = await deploy_contract(contract_name);

    console.log(`${contract_id} successfully deployed`);

    contracts_id_registry[contract_name] = contract_id;
  }

  return contracts_id_registry;
}

async function post_deployment_transactions() {
  await chain.loadAccounts();

  const deployer = chain.accounts.get("deployer")!;

  await chain.callContract(
    deployer.address,
    "token",
    "add-authorized-contract",
    [principalCV(`${deployer.address}.minting`)],
    deployer.secretKey,
    {
      waitForTransactionConfirmation: true,
    }
  );

  await chain.callContract(
    deployer.address,
    "token",
    "add-authorized-contract",
    [principalCV(deployer.address)],
    deployer.secretKey,
    {
      waitForTransactionConfirmation: true,
    }
  );

  async function mint(wallet: string) {
    await chain.callContract(
      deployer.address,
      "usda",
      "mint",
      [uintCV(1000000), principalCV(wallet)],
      deployer.secretKey,
      {
        waitForTransactionConfirmation: true,
      }
    );
  }

  const accountNames = Array.from(chain.accounts.keys());
  const accountDetails: Array<Account> = accountNames.map((name) => {
    return chain.accounts.get(name);
  });

  ///Check if mint contract is authorized
  const authorizeMint = await chain.callReadOnlyFn(
    deployer.address,
    "usda",
    "is-authorized",
    [principalCV(deployer.address)],
    deployer.address
  );

  if (authorizeMint.value === false) {
    const authorizeContract = await chain.callContract(
      deployer.address,
      "usda",
      "add-authorized-contract",
      [principalCV(deployer.address)],
      deployer.secretKey
    );

    const authorizeContractResponse = await chain.getTransactionResponse(
      authorizeContract.txid
    );
    if (authorizeContractResponse.success === true) {
      await Promise.all(accountDetails.map((account) => mint(account.address)));
    }
  } else if (authorizeMint.value === true) {
    await Promise.all(accountDetails.map((account) => mint(account.address)));
  }
}

function register_contracts_id(
  contracts_id_registry: Map<string, string>,
  filename?: string
) {
  filename = filename ?? config.contract_id_info_filename;

  writeFileSync(filename, JSON.stringify(contracts_id_registry, null, "\t"));
}

async function service() {
  const contracts_id_registry = await deploy_all_contracts();
  await post_deployment_transactions();
  register_contracts_id(contracts_id_registry);
}

service();
