(define-public (placeBid (price uint) (value uint))
  (begin
    (try! (as-contract (contract-call? .max-heap max-heap-insert price value)))
    (ok true)))