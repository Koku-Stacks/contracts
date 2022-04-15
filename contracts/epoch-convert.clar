;; defined a list of months
(define-constant months (list "Januray" "February" "March" "April" "May" "June" "July" "August" "September" "October" "November" "December"))

;; defined a list of weekdays
(define-constant week-days (list "Thursday" "Friday" "Saturday" "Sunday" "Monday" "Tuesday" "Wednesday"))

(define-private (get-era (z uint))
    (if (>= z u0)
        (/ z u146097)
        (/ (- z u146096) u146097)
    )
)

(define-private (get-mp (mp uint))
    (if (< mp u10)
        (+ mp u3)
        (- mp u9)
    )
)

(define-private (adjust-years (m uint))
    (if (<= m u2)
        u1
        u0
    )
)

;; count of leap years till a given year i.e. no. of leap years till the year 2022 from the start year 0
(define-private (leap-years-from (year uint)) 
    (+ (- (/ year u4) (/ year u100)) (/ year u400))
)

;; without leap days adjustment
(define-private (get-days-without-leap-years (time-stamp uint)) 
    (/ time-stamp u86400)
)

;; for reference of implementation of leap years which is a generic approach according to following references
;; https://www.programiz.com/c-programming/examples/leap-year
;; https://docs.microsoft.com/en-us/office/troubleshoot/excel/determine-a-leap-year
(define-read-only (is-leap-year (year uint)) 
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

;; count of leap years since 1970 
(define-read-only (get-leap-years-since-1970 (end-year uint))
    ;; end year - start year (1970)
    (- (leap-years-from end-year) (leap-years-from u1970))
)



;; As per Luiz's approach
(define-read-only (get-week-days (time-stamp uint)) 
    (unwrap-panic (element-at week-days (mod (/ time-stamp u86400) u7)))
)

;; so according the official doc; https://www.jotform.com/help/443-mastering-date-and-time-calculation/ & https://www.epochconverter.com/
;; an hour is equal to 3600 seconds. So first I get the remainder of years then I get the remainder of months then the days and lastly hours
(define-read-only (get-hours (time-stamp uint))
    (/ (mod time-stamp u86400) u3600)
)

;; so according the official doc; https://www.jotform.com/help/443-mastering-date-and-time-calculation/ & https://www.epochconverter.com/
;; an minute is equal to 60 seconds. So first I get the remainder of years then I get the remainder of months then the days and then hours and then minutes
(define-read-only (get-minutes (time-stamp uint))
    (/ (mod (mod time-stamp u86400) u3600) u60)
)

;; so according the official doc; https://www.jotform.com/help/443-mastering-date-and-time-calculation/ & https://www.epochconverter.com/
;; So first I get the remainder of years then I get the remainder of months then the days and then hours and so on....
(define-read-only (get-seconds (time-stamp uint))
    (mod (mod (mod time-stamp u86400) u3600) u60)
)

(define-read-only (get-day (time-stamp uint))
    (let 
        (
            (z (+ (/ time-stamp u86400) u719468))
            (era (get-era z))
            (doe (- z (* era u146097)))
            (yoe (/ (- (+ (- doe (/ doe u1460)) (/ doe u36524)) (/ doe u146096)) u365))
            (doy (- doe (- (+ (* u365 yoe) (/ yoe u4)) (/ yoe u100))))
            (mp (/ (+ (* u5 doy) u2) u153))
            (day (+ (- doy (/ (+ (* u153 mp) u2) u5)) u1))
        )
        day
    )
)

(define-read-only (get-month (time-stamp uint))
    (let 
        (
            (z (+ (/ time-stamp u86400) u719468))
            (era (get-era z))
            (doe (- z (* era u146097)))
            (yoe (/ (- (+ (- doe (/ doe u1460)) (/ doe u36524)) (/ doe u146096)) u365))
            (doy (- doe (- (+ (* u365 yoe) (/ yoe u4)) (/ yoe u100))))
            (mp (/ (+ (* u5 doy) u2) u153))
            (month (- (get-mp mp) u1))
        )
        (unwrap-panic (element-at months month))
    )
)

(define-read-only (get-year (time-stamp uint))
    (let 
        (
            (z (+ (/ time-stamp u86400) u719468))
            (era (get-era z))
            (doe (- z (* era u146097)))
            (yoe (/ (- (+ (- doe (/ doe u1460)) (/ doe u36524)) (/ doe u146096)) u365))
            (y (+ (* era u400) yoe))
            (doy (- doe (- (+ (* u365 yoe) (/ yoe u4)) (/ yoe u100))))
            (mp (/ (+ (* u5 doy) u2) u153))
            (month (get-mp mp))
            (year (+ y (adjust-years month)))
        )
        year
    )
)

(define-read-only (human-readable (time-stamp uint)) 
    (ok {year: (get-year time-stamp),
        month: (get-month time-stamp),
        day: (get-day time-stamp),
        hour: (get-hours time-stamp),
        minute: (get-minutes time-stamp),
        second: (get-seconds time-stamp)})
)

;; implemented this link http://howardhinnant.github.io/date_algorithms.html#civil_from_days
;; https://stackoverflow.com/questions/7136385/calculate-day-number-from-an-unix-timestamp-in-a-math-way
