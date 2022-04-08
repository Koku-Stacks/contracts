;; FIXME adapt to final chunk size
(define-constant INDEX_CHUNK_SIZE u100)

(define-map indexed-data {index: uint} {content-a: uint,
                                        content-b: uint})

(define-data-var least-unused-index uint u1)

(define-data-var last-updated-index uint u0)

;; FIXME adapt to final chunk size
(define-data-var next-indices-to-update (list 100 uint)
  (list
     u1  u2  u3  u4  u5  u6  u7  u8  u9  u10
    u11 u12 u13 u14 u15 u16 u17 u18 u19  u20
    u21 u22 u23 u24 u25 u26 u27 u28 u29  u30
    u31 u32 u33 u34 u35 u36 u37 u38 u39  u40
    u41 u42 u43 u44 u45 u46 u47 u48 u49  u50
    u51 u52 u53 u54 u55 u56 u57 u58 u59  u60
    u61 u62 u63 u64 u65 u66 u67 u68 u69  u70
    u71 u72 u73 u74 u75 u76 u77 u78 u79  u80
    u81 u82 u83 u84 u85 u86 u87 u88 u89  u90
    u91 u92 u93 u94 u95 u96 u97 u98 u99 u100))

(define-read-only (increase-indices-by-chunk-size-step (index-value uint))
  (+ index-value INDEX_CHUNK_SIZE))

(define-private (increase-indices-by-chunk-size)
  (var-set next-indices-to-update
           (map increase-indices-by-chunk-size-step
                (var-get next-indices-to-update))))

(define-private (prepare-for-next-chunk-update)
  (begin
    (increase-indices-by-chunk-size)
    (var-set last-updated-index
             (+ (var-get last-updated-index) INDEX_CHUNK_SIZE))))

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

;; FIXME this should be private, right? Only for internal usage once it describes serious business logic
(define-public (batch-increase-a (indices (list 100 uint)) (amount uint))
  (fold batch-increase-a-step indices (ok amount)))

;; FIXME this should be private, right? Only for internal usage once it describes serious business logic
(define-public (batch-increase-b (indices (list 100 uint)) (amount uint))
  (fold batch-increase-b-step indices (ok amount)))

(define-public (update-next-index-chunk (amount uint))
  (begin
    (try! (batch-increase-a (var-get next-indices-to-update) amount)) ;; mocking business logic
    (try! (batch-increase-b (var-get next-indices-to-update) amount)) ;; mocking business logic
    (prepare-for-next-chunk-update)
    (ok true)))
