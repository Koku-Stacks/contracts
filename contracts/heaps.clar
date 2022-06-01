(define-constant ERR_EMPTY_HEAP (err u4000)) ;; FIXME adjust error code according to ERRORS.md
(define-constant ERR_FULL_HEAP (err u4001)) ;; FIXME adjust error code according to ERRORS.md

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

(define-data-var max-heap-size uint u0)

(define-data-var min-heap-size uint u0)

(define-private (max-heap-get-position (index uint))
  (contract-call? .max-heap-storage get index))

(define-private (min-heap-get-position (index uint))
  (contract-call? .min-heap-storage get index))

(define-private (max-heap-set-position (index uint) (position {price: uint, value: uint}))
  (as-contract (contract-call? .max-heap-storage set index position)))

(define-private (min-heap-set-position (index uint) (position {price: uint, value: uint}))
  (as-contract (contract-call? .min-heap-storage set index position)))

(define-read-only (parent-index (index uint))
  (/ index u2))

(define-read-only (left-child-index (index uint))
  (* index u2))

(define-read-only (right-child-index (index uint))
  (+ (* index u2) u1))

(define-read-only (max-heap-priority-position)
  (begin
    (asserts! (>= (var-get max-heap-size) u1) ERR_EMPTY_HEAP)
    (ok (max-heap-get-position PRIORITY_INDEX))))

(define-read-only (min-heap-priority-position)
  (begin
    (asserts! (>= (var-get min-heap-size) u1) ERR_EMPTY_HEAP)
    (ok (min-heap-get-position PRIORITY_INDEX))))

(define-private (max-heapify-core (index uint))
  (let ((left-index
         (left-child-index index))
        (left-position
         (max-heap-get-position left-index))
        (right-index
         (right-child-index index))
        (right-position
         (max-heap-get-position right-index))
        (largest-initial
         index)
        (largest-initial-position
         (max-heap-get-position largest-initial))
        (largest-against-left
         (if (and (<= left-index
                      (var-get max-heap-size))
                  (> (get price left-position)
                     (get price largest-initial-position)))
            left-index
            largest-initial))
        (largest-against-left-position
         (max-heap-get-position largest-against-left))
        (largest
         (if (and (<= right-index
                      (var-get max-heap-size))
                  (> (get price right-position)
                     (get price largest-against-left-position)))
            right-index
            largest-against-left))
        (largest-position
         (max-heap-get-position largest)))
    (if (not (is-eq largest largest-initial))
      (begin
        (max-heap-set-position largest-initial largest-position)
        (max-heap-set-position largest largest-initial-position)
        largest)
      u0)))

(define-private (min-heapify-core (index uint))
  (let ((left-index
         (left-child-index index))
        (left-position
         (min-heap-get-position left-index))
        (right-index
         (right-child-index index))
        (right-position
         (min-heap-get-position right-index))
        (smallest-initial
         index)
        (smallest-initial-position
         (min-heap-get-position smallest-initial))
        (smallest-against-left
         (if (and (<= left-index
                      (var-get min-heap-size))
                  (<= (get price left-position)
                      (get price smallest-initial-position)))
            left-index
            smallest-initial))
        (smallest-against-left-position
         (min-heap-get-position smallest-against-left))
        (smallest
         (if (and (<= right-index
                      (var-get min-heap-size))
                  (<= (get price right-position)
                      (get price smallest-against-left-position)))
            right-index
            smallest-against-left))
        (smallest-position
         (min-heap-get-position smallest)))
    (if (not (is-eq smallest smallest-initial))
      (begin
        (min-heap-set-position smallest-initial smallest-position)
        (min-heap-set-position smallest smallest-initial-position)
        smallest)
      u0)))

(define-private (max-heapify-depth-1 (index uint))
  (let ((return-index (max-heapify-core index)))
    (if (not (is-eq return-index u0))
      (max-heapify-depth-2 return-index)
      u0)))

(define-private (max-heapify-depth-2 (index uint))
  (let ((return-index (max-heapify-core index)))
    (if (not (is-eq return-index u0))
      (max-heapify-depth-3 return-index)
      u0)))

(define-private (max-heapify-depth-3 (index uint))
  (let ((return-index (max-heapify-core index)))
    (if (not (is-eq return-index u0))
      (max-heapify-depth-4 return-index)
      u0)))

(define-private (max-heapify-depth-4 (index uint))
  (max-heapify-core index))

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

