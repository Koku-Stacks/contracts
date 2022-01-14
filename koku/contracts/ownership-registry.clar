(define-constant ownership-already-registered u100)
(define-constant ownership-not-registered u101)
(define-constant ownership-transfer-not-submitted-by-owner u102)
(define-constant another-ownership-transfer-is-submitted u103)
(define-constant ownership-transfer-not-cancelled-by-owner u104)
(define-constant no-ownership-transfer-to-cancel u105)
(define-constant no-ownership-transfer-to-confirm u106)
(define-constant ownership-transfer-not-confirmed-by-new-owner u107)

(define-map ownership-relation {owned: principal} {owner: principal})

(define-read-only (get-owner (owned principal))
  (default-to {owner: owned}
              (map-get? ownership-relation {owned: owned})))

(define-public (register-ownership (owned principal))
  (begin
    (asserts! (is-none (map-get? ownership-relation {owned: owned})) (err ownership-already-registered))
    (map-insert ownership-relation {owned: owned} {owner: tx-sender})
    (ok true)))

(define-map ownership-transfer-submissions {owned: principal} {new-owner: principal})

(define-public (submit-ownership-transfer (owned principal) (new-owner principal))
  (let ((opt-owner (map-get? ownership-relation {owned: owned})))
    (asserts! (is-some opt-owner) (err ownership-not-registered))
    (asserts! (is-eq (some {owner: tx-sender}) opt-owner) (err ownership-transfer-not-submitted-by-owner))
    (asserts! (is-none (map-get? ownership-transfer-submissions {owned: owned})) (err another-ownership-transfer-is-submitted))
    (map-insert ownership-transfer-submissions {owned: owned} {new-owner: new-owner})
    (ok true)))

(define-public (cancel-ownership-transfer (owned principal))
  (let ((opt-owner (map-get? ownership-relation {owned: owned})))
    (asserts! (is-some opt-owner) (err ownership-not-registered))
    (asserts! (is-eq (some {owner: tx-sender}) opt-owner) (err ownership-transfer-not-cancelled-by-owner))
    (asserts! (is-some (map-get? ownership-transfer-submissions {owned: owned})) (err no-ownership-transfer-to-cancel))
    (map-delete ownership-transfer-submissions {owned: owned})
    (ok true)))

(define-public (confirm-ownership-transfer (owned principal))
  (let ((opt-owner (map-get? ownership-relation {owned: owned}))
        (opt-new-owner (map-get? ownership-transfer-submissions {owned: owned})))
    (asserts! (is-some opt-owner) (err ownership-not-registered))
    (asserts! (is-some opt-new-owner) (err no-ownership-transfer-to-confirm))
    (asserts! (is-eq (some {new-owner: tx-sender}) opt-new-owner) (err ownership-transfer-not-confirmed-by-new-owner))
    (map-set ownership-relation {owned: owned} {owner: tx-sender})
    (map-delete ownership-transfer-submissions {owned: owned})
    (ok true)))