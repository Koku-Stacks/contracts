(define-constant ERR_NOT_AUTHORIZED (err u1000))
(define-constant ERR_NOT_NEW_OWNER (err u2000))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u2001))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u2002))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u2003))
(define-constant ERR_TOO_SOON_TO_WITHDRAW (err u4000)) ;; FIXME devise appropriate error code for this according to ERRORS.md

(define-data-var contract-owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-data-var cooldown uint u0) ;; in minutes

(define-map cooldown-manager {principal: principal}
                             {last-deposit-timestamp: uint,
                              cooldown: uint}) ;; UNIX epoch based, in seconds

(define-read-only (get-cooldown-info (principal principal))
  (default-to {last-deposit-timestamp: u0,
               cooldown: u0} (map-get? cooldown-manager {principal: principal})))

(define-read-only (get-timestamp)
  (default-to u0 (get-block-info? time (- block-height u1))))

(define-read-only (cooldown-to-seconds (c uint))
  (* u60 c))

(define-public (submit-ownership-transfer (new-owner principal))
  (begin
    (asserts! (is-eq (var-get contract-owner) tx-sender) ERR_NOT_AUTHORIZED)
    (asserts! (is-none (var-get submitted-new-owner)) ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED)
    (var-set submitted-new-owner (some new-owner))
    (ok true)))

(define-public (cancel-ownership-transfer)
  (begin
    (asserts! (is-eq (var-get contract-owner) tx-sender) ERR_NOT_AUTHORIZED)
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL)
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (confirm-ownership-transfer)
  (begin
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM)
    (asserts! (is-eq (some tx-sender) (var-get submitted-new-owner)) ERR_NOT_NEW_OWNER)
    (var-set contract-owner (unwrap-panic (var-get submitted-new-owner)))
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (set-cooldown (new-cooldown uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (var-set cooldown new-cooldown)
    (ok true)))

(define-public (deposit (amount uint) (memo (optional (buff 34))))
  (let ((cooldown-sender-info (get-cooldown-info tx-sender)))
    (try! (contract-call? .vault deposit amount memo))
    (map-set cooldown-manager {principal: tx-sender}
                              {last-deposit-timestamp: (get-timestamp),
                               cooldown: (if (> (var-get cooldown)
                                                (get cooldown cooldown-sender-info))
                                             (var-get cooldown)
                                             (get cooldown cooldown-sender-info))})
    (ok true)))

(define-public (withdraw (amount uint) (memo (optional (buff 34))))
  (let ((cooldown-sender-info (get-cooldown-info tx-sender))
        (timestamp-limit (+ (get last-deposit-timestamp cooldown-sender-info)
                            (cooldown-to-seconds (get cooldown cooldown-sender-info)))))
    (asserts! (> (get-timestamp) timestamp-limit) ERR_TOO_SOON_TO_WITHDRAW)
    (try! (contract-call? .vault withdraw amount memo))
    (ok true)))