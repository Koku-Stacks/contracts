# Error Codes 

### Contract Errors starting from 1000

| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_NOT_INITIALIZED                       | 1000        | Contract not initialized yet                                   |
| ERR_CONTRACT_OWNER_ONLY                   | 1001        | Work done only by contract owner                               |
| ERR_CONTRACT_ALREADY_AUTHORIZED           | 1002        | Contract already authorized to particular principal/address    |
| ERR_CONTRACT_IS_NOT_AUTHORIZED            | 1003        | Contract is not authorized to a particular principal/address   |
| ERR_CONTRACT_LOCKED                       | 1004        | Contract is not locked with owner address                      |

### Ownership Errors starting from 2000
| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED  | 2000         | Ownership already transfered to the current user               |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL       | 2001         | No submitted ownership transfer to cancel                      |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM      | 2002         | No submitted ownership transfer to confirm                     |
| ERR_NOT_NEW_OWNER                         | 2003         | Already present owner/ Not the new owner                       |

### Token Errors starting from 3000
| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_NOT_AUTHORIZED                        | 3000        | Current user/owner is not authorised                           |
| ERR_TOKEN_HOLDER_ONLY                     | 3001        | Can only be called by token holder only                        |
| ERR_NOT_APPROVED_TOKEN                    | 3002        | Token not approved to deposit or withdraw                      |
| ERR_NOT_ENOUGH_BALANCE                    | 3003        | Not enough balance/token to withdraw                           |
| ERR_INVALID_OPTION_TYPE                   | 3004        | Invalid option from buying option for tokens                   |
| ERR_INVALID_OPTION_DURATION               | 3005        | Invlaid amount of time to by token from buying option          |
| ERR_INSUFFICIENT_BALANCE                  | 3006        | Insufficient Balance in Wallet to transfer, burn               |
| ERR_AMOUNT_IS_NON_POSITIVE                | 3007        | Amount is equal to zero to below zero                          |
| ERR_INSUFFICIENT_TOKENS_TO_MINT           | 3008        | Amount of tokens to mint are less than the current balance     |

