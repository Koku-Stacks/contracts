(define-constant unauthorized-uri-change u100)

(define-constant this-contract (as-contract tx-sender))

(contract-call? .ownership-registry register-ownership this-contract)

(define-map uri-map {principal: principal} {uri: (string-utf8 64)})

(define-public (set-uri (principal principal) (uri (string-utf8 64)))
  (begin
    (asserts! (is-eq {owner: tx-sender} (contract-call? .ownership-registry get-owner this-contract)) (err unauthorized-uri-change))
    (map-set uri-map {principal: principal} {uri: uri})
    (ok true)))

(define-read-only (get-uri (principal principal))
  (match (map-get? uri-map {principal: principal})
    uri-tuple
    (some (get uri uri-tuple))
    none))