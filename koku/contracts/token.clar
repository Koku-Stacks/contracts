;; token
;; sample token implementation

(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant unauthorized-minter u100)
(define-constant unauthorized-transfer u101)
(define-constant unauthorized-allowance-query u102)
(define-constant attempt-to-decrease-inexistent-allowance u103)
(define-constant unauthorized-uri-update u110)
(define-constant insuficcient-tokens-to-mint u111)

(define-constant this-contract (as-contract tx-sender))

(contract-call? .ownership-registry register-ownership this-contract)

(define-data-var token-uri (optional (string-utf8 64)) none)

(define-public (set-token-uri (new-uri (string-utf8 64)))
  (begin
    (asserts! (is-eq {owner: tx-sender} (contract-call? .ownership-registry get-owner this-contract)) (err unauthorized-uri-update))
    (ok (var-set token-uri (some new-uri)))))

(define-read-only (get-token-uri)
  (ok (var-get token-uri)))

;; this considers a max supply of 21_000_000 tokens with six decimal places
(define-fungible-token token u21000000000000)

(define-data-var remaining-tokens-to-mint uint u21000000000000)

(define-read-only (get-remaining-tokens-to-mint)
  (var-get remaining-tokens-to-mint))

(define-private (decrease-remaining-tokens-to-mint (amount uint))
  (var-set remaining-tokens-to-mint (- (get-remaining-tokens-to-mint) amount)))

(define-public (mint (amount uint) (to principal))
  (begin
    (asserts! (is-eq {owner: tx-sender} (contract-call? .ownership-registry get-owner this-contract)) (err unauthorized-minter))
    (asserts! (<= amount (get-remaining-tokens-to-mint)) (err insuficcient-tokens-to-mint))
    (match (ft-mint? token amount to)
    ok-mint
    (begin
      (decrease-remaining-tokens-to-mint amount)
      (ok true))
    err-mint
    (err err-mint))))

(define-public (burn (amount uint))
  (begin
    (ft-burn? token amount tx-sender)))

(define-map approvals {approver: principal, approvee: principal} {amount: uint})

(define-private (approved-transfer? (from principal) (amount uint))
  (match (map-get? approvals {approver: from, approvee: tx-sender})
    approved-amount-tuple
    (<= amount (get amount approved-amount-tuple))
    false))

(define-private (update-approval (from principal) (transferred-amount uint))
  (let ((approval-tuple {approver: from, approvee: tx-sender}))
    (match (map-get? approvals approval-tuple)
      approved-amount-tuple
      (map-set approvals approval-tuple {amount: (- (get amount approved-amount-tuple) transferred-amount)})
      true)))

(define-public (transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender from) (err unauthorized-transfer))
    (match (ft-transfer? token amount from to)
      ok-transfer
      (begin
        (match memo some-memo (print some-memo) 0x)
        (ok true))
      err-transfer
      (err err-transfer))))

(define-public (transfer-from (amount uint) (from principal) (to principal))
  (begin
    (asserts! (approved-transfer? from amount) (err unauthorized-transfer))
    (match (ft-transfer? token amount from to)
      ok-transfer
      (ok (update-approval from amount))
      err-transfer
      (err err-transfer))))

(define-public (approve (approvee principal) (new-approved-amount uint))
  (let ((approval-tuple {approver: tx-sender, approvee: approvee})
        (approved-amount-tuple (default-to {amount: u0} (map-get? approvals approval-tuple))))
    (map-set approvals approval-tuple {amount: (+ (get amount approved-amount-tuple) new-approved-amount)})
    (ok true)))

(define-public (decrease-allowance (approvee principal) (amount-to-decrease uint))
  (let ((approval-tuple {approver: tx-sender, approvee: approvee})
        (approved-amount-tuple-option (map-get? approvals approval-tuple)))
    (asserts! (is-some approved-amount-tuple-option) (err attempt-to-decrease-inexistent-allowance))
    (let ((approved-amount-tuple (default-to {amount: u0} approved-amount-tuple-option))
          (approved-amount (get amount approved-amount-tuple))
          (new-approved-amount (if (>= amount-to-decrease approved-amount)
                                   u0
                                   (- approved-amount amount-to-decrease))))
      (map-set approvals approval-tuple {amount: new-approved-amount})
      (ok true))))

(define-read-only (allowance (approver principal) (approvee principal))
  (begin
    (asserts! (or (is-eq tx-sender approver)
                  (is-eq tx-sender approvee)) (err unauthorized-allowance-query))
    (ok (get amount (default-to {amount: u0} (map-get? approvals {approver: approver, approvee: approvee}))))))

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