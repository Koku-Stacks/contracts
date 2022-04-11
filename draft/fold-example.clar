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

(define-public (batch-increase-a-step (index uint) (amount-resp (response uint uint)))
  (let ((content (get-data index u0 u0))
        (current-a (get content-a content))
        (amount (try! amount-resp)))
    (map-set indexed-data {index: index}
                          {content-a: (+ current-a amount),
                           content-b: (get content-b content)})
    (ok amount)))

(define-public (batch-increase-b-step (index uint) (amount-resp (response uint uint)))
  (let ((content (get-data index u0 u0))
        (current-b (get content-b content))
        (amount (try! amount-resp)))
    (map-set indexed-data {index: index}
                          {content-a: (get content-a content),
                           content-b: (+ current-b amount)})
    (ok amount)))

(define-public (batch-increase-a (indices (list 100 uint)) (amount uint))
  (fold batch-increase-a-step indices (ok amount)))

(define-public (batch-increase-b (indices (list 100 uint)) (amount uint))
  (fold batch-increase-b-step indices (ok amount)))