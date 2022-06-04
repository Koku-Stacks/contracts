(define-constant unauthorized-transfer u101)
(define-constant unauthorized-allowance-query u102)
(define-constant attempt-to-decrease-inexistent-allowance u103)

(define-map approvals {approver: principal, approvee: principal} {amount: uint})

(define-public (approve (approvee principal) (new-approved-amount uint))
  (let ((approval-tuple {approver: tx-sender, approvee: approvee})
        (approved-amount-tuple (default-to {amount: u0} (map-get? approvals approval-tuple))))
    (map-set approvals approval-tuple {amount: (+ (get amount approved-amount-tuple) new-approved-amount)})
    (ok true)))

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

(define-public (transfer-from (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
  (begin
    (asserts! (approved-transfer? from amount) (err unauthorized-transfer))
    (match (as-contract (contract-call? .token transfer amount from to memo))
      ok-transfer
      (ok (update-approval from amount))
      err-transfer
      (err err-transfer))))

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

(define-read-only (get-allowance (approver principal) (approvee principal))
  (begin
    (asserts! (or (is-eq tx-sender approver)
                  (is-eq tx-sender approvee)) (err unauthorized-allowance-query))
    (ok (get amount (default-to {amount: u0} (map-get? approvals {approver: approver, approvee: approvee}))))))