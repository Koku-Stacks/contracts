(define-map uri-map {principal: principal} {uri: (string-utf8 64)})

(define-public (set-uri (principal principal) (uri (string-utf8 64)))
  (begin
    (map-set uri-map {principal: principal} {uri: uri})
    (ok true)))

(define-read-only (get-uri (principal principal))
  (match (map-get? uri-map {principal: principal})
    uri-tuple
    (some (get uri uri-tuple))
    none))