(define-constant unauthorized-minter u100)
(define-constant minter-transfer-not-submitted-by-minter u107)
(define-constant another-minter-transfer-is-submitted u108)
(define-constant minter-transfer-not-cancelled-by-minter u109)
(define-constant no-minter-transfer-to-cancel u110)
(define-constant no-minter-transfer-to-confirm u111)
(define-constant minter-transfer-not-confirmed-by-new-minter u112)

(define-constant this-contract (as-contract tx-sender))

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

(define-read-only (get-remaining-tokens-to-mint)
  (contract-call? .token-v2 get-remaining-tokens-to-mint))

(define-public (mint (amount uint) (to principal))
  (begin
    (asserts! (is-eq tx-sender (get-minter)) (err unauthorized-minter))
    (match (as-contract (contract-call? .token-v2 mint amount to))
      ok-mint
      (ok true)
      err-mint
      (err err-mint))))
