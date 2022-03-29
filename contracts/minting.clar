(impl-trait .mint-trait.mint-trait)
(impl-trait .owner-trait.owner-trait)

(define-constant ERR_NOT_AUTHORIZED (err u1000))
(define-constant ERR_NOT_NEW_OWNER (err u2000))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u2001))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u2002))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u2003))
(define-constant ERR_MINTER_ALREADY_AUTHORIZED (err u3000)) ;; FIXME devise a proper error code according to ERRORS.md and update it.
(define-constant ERR_MINTER_NOT_AUTHORIZED (err u3001)) ;; FIXME devise a proper error code according to ERRORS.md and update it.

(define-constant this-contract (as-contract tx-sender))

(define-map authorized-minters {minter: principal} {dummy: bool})

(define-data-var contract-owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-read-only (get-remaining-tokens-to-mint)
  (contract-call? .token get-remaining-tokens-to-mint))

(define-read-only (get-owner)
  (ok (var-get contract-owner)))

(define-read-only (is-authorized-minter (minter principal))
  (is-some (map-get? authorized-minters {minter: minter})))

(define-public (authorize-minter (new-minter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (asserts! (not (is-authorized-minter new-minter)) ERR_MINTER_ALREADY_AUTHORIZED)
    (map-set authorized-minters {minter: new-minter} {dummy: true})
    (ok true)))

(define-public (unauthorize-minter (minter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (asserts! (is-authorized-minter minter) ERR_MINTER_NOT_AUTHORIZED)
    (map-delete authorized-minters {minter: minter})
    (ok true)))

(define-public (submit-ownership-transfer (new-owner principal))
  (begin
    (asserts! (is-eq (var-get contract-owner) tx-sender) ERR_NOT_AUTHORIZED)
    (asserts! (is-none (var-get submitted-new-owner)) ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED)
    (var-set submitted-new-owner (some new-owner))
    (ok true)))

(define-public (cancel-ownership-transfer)
  (begin
    (asserts! (is-eq (var-get contract-owner) tx-sender) ERR_NOT_AUTHORIZED)
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL)
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (confirm-ownership-transfer)
  (begin
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM)
    (asserts! (is-eq (some tx-sender) (var-get submitted-new-owner)) ERR_NOT_NEW_OWNER)
    (var-set contract-owner (unwrap-panic (var-get submitted-new-owner)))
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-authorized-minter tx-sender) ERR_NOT_AUTHORIZED)
    (try! (as-contract (contract-call? .token mint amount recipient)))
    (ok true)))
