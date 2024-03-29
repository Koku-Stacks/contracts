(impl-trait .owner-trait.owner-trait)

(use-trait sip-010-token .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_NOT_AUTHORIZED (err u1000))
(define-constant ERR_NOT_NEW_OWNER (err u2000))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u2001))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u2002))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u2003))
(define-constant ERR_POSITION_NOT_FOUND (err u3000)) ;; FIXME adjust according to ERRORS.md and update it
(define-constant ERR_POSITION_OWNER_ONLY (err u3001)) ;; FIXME adjust according to ERRORS.md and update it
(define-constant ERR_TOO_SOON_TO_UPDATE_POSITION (err u3002)) ;; FIXME adjust according to ERRORS.md and update it
(define-constant ERR_UNREACHABLE u3003) ;; FIXME adjust according to ERRORS.md and update it
(define-constant ERR_CONTRACT_ALREADY_INITIALIZED (err u3004)) ;; FIXME adjust according to ERRORS.md and update it
(define-constant ERR_CONTRACT_NOT_INITIALIZED (err u3005)) ;; FIXME adjust according to ERRORS.md and update it
(define-constant ERR_TOKEN_NOT_AUTHORIZED (err u3006)) ;; FIXME adjust according to ERRORS.md and update it

;; FIXME adapt to final chunk size
(define-constant INDEX_CHUNK_SIZE
;; ref-2
u20
)

;; FIXME adjust to final update cooldown value
(define-constant POSITION_UPDATE_COOLDOWN u600) ;; seconds, 600 = 1 block. This is the minimal possible cooldown

;; FIXME adjust to proper final value
(define-constant POSITION_MAX_DURATION u10) ;; number of days a position can be held

(define-constant ORDER_TYPE_LONG u1)
(define-constant ORDER_TYPE_SHORT u2)

(define-constant STATUS_LIQUIDATED u1)
(define-constant STATUS_ACTIVE u2)
(define-constant STATUS_CLOSED u3)

(define-constant POSITION_IN_LOSS -1)
(define-constant POSITION_NEUTRAL 0)
(define-constant POSITION_IN_PROFIT 1)

(define-constant this-contract (as-contract tx-sender))

;; FIXME adapt to final chunk size
(define-constant BASE_INDICES_SHIFT_LIST
  (list
;; ref-3
u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19 u20
))

(define-map indexed-positions {index: uint} {sender: principal,
                                             size: uint,
                                             order-type: uint,
                                             current-pnl: uint,
                                             updated-on-timestamp: uint,
                                             status: uint})

(define-map stx-reserve {principal: principal} {stx-amount: uint})

(define-data-var least-unused-index uint u1)

(define-data-var last-updated-index uint u0)
(define-data-var last-updated-chunk uint u0)

(define-data-var liquidation-fee uint u1) ;; in USDA
(define-data-var trading-fee uint u1) ;; in USDA
(define-data-var collateral uint u1) ;; in USDA
(define-data-var gas-fee uint u1) ;; in STX

;; this is not related to an actual token before initialization
(define-data-var authorized-sip-010-token principal tx-sender)

(define-data-var is-initialized bool false)

(define-data-var contract-owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-read-only (get-authorized-sip-010-token)
  (begin
    (asserts! (var-get is-initialized) ERR_CONTRACT_NOT_INITIALIZED)
    (ok (var-get authorized-sip-010-token))))

(define-read-only (get-owner)
    (ok (var-get contract-owner)))

(define-read-only (get-stx-reserve (principal principal))
  (get stx-amount
       (default-to {stx-amount: u0}
                   (map-get? stx-reserve {principal: principal}))))

(define-read-only (calculate-current-chunk-indices-step (base-index-shift uint))
  (+ base-index-shift (* INDEX_CHUNK_SIZE (var-get last-updated-chunk))))

(define-read-only (calculate-current-chunk-indices)
  (map calculate-current-chunk-indices-step BASE_INDICES_SHIFT_LIST))

(define-read-only (unwrap-helper (ok-uint (response uint uint)))
  (unwrap! ok-uint ERR_UNREACHABLE))

(define-read-only (get-current-timestamp)
  (default-to u0 (get-block-info? time (- block-height u1))))

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

(define-public (insert-position (size uint)
                                (order-type uint)
                                (token <sip-010-token>))
  (let ((total-gas-fee (* POSITION_MAX_DURATION (var-get gas-fee)))
        (position-index (var-get least-unused-index)))
    (asserts! (var-get is-initialized) ERR_CONTRACT_NOT_INITIALIZED)
    (asserts! (is-eq (contract-of token)
                     (var-get authorized-sip-010-token)) ERR_TOKEN_NOT_AUTHORIZED)
    (map-insert indexed-positions {index: position-index}
                                  {sender: tx-sender,
                                   size: size,
                                   order-type: order-type,
                                   current-pnl: u0,
                                   updated-on-timestamp: (get-current-timestamp),
                                   status: STATUS_ACTIVE})
    (var-set least-unused-index (+ (var-get least-unused-index) u1))
    ;; FIXME provisory call
    (try! (contract-call? token transfer (+ (var-get liquidation-fee)
                                            (var-get trading-fee)
                                            (var-get collateral))
                                tx-sender this-contract none))
    (try! (stx-transfer? total-gas-fee tx-sender this-contract))
    (map-set stx-reserve {principal: tx-sender}
                         {stx-amount: (+ (get-stx-reserve tx-sender)
                                         total-gas-fee)})
    (ok position-index)))

(define-read-only (get-position (index uint))
  (ok (unwrap! (map-get? indexed-positions {index: index})
               ERR_POSITION_NOT_FOUND)))

(define-read-only (get-sender (index uint))
  (ok (get sender (try! (get-position index)))))

