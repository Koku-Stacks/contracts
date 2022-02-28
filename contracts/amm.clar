;; this contract contains a circular buffer implementation
(impl-trait .owner-trait.owner-trait)
(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_NOT_INITIALIZED (err u100))
(define-constant ERR_EMPTY (err u101))
(define-constant ERR_CONTRACT_OWNER_ONLY (err u103))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u104))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u105))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u106))
(define-constant ERR_NOT_NEW_OWNER (err u107))
(define-constant ERR_NOT_AUTHORIZED (err u1000))
(define-constant ERR_TOKEN_HOLDER_ONLY (err u1001))
(define-constant ERR_NOT_APPROVED_TOKEN (err u3000))
(define-constant ERR_NOT_ENOUGH_BALANCE (err u3001))

(define-constant buffer-max-limit u10)

(define-fungible-token lp-token)

(define-map circular-buffer {index: uint} {btc-price: uint})
(define-map ledger principal uint)

(define-data-var owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)
(define-data-var end uint u0)
(define-data-var empty bool true)
(define-data-var number-inserted-items uint u0)
(define-data-var initialized bool false)
(define-data-var approved-token principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token)
(define-data-var token-uri (string-utf8 256) u"https://dy.finance/")

(define-read-only (get-name)
    (ok "lp-token"))

(define-read-only (get-symbol)
    (ok "LP"))

(define-read-only (get-decimals)
  (ok u6))

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance lp-token account)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply lp-token)))

(define-read-only (get-token-uri)
  (ok (some (var-get token-uri))))

(define-read-only (get-approved-token)
    (ok (var-get approved-token)))

(define-read-only (get-ledger-balance (person principal))
    (default-to u0 (map-get? ledger person)))

(define-read-only (get-owner)
  (ok (var-get owner)))

(define-read-only (is-empty)
  (var-get empty))

(define-read-only (get-item)
  (begin
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (not (is-empty)) ERR_EMPTY)
    (ok (get-at (mod (+ (var-get end) u1) buffer-max-limit)))))

(define-public (set-token-uri (new-token-uri (string-utf8 256)))
  (begin
    (asserts! (is-eq (var-get owner) contract-caller) ERR_NOT_AUTHORIZED)
    (ok (var-set token-uri new-token-uri))))

(define-public (submit-ownership-transfer (new-owner principal))
  (begin
    (asserts! (is-eq (var-get owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-none (var-get submitted-new-owner)) ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED)
    (var-set submitted-new-owner (some new-owner))
    (ok true)))

(define-public (cancel-ownership-transfer)
  (begin
    (asserts! (is-eq (var-get owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
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

(define-public (initialize-or-reset)
  (let ((indexes         (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9))
        (initial-content (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0)))
    (asserts! (is-eq tx-sender (var-get owner)) ERR_CONTRACT_OWNER_ONLY)
    (map set-at indexes initial-content)
    (var-set initialized true)
    (var-set empty true)
    (var-set number-inserted-items u0)
    (ok true)))

(define-public (add-btc-price (btc-price uint))
  (begin
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (is-eq tx-sender (var-get owner)) ERR_CONTRACT_OWNER_ONLY)
    (var-set end (mod (+ (var-get end) u1) buffer-max-limit))
    (set-at (var-get end) btc-price)
    (var-set number-inserted-items (+ (var-get number-inserted-items) u1))
    (if (is-eq buffer-max-limit (var-get number-inserted-items))
      (begin
        (var-set number-inserted-items u0)
        (var-set empty false))
      true)
    (ok true)))

(define-public (deposit (token principal) (amount uint) (memo (optional (buff 34))))
    (let
        ((sender tx-sender))
        (asserts! (is-eq token (var-get approved-token)) ERR_NOT_APPROVED_TOKEN)
        (try! (contract-call? .token transfer amount sender (as-contract tx-sender) memo))
        (try! (mint amount sender))
        (map-set ledger sender (+ (get-ledger-balance sender) amount))
        (ok true)))

(define-public (withdraw (token principal) (amount uint) (memo (optional (buff 34))))
    (let
        ((recipient tx-sender))
        (asserts! (is-eq token (var-get approved-token)) ERR_NOT_APPROVED_TOKEN)
        (try! (as-contract (contract-call? .token transfer amount tx-sender recipient memo)))
        (try! (burn amount recipient))
        (asserts! (>= (get-ledger-balance recipient) amount) ERR_NOT_ENOUGH_BALANCE)
        (map-set ledger recipient (- (get-ledger-balance recipient) amount))
        (ok true)))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) ERR_TOKEN_HOLDER_ONLY)
        (try! (ft-transfer? lp-token amount sender recipient))
        (match memo some-memo (print some-memo) 0x)
        (ok true)))

(define-private (mint (amount uint) (recipient principal))
    (ft-mint? lp-token amount recipient))

(define-private (burn (amount uint) (recipient principal))
    (ft-burn? lp-token amount recipient))

(define-private (get-at (idx uint))
  (unwrap-panic (map-get? circular-buffer {index: idx})))

(define-private (set-at (idx uint) (btc-price uint))
  (map-set circular-buffer {index: idx} {btc-price: btc-price}))