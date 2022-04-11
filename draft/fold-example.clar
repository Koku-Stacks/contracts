;; illustration of fold/reduce usage

(define-map indexed-data {index: uint} {content-a: uint,
                                        content-b: uint})

(define-data-var least-unused-index uint u1)

(define-public (insert-data (content-a uint) (content-b uint))
  (begin
    (map-insert indexed-data {index: (var-get least-unused-index)} {content-a: content-a, content-b: content-b})
    (var-set least-unused-index (+ (var-get least-unused-index) u1))
    (ok true)))

(define-read-only (get-data (index uint) (default-a uint) (default-b uint))
  (default-to {content-a: default-a,
               content-b: default-b}
              (map-get? indexed-data {index: index})))

(define-read-only (get-a (index uint) (default uint))
  (get content-a (get-data index default u0)))

(define-read-only (get-b (index uint) (default uint))
  (get content-b (get-data index u0 default)))

