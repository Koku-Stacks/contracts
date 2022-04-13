(define-private (is-leap-year (year uint)) 
    (if (is-eq (mod year u400) u0) 
        true
        (if (is-eq (mod year u100) u0)
            false
            (if (is-eq (mod year u4) u0)
                true
                false
            )
        )
    )
)

(define-private (leap-years-before (year uint)) 
    (+ (- (/ year u4) (/ year u100)) (/ year u400))
)

(define-private (get-leap-days (end-year uint)) 
    (- (leap-years-before end-year) (leap-years-before u1970))
)

;; without leap days adjustment
(define-private (get-days-without-leap-years (time-stamp uint)) 
    (/ time-stamp u86400)
)

(define-read-only (get-months (time-stamp uint))
    (* (get-years time-stamp) u12)
)

(define-read-only (get-hours (time-stamp uint))
    (* (get-days time-stamp) u24)
)

(define-read-only (get-minutes (time-stamp uint))
    (* (get-hours time-stamp) u60)
)

(define-read-only (get-seconds (time-stamp uint))
    (* (get-minutes time-stamp) u60)
)

(define-read-only (get-days (time-stamp uint))
    (+ (get-days-without-leap-years time-stamp) (get-leap-days (+ u1970 (get-years time-stamp))))
)

;; without leap years adjustment
(define-read-only (get-years (time-stamp uint))
    (/ (/ time-stamp u86400) u365)
)

(define-read-only (human-readable (time-stamp uint)) 
    (ok {year: (get-years time-stamp),
        month: (get-months time-stamp),
        day: (get-days time-stamp),
        hour: (get-hours time-stamp),
        minute: (get-minutes time-stamp),
        second: (get-seconds time-stamp)})
)


;; for references:
;; https://www.programiz.com/c-programming/examples/leap-year
;; https://stackoverflow.com/questions/4587513/how-to-calculate-number-of-leap-years-between-two-years-in-c-sharp