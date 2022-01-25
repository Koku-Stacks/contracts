(define-constant unauthorized-minter u100)
(define-constant insuficcient-tokens-to-mint u101)

(define-constant this-contract (as-contract tx-sender))

(contract-call? .token-v2 add-authorized-contract this-contract)

(define-data-var remaining-tokens-to-mint uint u21000000000000)

(define-read-only (get-remaining-tokens-to-mint)
  (var-get remaining-tokens-to-mint))

(define-private (decrease-remaining-tokens-to-mint (amount uint))
  (var-set remaining-tokens-to-mint (- (get-remaining-tokens-to-mint) amount)))

(define-public (mint (amount uint) (to principal))
  (begin
    (asserts! (is-eq tx-sender (contract-call? .token-v2 get-owner)) (err unauthorized-minter))
    (asserts! (<= amount (get-remaining-tokens-to-mint)) (err insuficcient-tokens-to-mint))
    (match (as-contract (contract-call? .token mint amount to))
      ok-mint
      (begin
        (decrease-remaining-tokens-to-mint amount)
        (ok true))
      err-mint
      (err err-mint))))