(define-private (max-heap-move-up-core (index uint))
  (let ((index-position (max-heap-get-position index))
        (p-index (parent-index index))
        (p-index-position (max-heap-get-position p-index)))
    (if (and (> index PRIORITY_INDEX)
             (> (get price index-position)
                (get price p-index-position)))
      (begin
        (max-heap-set-position index p-index-position)
        (max-heap-set-position p-index index-position)
        p-index)
      u0)))

(define-private (min-heap-move-up-core (index uint))
  (let ((index-position (min-heap-get-position index))
        (p-index (parent-index index))
        (p-index-position (min-heap-get-position p-index)))
    (if (and (> index PRIORITY_INDEX)
             (<= (get price index-position)
                 (get price p-index-position)))
      (begin
        (min-heap-set-position index p-index-position)
        (min-heap-set-position p-index index-position)
        p-index)
      u0)))

(define-private (max-heap-move-up-depth-5 (index uint))
  (let ((return-index (max-heap-move-up-core index)))
    (if (not (is-eq return-index u0))
      (max-heap-move-up-depth-4 return-index)
      u0)))

(define-private (max-heap-move-up-depth-4 (index uint))
  (let ((return-index (max-heap-move-up-core index)))
    (if (not (is-eq return-index u0))
      (max-heap-move-up-depth-3 return-index)
      u0)))

(define-private (max-heap-move-up-depth-3 (index uint))
  (let ((return-index (max-heap-move-up-core index)))
    (if (not (is-eq return-index u0))
      (max-heap-move-up-depth-2 return-index)
      u0)))

(define-private (max-heap-move-up-depth-2 (index uint))
  (max-heap-move-up-core index))

(define-private (min-heap-move-up-depth-5 (index uint))
  (let ((return-index (min-heap-move-up-core index)))
    (if (not (is-eq return-index u0))
      (min-heap-move-up-depth-4 return-index)
      u0)))

(define-private (min-heap-move-up-depth-4 (index uint))
  (let ((return-index (min-heap-move-up-core index)))
    (if (not (is-eq return-index u0))
      (min-heap-move-up-depth-3 return-index)
      u0)))

(define-private (min-heap-move-up-depth-3 (index uint))
  (let ((return-index (min-heap-move-up-core index)))
    (if (not (is-eq return-index u0))
      (min-heap-move-up-depth-2 return-index)
      u0)))

(define-private (min-heap-move-up-depth-2 (index uint))
  (min-heap-move-up-core index))

(define-private (populate-heaps-step (index uint))
  (begin
    (max-heap-set-position index {price: u0, value: u0})
    (min-heap-set-position index {price: u0, value: u0})))

(define-private (populate-heaps)
  (map populate-heaps-step HEAP_INDICES))

(define-public (heap-extract-max)
  (begin
    (asserts! (>= (var-get max-heap-size) u1) ERR_EMPTY_HEAP)
    (let ((max-position (max-heap-get-position PRIORITY_INDEX))
          (last-leaf-position (max-heap-get-position (var-get max-heap-size))))
      (max-heap-set-position PRIORITY_INDEX last-leaf-position)
      (var-set max-heap-size (- (var-get max-heap-size) u1))
      (max-heapify-depth-1 PRIORITY_INDEX)
      (ok max-position))))

(define-public (heap-extract-min)
  (begin
    (asserts! (>= (var-get min-heap-size) u1) ERR_EMPTY_HEAP)
    (let ((min-position (min-heap-get-position PRIORITY_INDEX))
          (last-leaf-position (min-heap-get-position (var-get min-heap-size))))
      (min-heap-set-position PRIORITY_INDEX last-leaf-position)
      (var-set min-heap-size (- (var-get min-heap-size) u1))
      (min-heapify-depth-1 PRIORITY_INDEX)
      (ok min-position))))

(define-public (max-heap-insert (price uint) (value uint))
  (begin
    (asserts! (< (var-get max-heap-size) MAX_HEAP_SIZE) ERR_FULL_HEAP)
    (var-set max-heap-size (+ (var-get max-heap-size) u1))
    (max-heap-set-position (var-get max-heap-size) {price: price, value: value})
    (max-heap-move-up-depth-5 (var-get max-heap-size))
    (ok true)))

(define-public (min-heap-insert (price uint) (value uint))
  (begin
    (asserts! (< (var-get min-heap-size) MAX_HEAP_SIZE) ERR_FULL_HEAP)
    (var-set min-heap-size (+ (var-get min-heap-size) u1))
    (min-heap-set-position (var-get min-heap-size) {price: price, value: value})
    (min-heap-move-up-depth-5 (var-get min-heap-size))
    (ok true)))

(define-public (initialize)
  (begin
    (populate-heaps)
    (ok true)))