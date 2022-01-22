(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant unauthorized u100)
(define-constant unauthorized-transfer u101)

(define-map authorized-contracts principal bool)

(define-constant this-contract (as-contract tx-sender))

(contract-call? .ownership-registry register-ownership this-contract)

(define-private (is-authorized)
  (ok (asserts!
    (is-eq true (default-to false (map-get? authorized-contracts tx-sender)))
    (err unauthorized)
  ))
)

(define-public (add-authorized-contract (new-contract principal))
  (begin
    (asserts! (is-eq {owner: tx-sender} (contract-call? .ownership-registry get-owner this-contract)) (err unauthorized))
    (ok (map-insert authorized-contracts new-contract true))
  )
)

(define-public (revoke-authorized-contract (contract-name principal))
  (begin
    (asserts! (is-eq {owner: tx-sender} (contract-call? .ownership-registry get-owner this-contract)) (err unauthorized))
    (ok (map-delete authorized-contracts contract-name))
  )
)

(define-read-only (get-is-authorized (contract principal))
  (default-to false (map-get? authorized-contracts contract))
)

(define-data-var token-uri (string-utf8 256) u"www.token.com")

(define-read-only (get-token-uri)
	(ok (some (var-get token-uri))))

(define-public (set-token-uri (new-token-uri (string-utf8 256)))
  (begin
    (try! (is-authorized))
    (ok (var-set token-uri new-token-uri))))

;; this considers a max supply of 21_000_000 tokens with six decimal places
(define-fungible-token token u21000000000000)

(define-public (mint (amount uint) (to principal))
  (begin
    (try! (is-authorized))
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
                  (try! (is-authorized))) (err unauthorized-transfer))
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