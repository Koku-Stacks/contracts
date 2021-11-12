
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

(define-data-var auction-happening bool false)
(define-data-var auction-happened bool false)

(define-data-var thing-in-auction (buff 8) 0x00)

(define-data-var bidders (list 100 principal) (list))

(define-map bids principal uint)

;; private functions
;;

(define-private (get-bid (bidder principal))
  (default-to u0 (map-get? bids bidder)))

(define-private (contains? (bidder principal))
  (match (index-of (var-get bidders) bidder)
    some-index true
    false))

(define-private (compare-bidders (bidder-1 principal) (bidder-2 principal))
  (let ((bid-1 (get-bid bidder-1))
        (bid-2 (get-bid bidder-2)))
    (if (> bid-1 bid-2)
      bidder-1
      bidder-2)))

(define-private (get-highest-bidder)
  (fold compare-bidders (var-get bidders) contract-owner))

(define-private (transfer-thing)
  (let ((highest-bidder (get-highest-bidder)))
    (match (stx-transfer? (get-bid highest-bidder) highest-bidder contract-owner)
      ok-transfer (nft-transfer? thing (var-get thing-in-auction) contract-owner highest-bidder)
      err-transfer (err highest-bidder-unable-to-cover-bid))))

;; public functions
;;

(define-read-only (get-highest-bid)
  (get-bid (get-highest-bidder)))

(define-public (place-bid (bid uint))
  (begin
    (asserts! (not (var-get auction-happened)) (err auction-already-happened))
    (asserts! (var-get auction-happening) (err auction-not-started))
    (asserts! (> bid (get-highest-bid)) (err useless-bid))
    (asserts! (>= (ft-get-balance bid-token tx-sender) u1) (err no-bid-token))
    (if (contains? tx-sender)
      (begin
        (map-set bids tx-sender bid)
        (ft-burn? bid-token u1 tx-sender))
      (match (as-max-len? (append (var-get bidders) tx-sender) u100)
        updated-bidders
        (begin
          (map-set bids tx-sender bid)
          (var-set bidders updated-bidders)
          (ft-burn? bid-token u1 tx-sender))
        (err maximum-number-of-bidders-reached)))))

(define-public (buy-bid-token (amount uint))
  (begin
    (asserts! (not (var-get auction-happened)) (err auction-already-happened))
    (match (stx-transfer? (* amount bid-token-price) tx-sender contract-owner)
      ok-transfer
      (match (ft-mint? bid-token amount tx-sender)
        ok-mint (ok true)
        err-mint (err requested-zero-bid-tokens))
      err-transfer (err unable-to-buy-bid-token))))

(define-public (start-auction)
  (begin
    (asserts! (is-eq tx-sender contract-owner) (err owner-only))
    (match (nft-mint? thing (var-get thing-in-auction) contract-owner)
      ok-mint
      (begin
        (var-set auction-happening true)
        (ok true))
      err-mint
      (err nft-already-minted))))

(define-public (end-auction)
  (begin
    (asserts! (is-eq tx-sender contract-owner) (err owner-only))
    (let ((highest-bidder (get-highest-bidder)))
      (match (transfer-thing)
        ok-transfer
        (begin
          (var-set auction-happening false)
          (var-set auction-happened true)
          (ok true))
        err-transfer
        (begin
          (map-delete bids highest-bidder)
          (err highest-bidder-unable-to-cover-bid))))))

(define-read-only (auction-happening?)
  (var-get auction-happening))