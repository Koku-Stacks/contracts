(impl-trait .owner-trait.owner-trait)
(use-trait ft-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_NOT_AUTHORIZED (err u1000))

(define-data-var contract-owner principal tx-sender)

(define-read-only (get-owner)
    (ok (var-get contract-owner)))

(define-public (set-owner (new-owner principal))
    (begin
        (asserts! (is-eq (var-get contract-owner) contract-caller) ERR_NOT_AUTHORIZED)
        (ok (var-set contract-owner new-owner))))

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
