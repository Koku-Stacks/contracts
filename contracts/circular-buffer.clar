;; this contract contains a circular buffer implementation

(define-constant SIZE u10)

;; these constants should be in accordance with SIZE
(define-constant indexes         (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9))
(define-constant initial_content (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0))

(define-map buffer {index: uint} {content: uint})

(define-data-var end uint u0)

(define-read-only (get-item)
  (get-at (mod (+ (var-get end) u1) SIZE)))

(define-public (initialize-or-reset)
  (begin
    (map set-at indexes initial_content)
    (ok true)))

(define-public (put-item (item uint))
  (begin
    (var-set end (mod (+ (var-get end) u1) SIZE))
    (set-at (var-get end) item)
    (ok true)))

(define-private (get-at (idx uint))
  (get content (unwrap-panic (map-get? buffer {index: idx}))))

(define-private (set-at (idx uint) (elem uint))
  (map-set buffer {index: idx} {content: elem}))