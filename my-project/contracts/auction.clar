
;; auction
;; a simple smart contract for nft auction management

;; nft
;;

(define-non-fungible-token thing (buff 8))

;; ft
;;

(define-fungible-token bid-token)
(define-constant bid-token-price u1)

;; constants
;;

(define-constant contract-owner tx-sender)

(define-constant err-owner-only (err u100))
(define-constant err-buy-bid-token (err u101))


;; data maps and vars
;;

(define-data-var auction-started bool false)

(define-data-var thing-in-auction (buff 8) 0x00)

;; private functions
;;

;; public functions
;;

(define-public (buy-bid-token (amount uint))
  (begin
    (match (stx-transfer? (* amount bid-token-price) tx-sender contract-owner)
      ok-transfer
      (match (ft-mint? bid-token amount tx-sender)
        ok-mint (ok true)
        err-mint (err err-buy-bid-token))
      err-transfer (err err-buy-bid-token))))

(define-public (start-auction)
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set auction-started true)
    (ok true)))

(define-public (end-auction)
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set auction-started false)
    (ok true)))

(define-read-only (auction-started?)
  (var-get auction-started))