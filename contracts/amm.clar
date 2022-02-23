;; this contract contains an automatic market maker implementation

(define-constant ERR_NOT_INITIALIZED (err u100))
(define-constant ERR_EMPTY (err u101))
(define-constant ERR_CONTRACT_OWNER_ONLY (err u103))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u104))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u105))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u106))
(define-constant ERR_NOT_NEW_OWNER (err u107))

(define-constant buffer-max-limit u10)

(define-constant option-types (list "call" "put"))

(define-constant option-durations (list u1 u3 u7 u15 u30))

(define-map circular-buffer {index: uint} {btc-price: uint})

(define-data-var owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-data-var end uint u0)

(define-data-var empty bool true)
(define-data-var number-inserted-items uint u0)

(define-data-var initialized bool false)

;; ##############################################
;; integer fixed-point arithmetic with six decimal places

(define-constant ONE_6 u1000000)
(define-constant TWO_6 u2000000)
(define-constant SIX_6 u6000000)
(define-constant EIGHT_6 u8000000)

(define-constant R_SHIFTING_SQRT_CONSTANT u1000)

(define-read-only (fp-add (x uint) (y uint))
  (+ x y))

(define-read-only (fp-subtract (x uint) (y uint))
  (- x y))

(define-read-only (fp-neg (x uint))
  (* -1 (to-int x)))

(define-read-only (fp-multiply (x uint) (y uint))
  (/ (* x y) ONE_6))

(define-read-only (fp-divide (x uint) (y uint))
  (if (is-eq x u0)
    u0
    (/ (* x ONE_6) y)))

(define-read-only (fp-square-of (x uint))
  (fp-multiply x x))

(define-read-only (fp-sqrt (x uint))
  (* (sqrti x) R_SHIFTING_SQRT_CONSTANT))

(define-read-only (fp-inverse (x uint))
  (fp-divide ONE_6 x))

(define-read-only (fp-simpson-ln (b uint))
  (fp-multiply (fp-divide (fp-subtract b ONE_6)
                          SIX_6)
               (fp-add ONE_6
                       (fp-add (fp-multiply EIGHT_6
                                            (fp-inverse (fp-add ONE_6 b)))
                               (fp-inverse b)))))

;; ##############################################

(define-read-only (valid-option-duration (duration uint))
  (is-some (index-of option-durations duration)))

(define-read-only (valid-option-type (type (string-ascii 4)))
  (is-some (index-of option-types type)))

(define-read-only (get-owner)
  (var-get owner))

(define-read-only (is-empty)
  (var-get empty))

(define-read-only (get-item)
  (begin
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (not (is-empty)) ERR_EMPTY)
    (ok (get-at (mod (+ (var-get end) u1) buffer-max-limit)))))

(define-public (submit-ownership-transfer (new-owner principal))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-none (var-get submitted-new-owner)) ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED)
    (var-set submitted-new-owner (some new-owner))
    (ok true)))

(define-public (cancel-ownership-transfer)
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL)
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (confirm-ownership-transfer)
  (begin
    (asserts! (is-some (var-get submitted-new-owner)) ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM)
    (asserts! (is-eq (some tx-sender) (var-get submitted-new-owner)) ERR_NOT_NEW_OWNER)
    (var-set owner (unwrap-panic (var-get submitted-new-owner)))
    (var-set submitted-new-owner none)
    (ok true)))

(define-public (initialize-or-reset)
  (let ((indexes         (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9))
        (initial-content (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0)))
    (asserts! (is-eq tx-sender (get-owner)) ERR_CONTRACT_OWNER_ONLY)
    (map set-at indexes initial-content)
    (var-set initialized true)
    (var-set empty true)
    (var-set number-inserted-items u0)
    (ok true)))

(define-public (add-btc-price (btc-price uint))
  (begin
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (is-eq tx-sender (get-owner)) ERR_CONTRACT_OWNER_ONLY)
    (var-set end (mod (+ (var-get end) u1) buffer-max-limit))
    (set-at (var-get end) btc-price)
    (var-set number-inserted-items (+ (var-get number-inserted-items) u1))
    (if (is-eq buffer-max-limit (var-get number-inserted-items))
      (begin
        (var-set number-inserted-items u0)
        (var-set empty false))
      true)
    (ok true)))

(define-private (get-at (idx uint))
  (unwrap-panic (map-get? circular-buffer {index: idx})))

(define-private (set-at (idx uint) (btc-price uint))
  (map-set circular-buffer {index: idx} {btc-price: btc-price}))