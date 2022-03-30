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

(define-data-var cooldown uint u0)

(define-map ledger {principal: principal}
                   {balance: uint,
                    last-deposit-block: uint,
                    cooldown: uint})

(define-read-only (get-owner)
    (ok (var-get contract-owner)))

(define-read-only (get-deposit (principal principal))
  (default-to {balance: u0, last-deposit-block: u0, cooldown: u0}
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
                       last-deposit-block: block-height,
                       cooldown: (if (> (var-get cooldown) (get cooldown sender-deposit))
                                     (var-get cooldown)
                                     (get cooldown sender-deposit))})
      (ok true)))

(define-public (withdraw (amount uint) (memo (optional (buff 34))))
    (let ((sender tx-sender)
          (sender-deposit (get-deposit tx-sender))
          (block-height-limit (+ (get last-deposit-block sender-deposit)
                                 (get cooldown sender-deposit))))
      (asserts! (>= (get balance sender-deposit) amount) ERR_NOT_ENOUGH_BALANCE)
      (asserts! (> block-height block-height-limit) ERR_TOO_SOON_TO_WITHDRAW)
      (try! (as-contract (contract-call? .token transfer amount this-contract sender memo)))
      (try! (contract-call? .lp-token burn amount))
      (if (is-eq amount (get balance sender-deposit))
          (map-delete ledger {principal: tx-sender})
          (map-set ledger {principal: tx-sender}
                          {balance: (- (get balance sender-deposit) amount),
                           last-deposit-block: (get last-deposit-block sender-deposit),
                           cooldown: (get cooldown sender-deposit)}))
      (ok true)))