(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant only-owner-can-add-authorized-contracts u100)
(define-constant only-owner-can-revoke-authorized-contracts u101)
(define-constant unauthorized-contract u102)
(define-constant contract-already-authorized u103)
(define-constant contract-is-not-authorized u104)
(define-constant only-authorized-contracts-can-set-uri u105)
(define-constant only-authorized-contracts-can-mint-token u106)
(define-constant unauthorized-transfer u107)
(define-constant ownership-transfer-not-submitted-by-owner u108)
(define-constant another-ownership-transfer-is-submitted u109)
(define-constant ownership-transfer-not-cancelled-by-owner u110)
(define-constant no-ownership-transfer-to-cancel u111)
(define-constant no-ownership-transfer-to-confirm u112)
(define-constant ownership-transfer-not-confirmed-by-new-owner u113)

(define-constant this-contract (as-contract tx-sender))

(define-data-var owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-read-only (get-owner)
  (var-get owner))

(define-public (submit-ownership-transfer (new-owner principal))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) (err ownership-transfer-not-submitted-by-owner))
    (asserts! (is-none (var-get submitted-new-owner)) (err another-ownership-transfer-is-submitted))
    (var-set submitted-new-owner (some new-owner))
    (ok true)))

(define-public (cancel-ownership-transfer)
  (begin
    (asserts! (is-eq (get-owner) tx-sender) (err ownership-transfer-not-cancelled-by-owner))
    (asserts! (is-some (var-get submitted-new-owner)) (err no-ownership-transfer-to-cancel))
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (confirm-ownership-transfer)
  (match (var-get submitted-new-owner)
    new-owner
    (begin
      (asserts! (is-eq (some tx-sender) (var-get submitted-new-owner)) (err ownership-transfer-not-confirmed-by-new-owner))
      (var-set submitted-new-owner none)
      (var-set owner new-owner)
      (ok true))
    (err no-ownership-transfer-to-confirm)))

(define-map authorized-contracts {authorized: principal} bool)

(define-read-only (is-authorized (contract principal))
  (is-some (map-get? authorized-contracts {authorized: contract})))

(define-public (add-authorized-contract (new-contract principal))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) (err only-owner-can-add-authorized-contracts))
    (asserts! (is-none (map-get? authorized-contracts {authorized: new-contract})) (err contract-already-authorized))
    (map-insert authorized-contracts {authorized: new-contract} true)
    (ok true)))

(define-public (revoke-authorized-contract (contract principal))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) (err only-owner-can-revoke-authorized-contracts))
    (asserts! (is-some (map-get? authorized-contracts {authorized: contract})) (err contract-is-not-authorized))
    (map-delete authorized-contracts {authorized: contract})
    (ok true)))

(define-data-var token-uri (string-utf8 256) u"www.token.com")

(define-read-only (get-token-uri)
  (ok (some (var-get token-uri))))

(define-public (set-token-uri (new-token-uri (string-utf8 256)))
  (begin
    (asserts! (is-authorized) (err only-authorized-contracts-can-set-uri))
    (var-set token-uri new-token-uri)
    (ok true)))

;; this considers a max supply of 21_000_000 tokens with six decimal places
(define-fungible-token token u21000000000000)

(define-public (mint (amount uint) (to principal))
  (begin
    (asserts! (is-authorized) (err only-authorized-contracts-can-mint-token))
    (match (ft-mint? token amount to)
      ok-mint
      (ok true)
      err-mint
      (err err-mint))))

(define-public (burn (amount uint))
  (begin
    (ft-burn? token amount tx-sender)))

(define-public (transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
  (begin
    (asserts! (or (is-eq tx-sender from)
                  (is-authorized)) (err unauthorized-transfer))
    (match (ft-transfer? token amount from to)
      ok-transfer
      (begin
        (match memo some-memo (print some-memo) 0x)
        (ok true))
      err-transfer
      (err err-transfer))))

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