(define-read-only (get-size (index uint))
  (ok (get size (try! (get-position index)))))

(define-read-only (get-updated-on-timestamp (index uint))
  (ok (get updated-on-timestamp (try! (get-position index)))))

(define-read-only (get-order-type (index uint))
  (ok (get order-type (try! (get-position index)))))

(define-read-only (get-pnl (index uint))
  (ok (get current-pnl (try! (get-position index)))))

(define-read-only (get-status (index uint))
  (ok (get status (try! (get-position index)))))

(define-read-only (calculate-funding-fee (index uint))
  ;; FIXME mockup for now, but it should interact with current-price.clar and position volume/size
  (begin
    u0))

(define-read-only (position-profit-status (index uint))
  ;; FIXME mockup for now, but it probably should interact with current-price.clar in order to verify this
  (begin
    POSITION_NEUTRAL))

(define-read-only (position-is-eligible-for-update (index uint))
  (let ((last-update-timestamp (try! (get-updated-on-timestamp index))))
    (ok (> (get-current-timestamp)
           (+ last-update-timestamp POSITION_UPDATE_COOLDOWN)))))

(define-public (update-position (index uint))
  (begin
    (asserts! (var-get is-initialized) ERR_CONTRACT_NOT_INITIALIZED)
    (let ((position (try! (get-position index)))
          (position-owner (get sender position)))
      (asserts! (is-eq tx-sender position-owner) ERR_POSITION_OWNER_ONLY)
      (if (try! (position-is-eligible-for-update index))
        (begin
          (map-set indexed-positions {index: index}
                                     {sender: (get sender position),
                                      size: (get size position),
                                      order-type: (get order-type position),
                                      current-pnl: (get current-pnl position),
                                      updated-on-timestamp: (get-current-timestamp),
                                      status: (get status position)})
          (ok true))
        ERR_TOO_SOON_TO_UPDATE_POSITION))))

;; We are keeping this for now to measure gas costs at some point in the future against a simpler implementation which is going to be used for now
;; (define-private (position-maintenance (index uint))
;;   (let ((position (try! (get-position index)))
;;         (position-sender (get sender position)))
;;     (if (try! (position-is-eligible-for-update index))
;;       ;; position might be updated
;;       (if (is-eq position-sender tx-sender)
;;         ;; no need to charge for his own position during batch update nor to verify funds for fees
;;         (begin
;;           (map-set indexed-positions {index: index}
;;                                      {sender: (get sender position),
;;                                       size: (get size position),
;;                                       order-type: (get order-type position),
;;                                       current-pnl: (get current-pnl position),
;;                                       updated-on-timestamp: (get-current-timestamp),
;;                                       status: (get status position)})
;;           (ok u0))
;;         ;; position-sender is not tx-sender: position is going to be updated only if position-sender has enough funds
;;         (if (>= (get-stx-reserve position-sender)
;;                 (var-get gas-fee))
;;           ;; position sender has enough funds: update position and charge for it
;;           (begin
;;             (map-set indexed-positions {index: index}
;;                                        {sender: (get sender position),
;;                                         size: (get size position),
;;                                         order-type: (get order-type position),
;;                                         current-pnl: (get current-pnl position),
;;                                         updated-on-timestamp: (get-current-timestamp),
;;                                         status: (get status position)})
;;             (map-set stx-reserve {principal: position-sender}
;;                                  {stx-amount: (- (get-stx-reserve position-sender)
;;                                                  (var-get gas-fee))})
;;             ;; charge for others' positions during batch update
;;             (ok u1))
;;           ;; position sender does not have enough funds: keep the position as it is
;;           (ok u0)))
;;       ;; no need to charge for positions not eligible for update
;;       (ok u0))))

(define-private (position-maintenance (index uint))
  (let ((position (try! (get-position index)))
        (position-sender (get sender position)))
    (if (and (try! (position-is-eligible-for-update index))
             (>= (get-stx-reserve position-sender)
                 (var-get gas-fee)))
      (begin
        (map-set indexed-positions {index: index}
                                   {sender: (get sender position),
                                    size: (get size position),
                                    order-type: (get order-type position),
                                    current-pnl: (get current-pnl position),
                                    updated-on-timestamp: (get-current-timestamp),
                                    status: (get status position)})
        (map-set stx-reserve {principal: position-sender}
                             {stx-amount: (- (get-stx-reserve position-sender)
                                             (var-get gas-fee))})
        (ok u1))
      (ok u0))))

(define-public (batch-position-maintenance)
  (begin
    (asserts! (var-get is-initialized) ERR_CONTRACT_NOT_INITIALIZED)
    (let ((maintainer tx-sender)
          (chunk-indices (calculate-current-chunk-indices))
          (charge-status-responses (map position-maintenance chunk-indices))
          (charge-statuses (map unwrap-helper charge-status-responses))
          (chargeable-updates-performed (fold + charge-statuses u0)))
      (if (> chargeable-updates-performed u0)
        (begin
          ;; maintainer reward
          (try! (as-contract (stx-transfer? (* (var-get gas-fee)
                                               chargeable-updates-performed)
                                            this-contract maintainer)))
          (var-set last-updated-chunk
               (+ u1 (var-get last-updated-chunk)))
          (var-set last-updated-index
               (+ INDEX_CHUNK_SIZE (var-get last-updated-index)))
          (ok chargeable-updates-performed))
      (ok u0) ))))

(define-public (initialize (token <sip-010-token>))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (asserts! (not (var-get is-initialized)) ERR_CONTRACT_ALREADY_INITIALIZED)
    (var-set authorized-sip-010-token (contract-of token))
    (var-set is-initialized true)
    (ok true)))