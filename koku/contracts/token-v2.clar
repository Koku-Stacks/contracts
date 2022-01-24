(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant only-owner-can-add-authorized-contracts u100)
(define-constant only-owner-can-revoke-authorized-contracts u101)
(define-constant unauthorized-contract u102)
(define-constant contract-already-authorized u103)
(define-constant contract-is-not-authorized u104)
(define-constant only-authorized-contracts-can-set-uri u105)
(define-constant only-authorized-contracts-can-mint-token u106)
(define-constant unauthorized-transfer u107)

(define-constant this-contract (as-contract tx-sender))

(contract-call? .ownership-registry register-ownership this-contract)

(define-map authorized-contracts {authorized: principal} bool)

(define-private (is-authorized)
  (is-some (map-get? authorized-contracts {authorized: tx-sender})))

(define-public (add-authorized-contract (new-contract principal))
  (begin
    (asserts! (is-eq {owner: tx-sender} (contract-call? .ownership-registry get-owner this-contract)) (err only-owner-can-add-authorized-contracts))
    (asserts! (is-none (map-get? authorized-contracts {authorized: new-contract})) (err contract-already-authorized))
    (map-insert authorized-contracts {authorized: new-contract} true)
    (ok true)))

(define-public (revoke-authorized-contract (contract principal))
  (begin
    (asserts! (is-eq {owner: tx-sender} (contract-call? .ownership-registry get-owner this-contract)) (err only-owner-can-revoke-authorized-contracts))
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