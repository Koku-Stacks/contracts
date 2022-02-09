(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_CONTRACT_ALREADY_AUTHORIZED (err u100))
(define-constant ERR_CONTRACT_IS_NOT_AUTHORIZED (err u101))
(define-constant ERR_NOT_AUTHORIZED (err u102))
(define-constant ERR_TOKEN_OWNER_ONLY (err u103))
(define-constant ERR_CONTRACT_OWNER_ONLY (err u104))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u105))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u106))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u107))
(define-constant ERR_NOT_NEW_OWNER (err u108))
(define-constant ERR_ONLY_OWNER_CAN_SET_URI (err u109))
(define-constant ERR_INSUFFICIENT_TOKENS_TO_MINT (err u110))

;; this considers a max supply of 21_000_000 tokens with six decimal places
(define-fungible-token token u21000000000000)

(define-data-var owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)
(define-data-var token-uri (string-utf8 256) u"www.token.com")
(define-data-var remaining-tokens-to-mint uint u21000000000000)

(define-map authorized-contracts {authorized: principal} bool)

(define-read-only (get-owner)
  (var-get owner))

(define-read-only (is-authorized (contract principal))
  (is-some (map-get? authorized-contracts {authorized: contract})))

(define-read-only (get-token-uri)
  (ok (some (var-get token-uri))))

(define-read-only (get-remaining-tokens-to-mint)
  (var-get remaining-tokens-to-mint))

(define-read-only (get-name)
  (ok "token"))

(define-read-only (get-symbol)
  (ok "TKN"))

(define-read-only (get-decimals)
  (ok u6))

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance token account)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply token)))

(define-public (submit-ownership-transfer (new-owner principal))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-none (var-get submitted-new-owner)) ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED)
    (var-set submitted-new-owner (some new-owner))
    (ok true)))

(define-public (cancel-ownership-transfer)
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL)
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (confirm-ownership-transfer)
  (begin
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM)
    (asserts! (is-eq (some tx-sender) (var-get submitted-new-owner)) ERR_NOT_NEW_OWNER)
    (var-set owner (unwrap-panic (var-get submitted-new-owner)))
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (add-authorized-contract (new-contract principal))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-none (map-get? authorized-contracts {authorized: new-contract})) ERR_CONTRACT_ALREADY_AUTHORIZED)
    (map-insert authorized-contracts {authorized: new-contract} true)
    (ok true)))

(define-public (revoke-authorized-contract (contract principal))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-some (map-get? authorized-contracts {authorized: contract})) ERR_CONTRACT_IS_NOT_AUTHORIZED)
    (map-delete authorized-contracts {authorized: contract})
    (ok true)))

(define-public (set-token-uri (new-token-uri (string-utf8 256)))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_ONLY_OWNER_CAN_SET_URI)
    (var-set token-uri new-token-uri)
    (ok true)))

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-authorized tx-sender) ERR_NOT_AUTHORIZED)
    (asserts! (<= amount (get-remaining-tokens-to-mint)) ERR_INSUFFICIENT_TOKENS_TO_MINT)
    (try! (ft-mint? token amount recipient))
    (var-set remaining-tokens-to-mint (- (get-remaining-tokens-to-mint) amount))
    (ok true)))

(define-public (burn (amount uint))
  (ft-burn? token amount tx-sender))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_TOKEN_OWNER_ONLY)
    (try! (ft-transfer? token amount sender recipient))
    (match memo some-memo (print some-memo) 0x)
    (ok true)))