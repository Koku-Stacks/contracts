# Error Codes 

### Contract Errors
General Contract Errors Start from 100

| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_NOT_INITIALIZED                       | 100         | Contract not initialized yet                                   |
| ERR_EMPTY                                 | 101         | Balance zero in wallet                                         |
| ERR_NOT_AUTHORIZED                        | 102         | User not authorized to mint                                    |
| ERR_CONTRACT_OWNER_ONLY                   | 103         | Work done only by contract owner                               |
| ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED  | 104         | Ownership already transfered to the current user               |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL       | 105         | No submitted ownership transfer to cancel                      |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM      | 106         | No submitted ownership transfer to confirm                     |
| ERR_NOT_NEW_OWNER                         | 107         | Already present owner/ Not the new owner                       |
| ERR_INVALID_OPTION_TYPE                   | 108         | Invalid option from buying option for tokens                   |
| ERR_INVALID_OPTION_DURATION               | 109         | Invlaid amount of time to by token from buying option          |
| ERR_INSUFFICIENT_BALANCE                  | 110         | Insufficient Balance in Wallet to transfer, burn               |
| ERR_INVALID_SENDER                        | 111         | Invalid sender for transfering tokens                          |
| ERR_AMOUNT_IS_NON_POSITIVE                | 112         | Amount is equal to zero to below zero                          |

### Auth Errors
Auth Errors Start from 1000

| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_NOT_AUTHORIZED                        | 1000        | Current user/owner is not authorised                           |
| ERR_TOKEN_HOLDER_ONLY                     | 1001        | Can only be called by token holder only                        |
| ERR_NOT_NEW_OWNER                         | 2000        | Not new owner while transfering token in vault contract        |
| ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED  | 2001        | Token ownership transfer already submitted vault contract      |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL       | 2002        | No ownership transfer to cancel in vault contract              |
| ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM      | 2003        | No ownership transfer to confirm in vault contract             |

### Token Errors
Token Errors Start from 3000

| Error                                     | Code        | Description                                                    |
| :---                                      |    :----:   |    :----------------------------------------------------:      |
| ERR_NOT_APPROVED_TOKEN                    | 3000        | Token not approved to deposit or withdraw                      |
| ERR_NOT_ENOUGH_BALANCE                    | 3001        | Not enough balance/token to withdraw                           |
