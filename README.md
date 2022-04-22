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

It is adivisable to propose changes to this repository via Pull Requests. So, before starting to devise any changes, create a new branch from `master` with a descriptive name, usually referring to the task code (in JIRA) and to the author, e.g `luiz/KOKU-120`. Once approved, merge the corresponding PR with `squash and merge`. If your PR branch gets out of sync with `master`, you can bring it back in sync by `rebase` and `push --force` (provided you are the only contributor on your branch).

In order to create a new contract, go to the project root directory and issue the command `clarinet contract new <name>`, which creates a `<name>.clar` file in the `contracts` directory, as well as a `<name>_test.ts` file in the `tests` folder. Also, a new contract section regarding `<name>.clar` is added to `Clarinet.toml`. Be sure to provide a good test coverage to the newly created contract, otherwise move `<name>.clar` to the `draft` directory and edit its corresponding `Clarinet.toml` section accordingly. Once `<name>.clar` has good test coverage, move it back to `contracts` and perform the required changes in `Clarinet.toml`.

To create a new script, start editing the corresponding file inside `draft`. Once it is well documented and has a corresponding `scripts` entry in `package.json`, move it to the `scripts` directory.

## Scripts

This section describes the appropriate usage of the scripts contained in `scripts` directory. It is expected that such scripts are exposed as `npm` commands via `scripts` entries in `package.json`.

### deploy

Its base invocation command is `npm run deploy`. One parameter is expected, namely `--contract`.

The `--contract` parameter is mandatory, and should refer to a contract name (without the `.clar` extension) inside `contracts` folder.

Here follows some usage examples

    # general usage
    npm run deploy -- --contract <name>
    # deploy a contract called vault (contracts/vault.clar) into the testnet
    npm run deploy -- --contract vault
    # deploy a trait contract
    npm run deploy -- --contract traits/burn-trait

### gas-cost estimation

This section describes how to measure the gas cost of all the contracts. When run `npm run gas-cost` a seperate file `cost_report.txt` will be created.

The last column in `cost_report.txt` defines the gas cost fee in microSTX for all the contracts.

Whereas 1 STX = 1000000 microSTX or 1 microSTX = 1 / 1000000

Follow the usage example

    # general usage to measure gas cost
    npm run gas-cost

### btc price

Its base invocation command is `npm run btc-price`. One optional parameter can be passed, namely `--service`.

When the base command is invoked, exactly one price update is performed.
When the optional parameter `--service` is passed, one price update is performed every minute until the command is exited with C-c.

    # general usage: performs exactly one price update
    npm run btc-price
    # run as a service: performs one price update every minute
    npm run btc-price -- --service

### keys generation

Its base invocation command is `npm run generate-key`. It does not accept any parameters.

When the base command is invoked, it generates output containing a newly created random secret key as well as the corresponding private payload for usage in Stacks ecosystem.
Additionaly, the corresponding testnet and mainnet public addresses are provided.

## Token contract
[Our token](contracts/token.clar) is [sip-010 interface](contracts/traits/sip-010-trait-ft-standard.clar) compatible contract.

it is designed with an upgdatability support through splitting storage and interfaces interacting with it.
Hard cap for the token minting supply is 21 million with 6 decimals.

### Ownership interface
```
(define-read-only (get-owner)
(define-public (submit-ownership-transfer (new-owner principal))
(define-public (cancel-ownership-transfer)
(define-public (confirm-ownership-transfer)
```
These are for controlling ownership and transferring owhership of the contract.
Here is the approach of 2-transactional ownership transfer when the second one transaction is in fact confirmation by the new **owner**.
Such approach has been chosen to protect transferring ownership to nowhere by mistake.

**Owner** is allowed to:
* authorize minter roles.
* lock the contract by emergency.

### Token title control interface
```
(define-public (set-token-uri (new-token-uri (string-utf8 256)))
(define-public (set-token-name (new-token-name (string-ascii 32)))
(define-public (set-token-symbol (new-token-symbol (string-ascii 32)))
```
Can ba called only by **owner**.
Changing storage by these functions is automatically reflected in appropriate read only functions from [sip-010 interface](contracts/traits/sip-010-trait-ft-standard.clar).

### Minting authorization interface
```
(define-public (add-authorized-contract (new-contract principal))
(define-public (revoke-authorized-contract (contract principal))
(define-read-only (is-authorized (contract principal))
```
These are called by **owner** and dedicated for authorization of other contracts or principals for minting.
This way the upgradability support for the future evolution in the ecosystem has reached.

### Emergency lock interface
```
(define-public (set-contract-lock (lock bool))
(define-read-only (get-contract-lock)
```
This lock will block all token flow between principal through disabling funtions as **transfer**, **burn**, **mint**

### Minting interface
```
(define-read-only (get-remaining-tokens-to-mint)
(define-public (mint (amount uint) (recipient principal))
```
Only the principals previously authorized **by owner** are allowed to call mint function.
Mint is allowed only within **remaining-tokens-to-mint** limit.

### Burning interface
```
(define-public (burn (amount uint))
```
Everyone is allowed to burn his own token but not tokens of others.
