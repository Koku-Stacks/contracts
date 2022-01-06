(impl-trait .sip-010-trait-ft-standard.ft-trait)

;; liquidity-token
;; a fungible token to represent liquidity inside a market

(define-constant not-tx-sender u1)
(define-constant unauthorized-minter u2)
(define-constant unauthorized-burner u3)
(define-constant unauthorized-transferer u4)

(define-constant allowed-user .liquidity-pool)

(define-fungible-token liquidity-token)

(define-constant number-of-decimals u3)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender allowed-user) (err unauthorized-transferer))
    (ft-transfer? liquidity-token amount sender recipient)))

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender allowed-user) (err unauthorized-minter))
    (ft-mint? liquidity-token amount recipient)))

(define-public (burn (amount uint) (sender principal))
  (begin
    (asserts! (is-eq tx-sender allowed-user) (err unauthorized-burner))
    (ft-burn? liquidity-token amount sender)))

(define-read-only (get-balance-of (from principal))
  (begin
    (asserts! (is-eq tx-sender from) (err not-tx-sender))
    (ok (ft-get-balance liquidity-token from))))

(define-read-only (get-decimals)
  (ok number-of-decimals))

(define-read-only (get-name)
  (ok "Koku Liquidity Token"))

(define-read-only (get-symbol)
  (ok "KLT"))

(define-read-only (get-token-uri)
  (ok (some u"TODO add uri later")))

(define-read-only (get-total-supply)
  (ok (ft-get-supply liquidity-token)))