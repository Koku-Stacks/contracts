(define-constant unauthorized-minter u100)
(define-constant insuficcient-tokens-to-mint u101)
(define-constant minter-transfer-not-submitted-by-minter u107)
(define-constant another-minter-transfer-is-submitted u108)
(define-constant minter-transfer-not-cancelled-by-minter u109)
(define-constant no-minter-transfer-to-cancel u110)
(define-constant no-minter-transfer-to-confirm u111)
(define-constant minter-transfer-not-confirmed-by-new-minter u112)

(define-constant this-contract (as-contract tx-sender))

(contract-call? .token-v2 add-authorized-contract this-contract)

(define-data-var minter principal tx-sender)
(define-data-var submitted-new-minter (optional principal) none)

(define-read-only (get-minter)
  (var-get minter))

(define-public (submit-minter-transfer (new-minter principal))
  (begin
    (asserts! (is-eq (get-minter) tx-sender) (err minter-transfer-not-submitted-by-minter))
    (asserts! (is-none (var-get submitted-new-minter)) (err another-minter-transfer-is-submitted))
    (var-set submitted-new-minter (some new-minter))
    (ok true)))

(define-public (cancel-minter-transfer)
  (begin
    (asserts! (is-eq (get-minter) tx-sender) (err minter-transfer-not-cancelled-by-minter))
    (asserts! (is-some (var-get submitted-new-minter)) (err no-minter-transfer-to-cancel))
    (var-set submitted-new-minter none)
    (ok true)))

(define-public (confirm-minter-transfer)
  (match (var-get submitted-new-minter)
    new-minter
    (begin
      (asserts! (is-eq (some tx-sender) (var-get submitted-new-minter)) (err minter-transfer-not-confirmed-by-new-minter))
      (var-set submitted-new-minter none)
      (var-set minter new-minter)
      (ok true))
    (err no-minter-transfer-to-confirm)))

(define-data-var remaining-tokens-to-mint uint u21000000000000)

(define-read-only (get-remaining-tokens-to-mint)
  (var-get remaining-tokens-to-mint))

(define-private (decrease-remaining-tokens-to-mint (amount uint))
  (var-set remaining-tokens-to-mint (- (get-remaining-tokens-to-mint) amount)))

(define-public (mint (amount uint) (to principal))
  (begin
    (asserts! (is-eq tx-sender (get-minter)) (err unauthorized-minter))
    (asserts! (<= amount (get-remaining-tokens-to-mint)) (err insuficcient-tokens-to-mint))
    (match (as-contract (contract-call? .token-v2 mint amount to))
      ok-mint
      (begin
        (decrease-remaining-tokens-to-mint amount)
        (ok true))
      err-mint
      (err err-mint))))