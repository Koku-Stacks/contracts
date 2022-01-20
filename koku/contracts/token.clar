;; token
;; sample token implementation

(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant unauthorized-minter u100)
(define-constant unauthorized-transfer u101)

(define-constant this-contract (as-contract tx-sender))

(contract-call? .ownership-registry register-ownership this-contract)

(contract-call? .uri-registry set-uri this-contract u"www.token.com")

(define-read-only (get-token-uri)
  (ok (contract-call? .uri-registry get-uri this-contract)))

;; this considers a max supply of 21_000_000 tokens with six decimal places
(define-fungible-token token u21000000000000)

(define-public (mint (amount uint) (to principal))
  (begin
    (asserts! (is-eq tx-sender .minting) (err unauthorized-minter))
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
                  (is-eq tx-sender .allowance)) (err unauthorized-transfer))
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