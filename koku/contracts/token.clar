;; token
;; sample token implementation

(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant unauthorized-minter u100)
(define-constant unauthorized-transfer u101)
(define-constant unauthorized-allowance-query u102)
(define-constant attempt-to-decrease-inexistent-allowance u103)
(define-constant unauthorized-ownership-transfer u104)
(define-constant attempt-to-transfer-ownership-to-owner u105)
(define-constant no-ownership-transfer-submitted u106)
(define-constant unauthorized-ownership-transfer-confirmation u107)
(define-constant unauthorized-ownership-transfer-cancellation u108)
(define-constant previous-ownership-transfer-submission-not-cancelled u109)
(define-constant unauthorized-uri-update u110)

(define-data-var contract-owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-read-only (get-contract-owner)
  (var-get contract-owner))

(define-public (submit-ownership-transfer (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (get-contract-owner)) (err unauthorized-ownership-transfer))
    (asserts! (not (is-eq new-owner (get-contract-owner))) (err attempt-to-transfer-ownership-to-owner))
    (asserts! (is-none (var-get submitted-new-owner)) (err previous-ownership-transfer-submission-not-cancelled))
    (var-set submitted-new-owner (some new-owner))
    (ok true)))

(define-public (cancel-ownership-transfer)
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err unauthorized-ownership-transfer-cancellation))
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (confirm-ownership-transfer)
  (begin
    (asserts! (is-some (var-get submitted-new-owner)) (err no-ownership-transfer-submitted))
    (asserts! (is-eq (some tx-sender) (var-get submitted-new-owner)) (err unauthorized-ownership-transfer-confirmation))
    (var-set contract-owner (unwrap! (var-get submitted-new-owner) (err no-ownership-transfer-submitted)))
    (var-set submitted-new-owner none)
    (ok true)))

(define-data-var token-uri (optional (string-utf8 64)) none)

(define-public (set-token-uri (new-uri (string-utf8 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err unauthorized-uri-update))
    (ok (var-set token-uri (some new-uri)))))

(define-read-only (get-token-uri)
  (ok (var-get token-uri)))

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
  (ok u2))

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance token account)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply token)))