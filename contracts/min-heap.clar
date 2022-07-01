(define-constant ERR_EMPTY_HEAP (err u4000)) ;; FIXME adjust error code according to ERRORS.md
(define-constant ERR_FULL_HEAP (err u4001)) ;; FIXME adjust error code according to ERRORS.md
(define-constant ERR_NOT_AUTHORIZED (err u1000))

;; indices for a heap of height 4
(define-constant HEAP_INDICES
  (list
    u1
    u2  u3
    u4  u5  u6  u7
    u8  u9 u10 u11 u12 u13 u14 u15
   u16 u17 u18 u19 u20 u21 u22 u23 u24 u25 u26 u27 u28 u29 u30 u31))

(define-constant PRIORITY_INDEX u1)

(define-constant MAX_HEAP_SIZE u31)

(define-map heap {index: uint}
                 {price: uint,
                  value: uint})

(define-data-var heap-size uint u0)
(define-data-var authorized-order-book principal tx-sender)
(define-data-var contract-owner principal tx-sender)

(define-public (set-authorized-order-book (order-book principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (var-set authorized-order-book order-book)
    (ok true)))

(define-read-only (get-position (index uint))
  (default-to {price: u0, value: u0} (map-get? heap {index: index})))

(define-read-only (parent-index (index uint))
  (/ index u2))

(define-read-only (left-child-index (index uint))
  (* index u2))

(define-read-only (right-child-index (index uint))
  (+ (* index u2) u1))

(define-read-only (priority-position)
  (begin
    (asserts! (>= (var-get heap-size) u1) ERR_EMPTY_HEAP)
    (ok (get-position PRIORITY_INDEX))))

(define-private (min-heapify-core (index uint))
  (let ((left-index
         (left-child-index index))
        (left-position
         (get-position left-index))
        (right-index
         (right-child-index index))
        (right-position
         (get-position right-index))
        (smallest-initial
         index)
        (smallest-initial-position
         (get-position smallest-initial))
        (smallest-against-left
         (if (and (<= left-index
                      (var-get heap-size))
                  (<= (get price left-position)
                      (get price smallest-initial-position)))
            left-index
            smallest-initial))
        (smallest-against-left-position
         (get-position smallest-against-left))
        (smallest
         (if (and (<= right-index
                      (var-get heap-size))
                  (<= (get price right-position)
                      (get price smallest-against-left-position)))
            right-index
            smallest-against-left))
        (smallest-position
         (get-position smallest)))
    (if (not (is-eq smallest smallest-initial))
      (begin
        (map-set heap {index: smallest-initial} smallest-position)
        (map-set heap {index: smallest} smallest-initial-position)
        smallest)
      u0)))

(define-private (min-heapify-depth-1 (index uint))
  (let ((return-index (min-heapify-core index)))
    (if (not (is-eq return-index u0))
      (min-heapify-depth-2 return-index)
      u0)))

(define-private (min-heapify-depth-2 (index uint))
  (let ((return-index (min-heapify-core index)))
    (if (not (is-eq return-index u0))
      (min-heapify-depth-3 return-index)
      u0)))

(define-private (min-heapify-depth-3 (index uint))
  (let ((return-index (min-heapify-core index)))
    (if (not (is-eq return-index u0))
      (min-heapify-depth-4 return-index)
      u0)))

(define-private (min-heapify-depth-4 (index uint))
  (min-heapify-core index))

(define-private (heap-move-up-core (index uint))
  (let ((index-position (get-position index))
        (p-index (parent-index index))
        (p-index-position (get-position p-index)))
    (if (and (> index PRIORITY_INDEX)
             (<= (get price index-position)
                 (get price p-index-position)))
      (begin
        (map-set heap {index: index} p-index-position)
        (map-set heap {index: p-index} index-position)
        p-index)
      u0)))

(define-private (heap-move-up-depth-5 (index uint))
  (let ((return-index (heap-move-up-core index)))
    (if (not (is-eq return-index u0))
      (heap-move-up-depth-4 return-index)
      u0)))

(define-private (heap-move-up-depth-4 (index uint))
  (let ((return-index (heap-move-up-core index)))
    (if (not (is-eq return-index u0))
      (heap-move-up-depth-3 return-index)
      u0)))

(define-private (heap-move-up-depth-3 (index uint))
  (let ((return-index (heap-move-up-core index)))
    (if (not (is-eq return-index u0))
      (heap-move-up-depth-2 return-index)
      u0)))

(define-private (heap-move-up-depth-2 (index uint))
  (heap-move-up-core index))

(define-private (populate-heap-step (index uint))
  (map-insert heap {index: index} {price: u0, value: u0}))

(define-private (populate-heap)
  (map populate-heap-step HEAP_INDICES))

(define-public (heap-extract-min)
  (begin
    (asserts! (>= (var-get heap-size) u1) ERR_EMPTY_HEAP)
    (let ((min-position (get-position PRIORITY_INDEX))
          (last-leaf-position (get-position (var-get heap-size))))
      (map-set heap {index: PRIORITY_INDEX} last-leaf-position)
      (var-set heap-size (- (var-get heap-size) u1))
      (min-heapify-depth-1 PRIORITY_INDEX)
      (ok min-position))))

(define-public (min-heap-insert (price uint) (value uint))
  (begin
    (asserts! (< (var-get heap-size) MAX_HEAP_SIZE) ERR_FULL_HEAP)
    (var-set heap-size (+ (var-get heap-size) u1))
    (map-set heap {index: (var-get heap-size)} {price: price, value: value})
    (heap-move-up-depth-5 (var-get heap-size))
    (ok true)))

(define-public (initialize)
  (begin
    (populate-heap)
    (ok true)))

(define-public (get-orders)
  (ok (map get-position HEAP_INDICES)))

(define-public (head-change-volume (volume uint))
  (begin
    (asserts! (>= (var-get heap-size) u1) ERR_EMPTY_HEAP)
    (asserts! (is-eq tx-sender (var-get authorized-order-book)) ERR_NOT_AUTHORIZED)
    (map-set heap {index: u0} {price: (get price (get-position u0)), value: volume})
    (ok true)))