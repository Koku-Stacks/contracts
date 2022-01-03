;; token
;; sample token implementation

(impl-trait .sip-010-v0a.ft-trait)

(define-constant unauthorized-minter u100)
(define-constant unauthorized-transfer u101)
(define-constant unauthorized-allowance-query u102)
(define-constant attempt-to-decrease-inexistent-allowance u103)
(define-constant unauthorized-ownership-transfer u104)
(define-constant attempt-to-transfer-ownership-to-owner u105)

(define-data-var contract-owner principal tx-sender)

(define-read-only (get-contract-owner)
  (var-get contract-owner))

(define-public (transfer-ownership (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err unauthorized-ownership-transfer))
    (asserts! (not (is-eq new-owner (var-get contract-owner))) (err attempt-to-transfer-ownership-to-owner))
    (var-set contract-owner new-owner)
    (ok true)))

(define-fungible-token token)

(define-public (mint (amount uint) (to principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err unauthorized-minter))
    (ft-mint? token amount to)))

(define-public (burn (amount uint))
  (begin
    (ft-burn? token amount tx-sender)))

(define-map approvals {approver: principal, approvee: principal} {amount: uint})

(define-private (approved-transfer? (from principal) (amount uint))
  (or (is-eq tx-sender from)
      (match (map-get? approvals {approver: from, approvee: tx-sender})
        approved-amount-tuple
        (<= amount (get amount approved-amount-tuple))
        false)))

(define-private (update-approval (from principal) (transferred-amount uint))
  (let ((approval-tuple {approver: from, approvee: tx-sender}))
    (match (map-get? approvals approval-tuple)
      approved-amount-tuple
      (map-set approvals approval-tuple {amount: (- (get amount approved-amount-tuple) transferred-amount)})
      true)))

(define-public (transfer (amount uint) (from principal) (to principal))
  (begin
    (asserts! (approved-transfer? from amount) (err unauthorized-transfer))
    (match (ft-transfer? token amount from to)
      ok-transfer
      (if (not (is-eq from tx-sender))
        (begin
          (update-approval from amount)
          (ok true))
        (ok true))
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
  (ok u2))

(define-read-only (get-balance-of (account principal))
  (ok (ft-get-balance token account)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply token)))

(define-read-only (get-token-uri)
  (ok (some u"www.token.com")))