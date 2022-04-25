(define-constant ERR_POSITION_NOT_FOUND (err u1000)) ;; FIXME adjust according to ERRORS.md and update it
(define-constant ERR_POSITION_OWNER_ONLY (err u1001)) ;; FIXME adjust according to ERRORS.md and update it

;; FIXME adapt to final chunk size
(define-constant INDEX_CHUNK_SIZE u100)

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
     u1  u2  u3  u4  u5  u6  u7  u8  u9  u10
    u11 u12 u13 u14 u15 u16 u17 u18 u19  u20
    u21 u22 u23 u24 u25 u26 u27 u28 u29  u30
    u31 u32 u33 u34 u35 u36 u37 u38 u39  u40
    u41 u42 u43 u44 u45 u46 u47 u48 u49  u50
    u51 u52 u53 u54 u55 u56 u57 u58 u59  u60
    u61 u62 u63 u64 u65 u66 u67 u68 u69  u70
    u71 u72 u73 u74 u75 u76 u77 u78 u79  u80
    u81 u82 u83 u84 u85 u86 u87 u88 u89  u90
    u91 u92 u93 u94 u95 u96 u97 u98 u99 u100))

(define-map indexed-positions {index: uint} {sender: principal,
                                             size: uint,
                                             timestamp: uint,
                                             order-type: uint,
                                             current-pnl: uint,
                                             updated-on-block: uint,
                                             status: uint})

(define-data-var least-unused-index uint u1)

(define-data-var last-updated-index uint u0)
(define-data-var last-updated-chunk uint u0)

(define-data-var liquidation-fee uint u0) ;; in USDA
(define-data-var trading-fee uint u0) ;; in USDA
(define-data-var collateral uint u0) ;; in USDA
(define-data-var gas-fee uint u0) ;; in STX
(define-data-var executor-tip uint u0) ;; in STX

(define-read-only (get-current-timestamp)
  (default-to u0 (get-block-info? time (- block-height u1))))

(define-read-only (calculate-current-chunk-indices-step (base-index-shift uint))
  (+ base-index-shift (* INDEX_CHUNK_SIZE (var-get last-updated-chunk))))

(define-read-only (calculate-current-chunk-indices)
  (map calculate-current-chunk-indices-step BASE_INDICES_SHIFT_LIST))


(define-private (increase-last-updated-chunk)
  (var-set last-updated-chunk
           (+ u1
              (var-get last-updated-chunk))))

(define-private (prepare-for-next-chunk-update)
  (begin
    (increase-last-updated-chunk)
    (var-set last-updated-index
             (+ (var-get last-updated-index) INDEX_CHUNK_SIZE))))

;; FIXME I suppose this function should instead interact with vault, right?
(define-private (transfer-usda (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
  ;; FIXME commented for now as we are waiting for a PR on clarinet side
  ;; (contract-call? 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.usda-token
  ;;                 transfer
  ;;                 amount
  ;;                 from to memo)
  ;; FIXME the following mocked up code is just complex enough to satisfy type checker
  (if (is-eq amount u0)
      (ok true)
      (err u1)))

(define-public (insert-position (size uint)
                                (order-type uint))
  (begin
    (map-insert indexed-positions {index: (var-get least-unused-index)}
                                  {sender: tx-sender,
                                   size: size,
                                   timestamp: (get-current-timestamp),
                                   order-type: order-type,
                                   current-pnl: u0,
                                   updated-on-block: block-height,
                                   status: STATUS_ACTIVE})
    (var-set least-unused-index (+ (var-get least-unused-index) u1))
    (try! (transfer-usda (+ (var-get liquidation-fee)
                            (var-get trading-fee)
                            (var-get collateral))
                         tx-sender this-contract none))
    (try! (stx-transfer? (var-get gas-fee) tx-sender this-contract))
    (ok true)))

(define-read-only (get-position (index uint))
  (map-get? indexed-positions {index: index}))

(define-read-only (get-sender (index uint) (default principal))
  (get sender (unwrap! (get-position index) default)))

(define-read-only (get-size (index uint) (default uint))
  (get size (unwrap! (get-position index) default)))

(define-read-only (get-timestamp (index uint) (default uint))
  (get timestamp (unwrap! (get-position index) default)))

(define-read-only (get-order-type (index uint) (default uint))
  (get order-type (unwrap! (get-position index) default)))

(define-read-only (get-pnl (index uint) (default uint))
  (get current-pnl (unwrap! (get-position index) default)))

(define-read-only (get-block-id-update (index uint) (default uint))
  (get updated-on-block (unwrap! (get-position index) default)))

(define-read-only (get-status (index uint) (default uint))
  (get status (unwrap! (get-position index) default)))

(define-read-only (calculate-funding-fee (index uint))
  ;; FIXME mockup for now, but it should interact with current-price.clar and position volume/size
  (begin
    u0))

(define-read-only (position-profit-status (index uint))
  ;; FIXME mockup for now, but it probably should interact with current-price.clar in order to verify this
  (begin
    POSITION_NEUTRAL))

(define-private (position-maintenance (index uint))
  (let ((position (unwrap! (get-position index) ERR_POSITION_NOT_FOUND))
        (position-sender (get sender position))
        (profit-status (position-profit-status index)))
    (map-set indexed-positions {index: index}
                               {sender: (get sender position),
                                size: (get size position),
                                timestamp: (get-current-timestamp),
                                order-type: (get order-type position),
                                current-pnl: (get current-pnl position),
                                updated-on-block: block-height,
                                status: (get status position)})
      (ok true)))