(impl-trait .owner-trait.owner-trait)

(define-constant ERR_NOT_AUTHORIZED (err u1000))

(define-data-var contract-owner principal tx-sender)

(define-map approved-contracts principal bool)

(define-fungible-token dyv)

;; get-owner of the contract
(define-read-only (get-owner)
    (ok (var-get contract-owner))
)

;; set-owner of the contract
(define-public (set-owner (new-owner principal))
    (begin
        (asserts! (is-eq (var-get contract-owner) contract-caller) ERR_NOT_AUTHORIZED)
        (ok (var-set contract-owner new-owner))
    )
)

;; check if the approved-contracts map contains the requested sender
(define-public (check-is-approved (sender principal))
    (ok (asserts! (default-to false (map-get? approved-contracts sender)) ERR_NOT_AUTHORIZED))
)

;; only approved contracts can call this method
(define-public (deposit (amount uint) (memo (optional (buff 34))))
    (begin
        (try! (check-is-approved contract-caller))
        ;; transfer the amount from tx-sender to vault
        (try! (ft-transfer? dyv amount tx-sender (as-contract tx-sender)))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

;; only approved contracts can call this method
(define-public (withdraw (amount uint) (memo (optional (buff 34))))
    (begin
        (try! (check-is-approved contract-caller))
        ;; transfer the amount from vault to tx-sender
        (try! (ft-transfer? dyv amount (as-contract tx-sender) tx-sender))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-private (mint (amount uint) (recipient principal))
    (begin
        (try! (check-is-approved contract-caller))
        (ft-mint? dyv amount recipient)
    )
)

;; initialize approved contracts map
(begin
    (map-set approved-contracts 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM true)
    (try! (mint u1000 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM))
    (try! (mint u1000 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5))
    (try! (mint u1000 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG))
)