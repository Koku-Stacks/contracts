(impl-trait .owner-trait.owner-trait)
(impl-trait .sip-010-trait-ft-standard.sip-010-trait)
(impl-trait .custom-sip-010-trait.custom-sip-010-trait)

(define-constant ERR_NOT_AUTHORIZED (err u1000))
(define-constant ERR_TOKEN_HOLDER_ONLY (err u1001))
(define-constant ERR_NOT_NEW_OWNER (err u2000))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u2001))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u2002))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u2003))

(define-fungible-token lp-token)

(define-data-var contract-owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)
(define-data-var token-uri (string-utf8 256) u"https://dy.finance/")

(define-map approved-contracts principal bool)

(define-read-only (get-name)
    (ok "dYrivaNative-vault-token"))

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

(define-public (set-token-uri (new-token-uri (string-utf8 256)))
  (begin
    (asserts! (is-eq (var-get contract-owner) contract-caller) ERR_NOT_AUTHORIZED)
    (ok (var-set token-uri new-token-uri))))

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

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) ERR_TOKEN_HOLDER_ONLY)
        (try! (ft-transfer? lp-token amount sender recipient))
        (match memo some-memo (print some-memo) 0x)
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
(begin 
  (map-set approved-contracts 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.amm true)
  (map-set approved-contracts 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.vault true)
)