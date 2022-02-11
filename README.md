## dYrivaNative Network
[![codecov](https://codecov.io/gh/Koku-Stacks/contracts/branch/master/graph/badge.svg?token=HATLM28JPR)](https://codecov.io/gh/Koku-Stacks/contracts)

# dYrivaNative

This repository contains source code related to the dYrivaNative descentralized autonomous organization.
This document brings a description of this repository contents, the dependencies required for the usage of this repository, the steps to set up a development environment, and finally instructions on how to use the provided scripts.

## Organization

The `contracts` directory should only contain those contracts whose functions are covered by unit tests.

Every Clarity contract which is not yet test covered should reside in `draft` folder, which might also contain undocumented source code in other languages, such as Typescript.

Inside `scripts` directory we can find every piece of documented script, that is, scripts which have a dedicated section in this document.

The `tests` directory contains unit tests for the Clarity smart contracts.

`Clarinet.toml` is a description of which contracts we currently have, where they are located and its dependencies.

`package.json` contains `npm` configuration regarding this project, such as `node` dependencies and `npm` commands.

## Dependencies

In order to properly use this repository, an installation of `node` is required (https://nodejs.org/), as well as `clarinet`, which is the default development tool for Clarity smart contracts. A `clarinet` binary can be downloaded from the releases section of its github page (https://github.com/hirosystems/clarinet).

## Development environment

It is adivisable to use VSCode for editing Clarity smart contracts, as this is the text editor officially supported by the Clarity language server (https://github.com/hirosystems/clarity-lsp). Once VSCode is installed, add the extension `Clarity for Visual Studio Code` to it. Another useful extension is `Rainbow Brackets`, as Clarity is a LISP language.

Tests are based on the `clarinet` unit test framework, which is powered by `deno`. So, in order to have a good editor support for writing them, add the `Deno` extension to VSCode, which depends on a proper installation of `deno`. A `deno` binary can be downloaded from the releases section of its github page (https://github.com/denoland/deno).

## Workflow

It is adivisable to propose changes to this repository via Pull Requests. So, before starting to devise any changes, create a new branch from `master` with a descriptive name. Once approved, merge the corresponding PR with `squash and merge`.

In order to create a new contract, go to the project root directory and issue the command `clarinet contract new <name>`, which creates a `<name>.clar` file in the `contracts` directory, as well as a `<name>_test.ts` file in the `tests` folder. Also, a new contract section regarding `<name>.clar` is added to `Clarinet.toml`. Be sure to provide a good test coverage to the newly created contract, otherwise move `<name>.clar` to the `draft` directory and edit its corresponding `Clarinet.toml` section accordingly. Once `<name>.clar` has good test coverage, move it back to `contracts` and perform the required changes in `Clarinet.toml`.

To create a new script, start editing the corresponding file inside `draft`. Once it is well documented and has a corresponding `scripts` entry in `package.json`, move it to the `scripts` directory.

## Scripts

This section describes the appropriate usage of the scripts contained in `scripts` directory. It is expected that such scripts are exposed as `npm` commands via `scripts` entries in `package.json`.

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