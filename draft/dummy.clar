(define-data-var variable uint u0)

(define-read-only (getter)
  (var-get variable))

(define-public (setter (value uint))
  (begin
    (var-set variable value)
    (ok true)))