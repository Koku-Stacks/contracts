(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-v0a.ft-trait)

;; liquidity-token
;; a fungible token to represent liquidity inside a market

(define-constant not-tx-sender u1)
(define-constant unauthorized-minter u2)

(define-constant allowed-minter 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.liquidity-pool)

(define-fungible-token liquidity-token)

(define-constant number-of-decimals u3)

(define-data-var total-supply uint u0)

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender allowed-minter) (err unauthorized-minter))
    (match (ft-mint? liquidity-token amount recipient)
      ok-value
      (begin
        (var-set total-supply (+ (var-get total-supply) amount))
        (ok true))
      err-value
      (err err-value))))

(define-public (burn (amount uint) (sender principal))
  (begin
    (asserts! (is-eq tx-sender allowed-minter) (err unauthorized-minter))
    (match (ft-burn? liquidity-token amount sender)
      ok-value
      (begin
        (var-set total-supply (- (var-get total-supply) amount))
        (ok true))
      err-value
      (err err-value))))

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
  (ok (var-get total-supply)))

(define-public (transfer (amount uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) (err not-tx-sender))
    (ft-transfer? liquidity-token amount sender recipient)))