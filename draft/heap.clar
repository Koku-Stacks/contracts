(define-map heap {index: uint}
                 {priority: uint,
                  value: uint})

(define-data-var heap-size uint u0)

;; indices for a heap of height 4
(define-constant HEAP_INDICES
  (list
     u1  u2  u3  u4  u5  u6  u7  u8  u9 u10
    u11 u12 u13 u14 u15 u16 u17 u18 u19 u20
    u21 u22 u23 u24 u25 u26 u27 u28 u29 u30
    u31))

(define-constant PRIORITY_INDEX u1)

(define-read-only (get-position (index uint))
  (default-to {priority: u0, value: u0} (map-get? heap {index: index})))

(define-read-only (parent-index (index uint))
  (/ index u2))

(define-read-only (left-child-index (index uint))
  (* index u2))

(define-read-only (right-child-index (index uint))
  (+ (* index u2) u1))

(define-read-only (priority-position)
  (get-position PRIORITY_INDEX))

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
  (max-heapify-core index))

(define-private (populate-heap-step (index uint))
  (map-insert heap {index: index} {priority: u0, value: u0}))

(define-private (populate-heap)
  (map populate-heap-step HEAP_INDICES))

(define-public (initialize)
  (begin
    (populate-heap)
    (ok true)))