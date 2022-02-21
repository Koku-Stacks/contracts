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

(define-public (deposit (token <ft-trait>) (amount uint))
    (begin
        (try! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none))
        (try! (contract-call? .dyv-vault-token mint amount tx-sender))
        (ok true)))

(define-public (withdraw (token <ft-trait>) (amount uint))
    (let
        ((recipient tx-sender))
        (try! (as-contract (contract-call? token transfer amount tx-sender recipient none)))
        (try! (contract-call? .dyv-vault-token burn amount))
        (ok true)))
