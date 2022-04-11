;; illustration of fold/reduce usage

(define-map indexed-data {index: uint} {content-a: uint,
                                        content-b: uint})

(define-data-var least-unused-index uint u1)

(define-public (insert-data (content-a uint) (content-b uint))
  (begin
    (map-insert indexed-data {index: (var-get least-unused-index)} {content-a: content-a, content-b: content-b})
    (var-set least-unused-index (+ (var-get least-unused-index) u1))
    (ok true)))

