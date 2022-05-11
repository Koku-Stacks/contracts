import { readFileSync, writeFileSync } from "fs";
import { principalCV } from "@stacks/transactions/dist/clarity/types/principalCV";
import { chain, deploy_contract } from "./deploy_utils";
import * as config from "../config";
import { uintCV } from "@stacks/transactions";
import { Account } from "dy-finance.lib";

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
  const deployer = chain.accounts.get("deployer");

  const usdaCode = readFileSync("contracts/token.clar").toString();

  const usda_contract_id = await chain.deployContract(
    "usda",
    usdaCode,
    deployer.secretKey
  );
  contracts_id_registry["usda"] = usda_contract_id;
  console.log("usda successfully deployed");

  return contracts_id_registry;
}

async function post_deployment_transactions() {
  await chain.loadAccounts();
  const deployer = chain.accounts.get("deployer")!;
  const tokenContract = "token";
  const usdaContract = "usda";
  async function checkContractAuthorization(
    principal: string,
    contractName: string
  ) {
    const authorized = await chain.callReadOnlyFn(
      deployer.address,
      contractName,
      "is-authorized",
      [principalCV(principal)],
      deployer.address
    );
    return authorized.value;
  }

  const tokenMintingAuthorized = await checkContractAuthorization(
    `${deployer.address}.minting`,
    tokenContract
  );

  if (tokenMintingAuthorized.value === false) {
    await chain.callContract(
      deployer.address,
      tokenContract,
      "add-authorized-contract",
      [principalCV(`${deployer.address}.minting`)],
      deployer.secretKey,
      {
        waitForTransactionConfirmation: true,
      }
    );
  }

  const tokenAddressAuthorized = await checkContractAuthorization(
    deployer.address,
    tokenContract
  );
  if (tokenAddressAuthorized.value === false) {
    await chain.callContract(
      deployer.address,
      tokenContract,
      "add-authorized-contract",
      [principalCV(`${deployer.address}`)],
      deployer.secretKey,
      {
        waitForTransactionConfirmation: true,
      }
    );
  }

  async function mint(wallet: string) {
    await chain.callContract(
      deployer.address,
      usdaContract,
      "mint",
      [uintCV(1000000), principalCV(wallet)],
      deployer.secretKey,
      {
        waitForTransactionConfirmation: true,
      }
    );
  }

  const usdaAddressAuthorized = await checkContractAuthorization(
    deployer.address,
    usdaContract
  );

  if (usdaAddressAuthorized.value === false) {
    await chain.callContract(
      deployer.address,
      usdaContract,
      "add-authorized-contract",
      [principalCV(deployer.address)],
      deployer.secretKey,
      {
        waitForTransactionConfirmation: true,
      }
    );
  }

  const checkUSDAMintContract = await checkContractAuthorization(
    `${deployer.address}.minting`,
    usdaContract
  );

  if (checkUSDAMintContract.value === false) {
    await chain.callContract(
      deployer.address,
      usdaContract,
      "add-authorized-contract",
      [principalCV(`${deployer.address}.minting`)],
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

  for (let i = 0; i < accountDetails.length; i++) {
    await mint(accountDetails[i].address);
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
