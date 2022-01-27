(define-constant unauthorized-minter u100)
(define-constant insuficcient-tokens-to-mint u101)
(define-constant ownership-transfer-not-submitted-by-owner u107)
(define-constant another-ownership-transfer-is-submitted u108)
(define-constant ownership-transfer-not-cancelled-by-owner u109)
(define-constant no-ownership-transfer-to-cancel u110)
(define-constant no-ownership-transfer-to-confirm u111)
(define-constant ownership-transfer-not-confirmed-by-new-owner u112)

(define-constant this-contract (as-contract tx-sender))

(contract-call? .token-v2 add-authorized-contract this-contract)

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

(define-data-var remaining-tokens-to-mint uint u21000000000000)

(define-read-only (get-remaining-tokens-to-mint)
  (var-get remaining-tokens-to-mint))

(define-private (decrease-remaining-tokens-to-mint (amount uint))
  (var-set remaining-tokens-to-mint (- (get-remaining-tokens-to-mint) amount)))

(define-public (mint (amount uint) (to principal))
  (begin
    (asserts! (is-eq tx-sender (get-owner)) (err unauthorized-minter))
    (asserts! (<= amount (get-remaining-tokens-to-mint)) (err insuficcient-tokens-to-mint))
    (match (as-contract (contract-call? .token-v2 mint amount to))
      ok-mint
      (begin
        (decrease-remaining-tokens-to-mint amount)
        (ok true))
      err-mint
      (err err-mint))))