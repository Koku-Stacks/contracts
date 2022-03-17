;; FIXME just stub for now
;; it should have been a cumulative distribution function implementation using fixed point arithmetic
(define-read-only (fp-cdf (x int))
  x)

(define-read-only (calculate-d1 (s int) (k int) (t int) (r int) (v int))
  (fp-divide (fp-add (fp-simpson-ln (fp-divide s k))
                     (fp-multiply t
                                  (fp-add r
                                          (fp-divide (fp-square-of v)
                                                     TWO_6))))
             (fp-multiply v
                          (fp-sqrt t))))

(define-read-only (calculate-d2 (s int) (k int) (t int) (r int) (v int))
  (fp-subtract (calculate-d1 s k t r v)
               (fp-multiply v
                            (fp-sqrt t))))

(define-read-only (calculate-european-call (s int) (k int) (t int) (r int) (v int))
  (let ((d1 (calculate-d1 s k t r v))
        (d2 (calculate-d2 s k t r v)))
    (fp-subtract (fp-multiply s
                              (fp-cdf d1))
                 (fp-multiply k
                              (fp-multiply (fp-inverse (fp-exp (fp-multiply r t)))
                                           (fp-cdf d2))))))

(define-read-only (calculate-european-put (s int) (k int) (t int) (r int) (v int))
  (let ((d1 (calculate-d1 s k t r v))
        (d2 (calculate-d2 s k t r v)))
    (fp-subtract (fp-multiply k
                              (fp-multiply (fp-inverse (fp-exp (fp-multiply r t)))
                                           (fp-cdf (fp-neg d2))))
                 (fp-multiply s
                              (fp-cdf (fp-neg d1))))))