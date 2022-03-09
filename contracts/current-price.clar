;; a smart contract for storing last fetched price and its timestamp

(define-constant ERR_CONTRACT_OWNER_ONLY (err u103))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u104))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u105))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u106))
(define-constant ERR_NOT_NEW_OWNER (err u107))

(define-data-var current-price uint u0)
(define-data-var current-timestamp (string-ascii 20) "")

(define-data-var owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-read-only (get-current-price)
  (var-get current-price))

(define-read-only (get-current-timestamp)
  (var-get current-timestamp))

(define-read-only (get-owner)
  (ok (var-get owner)))

(define-public (submit-ownership-transfer (new-owner principal))
  (begin
    (asserts! (is-eq (var-get owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-none (var-get submitted-new-owner)) ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED)
    (var-set submitted-new-owner (some new-owner))
    (ok true)))

(define-public (cancel-ownership-transfer)
  (begin
    (asserts! (is-eq (var-get owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL)
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (confirm-ownership-transfer)
  (begin
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM)
    (asserts! (is-eq (some tx-sender) (var-get submitted-new-owner)) ERR_NOT_NEW_OWNER)
    (var-set owner (unwrap-panic (var-get submitted-new-owner)))
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (update-price (new-price uint) (timestamp (string-ascii 20)))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR_CONTRACT_OWNER_ONLY)
    (var-set current-price new-price)
    (var-set current-timestamp timestamp)
    (ok true)))