(impl-trait .owner-trait.owner-trait)
(use-trait ft-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_NOT_AUTHORIZED (err u1000))
(define-constant ERR_NOT_NEW_OWNER (err u2000))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u2001))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u2002))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u2003))

(define-data-var contract-owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-read-only (get-owner)
    (ok (var-get contract-owner)))

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

(define-public (deposit (token <ft-trait>) (amount uint) (memo (optional (buff 34))))
    (let
        ((sender tx-sender))
        ;; Only valid tokens can be deposited
        (try! (contract-call? token transfer amount sender (as-contract tx-sender) memo))
        (try! (contract-call? .lp-token mint amount sender))
        (ok true)))

(define-public (withdraw (token <ft-trait>) (amount uint) (memo (optional (buff 34))))
    (let
        ((recipient tx-sender))
        ;; Only valid tokens can be withdrawn
        (try! (as-contract (contract-call? token transfer amount tx-sender recipient memo)))
        (try! (contract-call? .lp-token burn amount))
        (ok true)))
