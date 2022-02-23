(impl-trait .owner-trait.owner-trait)
(impl-trait .sip-010-trait-ft-standard.sip-010-trait)
(impl-trait .ft-mint-burn-trait.ft-mint-burn-trait)

(define-constant ERR_NOT_AUTHORIZED (err u1000))
(define-constant ERR_TOKEN_HOLDER_ONLY (err u1001))

(define-fungible-token lp-token)

(define-data-var contract-owner principal tx-sender)
(define-data-var token-uri (string-utf8 256) u"https://dy.finance/")

(define-map approved-contracts principal bool)

(define-read-only (get-name)
    (ok "dYrivaNative-vault-toke"))

(define-read-only (get-symbol)
    (ok "lp-token"))

(define-read-only (get-decimals)
  (ok u6))

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance lp-token account)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply lp-token)))

(define-read-only (get-token-uri)
  (ok (some (var-get token-uri))))

(define-read-only (get-owner)
    (ok (var-get contract-owner)))
  
(define-read-only (check-is-approved (sender principal))
    (ok (asserts! (default-to false (map-get? approved-contracts sender)) ERR_NOT_AUTHORIZED)))

(define-public (set-owner (new-owner principal))
    (begin
        (asserts! (is-eq (var-get contract-owner) contract-caller) ERR_NOT_AUTHORIZED)
        (ok (var-set contract-owner new-owner))))

(define-public (set-token-uri (new-token-uri (string-utf8 256)))
  (begin
    (asserts! (is-eq (var-get contract-owner) contract-caller) ERR_NOT_AUTHORIZED)
    (ok (var-set token-uri new-token-uri))))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) ERR_TOKEN_HOLDER_ONLY)
        (try! (ft-transfer? lp-token amount sender recipient))
        (ok true)))

(define-public (mint (amount uint) (recipient principal))
    (begin
        (try! (check-is-approved contract-caller))
        (ft-mint? lp-token amount recipient)))

(define-public (burn (amount uint))
    (begin
        (try! (check-is-approved contract-caller))
        (ft-burn? lp-token amount tx-sender)))

;; initialize approved contracts map
(begin (map-set approved-contracts 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.vault true))