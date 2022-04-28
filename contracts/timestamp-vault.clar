(impl-trait .owner-trait.owner-trait)

(define-constant ERR_NOT_AUTHORIZED (err u1000))
(define-constant ERR_NOT_NEW_OWNER (err u2000))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u2001))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u2002))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u2003))
(define-constant ERR_NOT_ENOUGH_BALANCE (err u3001))
(define-constant ERR_TOO_SOON_TO_WITHDRAW (err u4000)) ;; FIXME devise appropriate error code for this according to ERRORS.md

(define-constant this-contract (as-contract tx-sender))

(define-data-var contract-owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-data-var cooldown uint u0) ;; in minutes

(define-map ledger {principal: principal}
                   {balance: uint,
                    last-deposit-timestamp: uint, ;; UNIX epoch based, in seconds
                    cooldown: uint})

(define-read-only (get-timestamp)
  (default-to u0 (get-block-info? time (- block-height u1))))

(define-read-only (cooldown-to-seconds (c uint))
  (* u60 c))

(define-read-only (get-owner)
    (ok (var-get contract-owner)))

(define-read-only (get-deposit (principal principal))
  (default-to {balance: u0, last-deposit-timestamp: u0, cooldown: u0}
              (map-get? ledger {principal: principal})))

(define-read-only (get-balance (principal principal))
    (get balance (get-deposit principal)))

(define-public (set-cooldown (new-cooldown uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (var-set cooldown new-cooldown)
    (ok true)))

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

(define-public (deposit (amount uint) (memo (optional (buff 34))))
    (let ((sender-deposit (get-deposit tx-sender)))
      (try! (contract-call? .token transfer amount tx-sender this-contract memo))
      (try! (contract-call? .lp-token mint amount tx-sender))
      (map-set ledger {principal: tx-sender}
                      {balance: (+ (get balance sender-deposit) amount),
                       last-deposit-timestamp: (get-timestamp),
                       cooldown: (if (> (var-get cooldown) (get cooldown sender-deposit))
                                     (var-get cooldown)
                                     (get cooldown sender-deposit))})
      (ok true)))

(define-public (withdraw (amount uint) (memo (optional (buff 34))))
    (let ((sender tx-sender)
          (sender-deposit (get-deposit tx-sender))
          (timestamp-limit (+ (get last-deposit-timestamp sender-deposit)
                              (cooldown-to-seconds (get cooldown sender-deposit)))))
      (asserts! (>= (get balance sender-deposit) amount) ERR_NOT_ENOUGH_BALANCE)
      (asserts! (>= (get-timestamp) timestamp-limit) ERR_TOO_SOON_TO_WITHDRAW)
      (try! (as-contract (contract-call? .token transfer amount this-contract sender memo)))
      (try! (contract-call? .lp-token burn amount))
      (if (is-eq amount (get balance sender-deposit))
          (map-delete ledger {principal: tx-sender})
          (map-set ledger {principal: tx-sender}
                          {balance: (- (get balance sender-deposit) amount),
                           last-deposit-timestamp: (get last-deposit-timestamp sender-deposit),
                           cooldown: (get cooldown sender-deposit)}))
      (ok true)))