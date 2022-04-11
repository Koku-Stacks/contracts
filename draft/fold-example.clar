;; illustration of fold/reduce usage

(define-map indexed-data {index: uint} {content-a: uint,
                                        content-b: uint})

(define-data-var least-unused-index uint u1)

(define-public (insert-data (content-a uint) (content-b uint))
  (begin
    (map-insert indexed-data {index: (var-get least-unused-index)} {content-a: content-a, content-b: content-b})
    (var-set least-unused-index (+ (var-get least-unused-index) u1))
    (ok true)))

(define-read-only (get-data (index uint) (default uint))
  (get content (default-to {content: default} (map-get? indexed-data {index: index}))))

(define-read-only (sum-step (processing-index uint) (accumulator uint))
  (+ accumulator (get-data processing-index u0)))

(define-read-only (product-step (processing-index uint) (accumulator uint))
  (* accumulator (get-data processing-index u1)))

(define-read-only (sum (indices (list 100 uint)))
  (fold sum-step indices u0))

(define-read-only (product (indices (list 100 uint)))
  (fold product-step indices u1))