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

(define-map heap {index: uint}
                 {priority: uint,
                  value: uint})

(define-data-var heap-size uint u0)

(define-read-only (get-position (index uint))
  (default-to {priority: u0, value: u0} (map-get? heap {index: index})))

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

(define-private (max-heapify-core (index uint))
  (let ((left-index
         (left-child-index index))
        (left-position
         (get-position left-index))
        (right-index
         (right-child-index index))
        (right-position
         (get-position right-index))
        (largest-initial
         index)
        (largest-initial-position
         (get-position largest-initial))
        (largest-against-left
         (if (and (<= left-index
                      (var-get heap-size))
                  (> (get priority left-position)
                     (get priority largest-initial-position)))
            left-index
            largest-initial))
        (largest-against-left-position
         (get-position largest-against-left))
        (largest
         (if (and (<= right-index
                      (var-get heap-size))
                  (> (get priority right-position)
                     (get priority largest-against-left-position)))
            right-index
            largest-against-left)))
    (if (not (is-eq largest largest-initial))
      (begin
        (map-set heap {index: largest} largest-initial-position)
        (map-set heap {index: largest-initial} (get-position largest))
        largest)
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

(define-private (heap-move-up-core (index uint))
  (let ((index-position (get-position index))
        (p-index (parent-index index))
        (p-index-position (get-position p-index)))
    (if (and (> index PRIORITY_INDEX)
             (> (get priority index-position)
                (get priority p-index-position)))
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
  (map-insert heap {index: index} {priority: u0, value: u0}))

(define-private (populate-heap)
  (map populate-heap-step HEAP_INDICES))

(define-public (heap-extract-max)
  (begin
    (asserts! (>= (var-get heap-size) u1) ERR_EMPTY_HEAP)
    (let ((max-position (get-position PRIORITY_INDEX))
          (last-leaf-position (get-position (var-get heap-size))))
      (map-set heap {index: PRIORITY_INDEX} last-leaf-position)
      (var-set heap-size (- (var-get heap-size) u1))
      (max-heapify-depth-1 PRIORITY_INDEX)
      (ok max-position))))

(define-public (max-heap-insert (priority uint) (value uint))
  (begin
    (asserts! (< (var-get heap-size) MAX_HEAP_SIZE) ERR_FULL_HEAP)
    (var-set heap-size (+ (var-get heap-size) u1))
    (map-set heap {index: (var-get heap-size)} {priority: priority, value: value})
    (heap-move-up-depth-5 (var-get heap-size))
    (ok true)))

(define-public (initialize)
  (begin
    (populate-heap)
    (ok true)))