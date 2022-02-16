(define-trait owner-trait
    (
        (get-owner () (response principal uint))
        (set-owner (principal) (response bool uint))
    )
)