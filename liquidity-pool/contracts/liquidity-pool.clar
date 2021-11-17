;; liquidity-pool
;; a simple liquidity pool implementation

;; constants
;;

(define-constant non-positive-dx u1)
(define-constant invalid-dl u2)
(define-constant non-positive-dy u3)
(define-constant dy-not-less-than-y u4)

;; this is based on https://github.com/runtimeverification/verified-smart-contracts/blob/uniswap/uniswap/x-y-k.pdf

;; Consider a decentralized exchange that trades two tokens X and Y.
;; Let x and y be the number of tokens X and Y, respectively, that the exchange currently reserves.
;; The token exchange price is determined by the ratio of x and y so that the product xy is preserved.
;; That is, when you sell dx tokens, you will get dy tokens such that xy = (x + dx)(y - dy).

;; xy/(x + dx) = y - dy
;; dy = y - xy/(x + dx)

;; Thus, the price dx/dy is the function of x/y.
;; Specifically, when you trade dx with dy, the exchange token reserves are updated as follows.

;; x' = x + dx
;; y' = y - dy

;; We define the exchange state as a tuple (x, y, l) where:
;; - x is the amount of X,
;; - y is the amount of Y, and
;; - l is the amount of liquidity tokens

;; updating liquidity

(define-read-only (add-liquidity (state (tuple (x uint) (y uint) (l uint)))
                                 (dx uint))
  (begin
    (asserts! (> dx u0) (err non-positive-dx))
    (let ((x (get x state))
          (y (get y state))
          (l (get l state)))
      (ok {x: (+ x dx),
           y: (+ y (/ (* dx y) x) u1),
           l: (+ l (/ (* dx l) x))}))))

(define-read-only (remove-liquidity (state (tuple (x uint) (y uint) (l uint)))
                                    (dl uint))
  (begin
    (asserts! (and (< u0 dl) (< dl (get l state))) (err invalid-dl))
    (let ((x (get x state))
          (y (get y state))
          (l (get l state)))
      (ok {x: (- x (/ (* dl x) l)),
           y: (- y (/ (* dl y) l)),
           l: (- l dl)}))))

;; token price calculation

;; There is a caveat regarding fee calculation and integer arithmetic representing real number operations.
;; As the following are general calculation functions, they are not concerned about how many decimal places are being represented in uints.
;; This way, it is not informative to represent a fee value by itself, i.e u3, because we do not know whether this means 0.03 or 0.003, for instance.
;; To suplement that, we use an integer value called unit, which is going to determine how many integer places are representing decimal places.
;; For instance, if our fee is 0.003 and we use three decimal places in our calculations, fee can be represented as u3 given a unit u1000.
;; As another example, if our fee is 0.004 and we use four decimal places in our calculations, fee is u40 and unit is u10000.

(define-read-only (get-input-price (x uint) (y uint) (dx uint) (fee uint) (unit uint))
  (begin
    (asserts! (> dx u0) (err non-positive-dx))
    (ok (/ (* (- unit fee) dx y)
           (+ (* unit x)
              (* (- unit fee) dx))))))

(define-read-only (get-output-price (x uint) (y uint) (dy uint) (fee uint) (unit uint))
  (begin
    (asserts! (< u0 dy) (err non-positive-dy))
    (asserts! (< dy y) (err dy-not-less-than-y))
    (ok (+ u1
           (/ (* unit x dy)
              (* (- unit fee) (- y dy)))))))

;; trading tokens

(define-read-only (x-to-y (state (tuple (x uint) (y uint) (l uint)))
                          (dx uint)
                          (fee uint)
                          (unit uint))
  (begin
    (asserts! (> dx u0) (err non-positive-dx))
    (let ((x (get x state))
          (y (get y state))
          (l (get l state)))
      (match (get-input-price x y dx fee unit)
        input-price
        (ok {x: (+ x dx),
             y: (- y input-price),
             l: l})
        error
        (err error)))))

;; data maps and vars
;;

;; private functions
;;

;; public functions
;;
