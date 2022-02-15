;; this contract contains a circular buffer implementation

(define-constant ERR_NOT_INITIALIZED (err u100))
(define-constant ERR_EMPTY (err u101))

(define-constant buffer-max-limit u10)

(define-map circular-buffer {index: uint} {content: uint})

(define-data-var end uint u0)

(define-data-var empty bool true)
(define-data-var number-inserted-items uint u0)

(define-data-var initialized bool false)

(define-read-only (get-item)
  (begin
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (not (var-get empty)) ERR_EMPTY)
    (ok (get-at (mod (+ (var-get end) u1) buffer-max-limit)))))

(define-public (initialize-or-reset)
  (let ((indexes         (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9))
        (initial-content (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0)))
    (map set-at indexes initial-content)
    (var-set initialized true)
    (var-set empty true)
    (var-set number-inserted-items u0)
    (ok true)))

(define-public (put-item (item uint))
  (begin
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (var-set end (mod (+ (var-get end) u1) buffer-max-limit))
    (set-at (var-get end) item)
    (var-set number-inserted-items (+ (var-get number-inserted-items) u1))
    (if (is-eq buffer-max-limit (var-get number-inserted-items))
      (begin
        (var-set number-inserted-items u0)
        (var-set empty false))
      true)
    (ok true)))

(define-private (get-at (idx uint))
  (get content (unwrap-panic (map-get? circular-buffer {index: idx}))))

(define-private (set-at (idx uint) (elem uint))
  (map-set circular-buffer {index: idx} {content: elem}))