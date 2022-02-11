;; this contract contains a circular buffer implementation

(define-constant SIZE u10)

;; these constants should be in accordance with SIZE
(define-constant INDEXES         (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9))
(define-constant INITIAL_CONTENT (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0))

(define-map buffer {index: uint} {content: uint})

(define-data-var start uint u0)
(define-data-var end uint u0)

(define-public (initialize-or-reset)
  (begin
    (map set-at INDEXES INITIAL_CONTENT)
    (ok true)))

(define-public (get-item)
  (let ((item (get-at (var-get start))))
    (var-set start (mod (+ (var-get start) u1) SIZE))
    (ok item)))

(define-public (put-item (item uint))
  (begin
    (set-at (var-get end) item)
    (var-set end (mod (+ (var-get end) u1) SIZE))
    (ok true)))

(define-private (get-at (idx uint))
  (get content (unwrap-panic (map-get? buffer {index: idx}))))

(define-private (set-at (idx uint) (elem uint))
  (map-set buffer {index: idx} {content: elem}))