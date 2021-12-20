# Koku

This repository contains source code related to the KOKU descentralized autonomous organization.
This document describes how its contents are arranged.

## Organization

The `contracts` directory should only contain those contracts whose functions are covered by unit tests.

Every Clarity contract which is not yet test covered should reside in `draft` folder, which might also contain undocumented source code in other languages, such as Typescript.

Inside `scripts` directory we can find every piece of documented script, that is, scripts which have a dedicated section in this document.

The `tests` directory contains unit tests for the Clarity smart contracts.

`Clarinet.toml` is a description of which contracts we currently have, where they are located and its dependencies.

`package.json` contains `npm` configuration regarding this project, such as `node` dependencies and `npm` commands.

## Scripts

This section describes the appropriate usage of the scripts contained in `scripts` directory. It is expected that such scripts are exposed as `npm` commands.

### deploy

Its base invocation command is `npm run deploy`. Some parameters are expected, namely `--contract` and `--network`.

The `--contract` parameter is mandatory, and should refer to a contract name (without the `.clar` extension) inside `contracts` folder.

When `--network` is not provided, the deployment is done into `testnet`. The accepted values for `--network` are `testnet` and `mainnet`.

Here follows some usage examples

    # general usage
    npm run deploy -- --contract <name> --network <network>
    # deploy a contract called vault (contracts/vault.clar) into the testnet
    npm run deploy -- --contract vault
    # deploy a contract called vault into the mainnet
    npm run deploy -- --contract vault --network mainnet