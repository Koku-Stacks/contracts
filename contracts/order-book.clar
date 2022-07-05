(use-trait sip-010-token .sip-010-trait-ft-standard.sip-010-trait)

(define-constant this-contract (as-contract tx-sender))
(contract-call? .max-heap set-authorized-order-book this-contract)
(contract-call? .min-heap set-authorized-order-book this-contract)

;; this is not related to an actual token before initialization
(define-data-var authorized-usda-token principal tx-sender)
(define-data-var authorized-wbtc-token principal tx-sender)

(define-public (initialize (usda <sip-010-token>) (wbtc <sip-010-token>))
  (begin
    (var-set authorized-usda-token (contract-of usda))
    (var-set authorized-wbtc-token (contract-of wbtc))
    (ok true)))

(define-public (placeBid (price uint) (value uint))
  (begin
    (try! (as-contract (contract-call? .max-heap max-heap-insert price value)))
    (ok true)))

(define-public (placeAsk (price uint) (value uint))
  (begin
    (try! (as-contract (contract-call? .min-heap min-heap-insert price value)))
    (ok true)))