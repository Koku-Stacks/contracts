
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

(define-constant owner-only u100)
(define-constant unable-to-buy-bid-token u101)
(define-constant useless-bid u102)
(define-constant auction-already-happened u103)
(define-constant auction-not-started u104)
(define-constant highest-bidder-unable-to-cover-bid u105)
(define-constant nft-already-minted u106)
(define-constant requested-zero-bid-tokens u107)
(define-constant maximum-number-of-bidders-reached u108)
(define-constant no-bid-token u109)


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