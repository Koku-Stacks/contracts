(define-read-only (say-hello)
    (print "hello world")
)

(define-public (say-hello-world)
    (begin
        (print "hello world")
        (ok true)
    )
)