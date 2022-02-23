(define-trait owner-trait
    (
        (get-owner () (response principal uint))
        (submit-ownership-transfer (principal) (response bool uint))
        (cancel-ownership-transfer () (response bool uint))
        (confirm-ownership-transfer () (response bool uint))
    )
)