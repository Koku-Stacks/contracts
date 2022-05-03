(define-constant HALF_6 500000)

(define-constant ONE_6 1000000)
(define-constant TWO_6 2000000)
(define-constant SIX_6 6000000)
(define-constant EIGHT_6 8000000)

(define-constant LN_2_6 693147)
(define-constant INV_LN_2_6 1442695)

(define-constant R_SHIFTING_SQRT_CONSTANT 1000)

(define-read-only (fp-add (x int) (y int))
  (+ x y))

(define-read-only (fp-subtract (x int) (y int))
  (- x y))

(define-read-only (fp-neg (x int))
  (* -1 x))

(define-read-only (fp-multiply (x int) (y int))
  (/ (* x y) ONE_6))

(define-read-only (fp-divide (x int) (y int))
  (if (is-eq x 0)
    0
    (/ (* x ONE_6) y)))

(define-read-only (fp-floor (x int))
  (* (/ x ONE_6) ONE_6))

(define-read-only (fp-square-of (x int))
  (fp-multiply x x))

(define-read-only (fp-cube-of (x int))
  (fp-multiply x (fp-multiply x x)))

;; this only works for values like 1000000, 2000000, etc
(define-read-only (fp-exp2 (integer-x int))
  (* (pow 2 (/ integer-x ONE_6)) ONE_6))

(define-read-only (fp-sqrt (x int))
  (* (sqrti x) R_SHIFTING_SQRT_CONSTANT))

(define-read-only (fp-inverse (x int))
  (fp-divide ONE_6 x))

(define-read-only (fp-simpson-ln (b int))
  (fp-multiply (fp-divide (fp-subtract b ONE_6)
                          SIX_6)
               (fp-add ONE_6
                       (fp-add (fp-multiply EIGHT_6
                                            (fp-inverse (fp-add ONE_6 b)))
                               (fp-inverse b)))))

(define-read-only (fp-ln (x int))
  (fp-simpson-ln x))

(define-read-only (fp-reduce-exp (exponent int))
  (let ((k (fp-floor (fp-add (fp-multiply exponent INV_LN_2_6)
                             HALF_6)))
        (r (fp-subtract exponent
                        (fp-multiply k LN_2_6))))
    {k: k, r: r}))

(define-read-only (fp-simple-taylor-4-exp (x int))
  (+ ONE_6
     x
     (fp-divide (fp-square-of x) TWO_6)
     (fp-divide (fp-cube-of x) SIX_6)))

(define-read-only (fp-range-reduced-taylor-4-exp (x int))
  (let ((range-reduction (fp-reduce-exp x))
        (k (get k range-reduction))
        (r (get r range-reduction)))
    (fp-multiply (fp-exp2 k)
                 (fp-simple-taylor-4-exp r))))

(define-read-only (fp-exp (x int))
  (fp-range-reduced-taylor-4-exp x))