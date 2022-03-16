# Error Codes 

### `amm.clar` Contract Errors
Contract errors in `amm.clar` starting from 100

| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_NOT_INITIALIZED                       | 100         | Contract not initialized yet                                   |
| ERR_EMPTY                                 | 101         | Balance zero in wallet                                         | 
| ERR_CONTRACT_OWNER_ONLY                   | 103         | Work done only by contract owner                               |
| ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED  | 104         | Ownership already transfered to the current user               |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL       | 105         | No submitted ownership transfer to cancel                      |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM      | 106         | No submitted ownership transfer to confirm                     |
| ERR_NOT_NEW_OWNER                         | 107         | Already present owner/ Not the new owner                       |
| ERR_INVALID_OPTION_TYPE                   | 108         | Invalid option from buying option for tokens                   |
| ERR_INVALID_OPTION_DURATION               | 109         | Invlaid amount of time to by token from buying option          |
| ERR_NOT_AUTHORIZED                        | 1000        | Current user/owner is not authorised                           |
| ERR_TOKEN_HOLDER_ONLY                     | 1001        | Can only be called by token holder only                        |
| ERR_NOT_APPROVED_TOKEN                    | 3000        | Token not approved to deposit or withdraw                      |
| ERR_NOT_ENOUGH_BALANCE                    | 3001        | Not enough balance/token to withdraw                           |

### `lp-token.clar` Contract Errors
Contract errors in `lp-token.clar` starting from 1000

| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_NOT_AUTHORIZED                        | 1000        | Current user/owner is not authorised                           |
| ERR_TOKEN_HOLDER_ONLY                     | 1001        | Can only be called by token holder only                        |
| ERR_NOT_NEW_OWNER                         | 2000        | Not new owner while transfering token in vault contract        |
| ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED  | 2001        | Token ownership transfer already submitted vault contract      |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL       | 2002        | No ownership transfer to cancel in vault contract              |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM      | 2003        | No ownership transfer to confirm in vault contract             |

### `minting.clar` Contract Errors
Contract errors in `minting.clar` starting from 100

| Error                                         | Code        | Description                                                    |
| :---                                          |    :----:   |    :----------------------------------------------------:      |
| UNAUTHORIZED_MINTER                           | 100         | Minter is not authorized to mint                               |
| MINTER_TRANSFER_NOT_SUBMITTED_BY_MINTER       | 107         | Minter did no submit the minter transfer                       |
| ANOTHER_MINTER_TRANSFER_IS_SUBMITTED          | 108         | Minter transfer is already submitted                           |
| MINTER_TRANSFER_NOT_CANCELLED_BY_MINTER       | 109         | Minter transfer is not cancelled by the minter                 |
| NO_MINTER_TRANSFER_TO_CANCEL                  | 110         | No minter transfer to be cancelled                             |
| NO_MINTER_TRANSFER_TO_CONFIRM                 | 111         | No minter transfer to be confirmed                             |
| MINTER_TRANSFER_NOT_CONFIRMED_BY_NEW_MINTER   | 112         | New minter didn't confirmed the minter transfer                |

### `token-option.clar` Contract Errors
Contract errors in `token-option.clar` starting from 103

| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_CONTRACT_OWNER_ONLY                   | 103         | Work done only by contract owner                               |
| ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED  | 104         | Ownership already transfered to the current user               |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL       | 105         | No submitted ownership transfer to cancel                      |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM      | 106         | No submitted ownership transfer to confirm                     |
| ERR_NOT_NEW_OWNER                         | 107         | Already present owner/ Not the new owner                       |
| ERR_INSUFFICIENT_BALANCE                  | 110         | Insufficient Balance in Wallet to transfer, burn               |
| ERR_INVALID_SENDER                        | 111         | Invalid sender for transfering tokens                          |
| ERR_AMOUNT_IS_NON_POSITIVE                | 112         | Amount is equal to zero to below zero                          |
| ERR_NOT_AUTHORIZED                        | 1000        | Current user/owner is not authorised                           |

### `token.clar` Contract Errors
Contract errors in `token.clar` starting from 100

| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_CONTRACT_ALREADY_AUTHORIZED           | 100         | Contract already authorized to particular principal/address    |
| ERR_CONTRACT_IS_NOT_AUTHORIZED            | 101         | Contract is not authorized to a particular principal/address   |
| ERR_NOT_AUTHORIZED                        | 102         | Principal/address is not authorized                            |
| ERR_TOKEN_HOLDER_ONLY                     | 4           | Can only be send by the token holder                           |
| ERR_CONTRACT_OWNER_ONLY                   | 103         | Work done only by contract owner                               |
| ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED  | 104         | Ownership already transfered to the current user               |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL       | 105         | No submitted ownership transfer to cancel                      |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM      | 106         | No submitted ownership transfer to confirm                     |
| ERR_NOT_NEW_OWNER                         | 107         | Already present owner/ Not the new owner                       |
| ERR_INSUFFICIENT_TOKENS_TO_MINT           | 108         | Amount of tokens to mint are less than the current balance     |
| ERR_CONTRACT_LOCKED                       | 109         | Contract is not locked with owner address                      |

### `vault.clar` Contract Errors
Contract errors in `vault.clar` starting from 1000

| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_NOT_AUTHORIZED                        | 1000        | Current user/owner is not authorised                           |
| ERR_NOT_NEW_OWNER                         | 2000        | Not new owner while transfering token in vault contract        |
| ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED  | 2001        | Token ownership transfer already submitted vault contract      |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL       | 2002        | No ownership transfer to cancel in vault contract              |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM      | 2003        | No ownership transfer to confirm in vault contract             |
| ERR_NOT_APPROVED_TOKEN                    | 3000        | Token not approved to deposit or withdraw                      |
| ERR_NOT_ENOUGH_BALANCE                    | 3001        | Not enough balance/token to withdraw                           |

