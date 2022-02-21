(define-trait ft-mint-burn-trait
    (
        (mint (uint principal) (response bool uint))
        (burn (uint) (response bool uint))
    )
)