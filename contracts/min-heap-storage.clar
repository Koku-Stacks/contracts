(define-constant ERR_NOT_AUTHORIZED (err u3000))

(define-data-var authorized-contract principal tx-sender)

(define-map min-heap {index: uint}
                     {price: uint,
                      value: uint})

(define-read-only (get-position (index uint))
  (default-to {price: u0, value: u0} (map-get? min-heap {index: index})))

(define-public (set-position (index uint) (position {price: uint, value: uint}))
  (begin
    (asserts! (is-eq contract-caller (var-get authorized-contract)) ERR_NOT_AUTHORIZED)
    (map-set min-heap {index: index} position)
    (ok true)))

(define-public (initialize (contract principal))
  (begin
    (var-set authorized-contract contract)
    (ok true)))