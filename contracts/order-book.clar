(define-constant this-contract (as-contract tx-sender))
(contract-call? .max-heap set-authorized-order-book this-contract)
(contract-call? .min-heap set-authorized-order-book this-contract)

(define-public (placeBid (price uint) (value uint))
  (begin
    (try! (as-contract (contract-call? .max-heap max-heap-insert price value)))
    (ok true)))

(define-public (placeAsk (price uint) (value uint))
  (begin
    (try! (as-contract (contract-call? .min-heap max-heap-insert price value)))
    (ok true)))