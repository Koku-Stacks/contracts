
;; token-option
;; <add a description here>

(impl-trait .sft-trait.sft-trait)

(define-fungible-token sft)
(define-map token-balances {token-id: uint, owner: principal} uint)
(define-map token-supplies uint uint)

(define-constant contract-owner tx-sender)

(define-constant err-owner-only (err u100))
(define-constant err-insufficient-balance (err u1))
(define-constant err-invalid-sender (err u4))

(define-private (set-balance (token-id uint) (balance uint) (owner principal))
	(map-set token-balances {token-id: token-id, owner: owner} balance)
)

(define-private (get-balance-uint (token-id uint) (recipient principal))
	(default-to u0 (map-get? token-balances {token-id: token-id, owner: recipient}))
)

(define-read-only (get-balance (token-id uint) (recipient principal))
	(ok (get-balance-uint token-id recipient))
)

(define-read-only (get-overall-balance (recipient principal))
	(ok (ft-get-balance sft recipient))
)

(define-read-only (get-total-supply (token-id uint))
	(ok (default-to u0 (map-get? token-supplies token-id)))
)

(define-read-only (get-overall-supply)
	(ok (ft-get-supply sft))
)

(define-read-only (get-decimals (token-id uint))
	(ok u0)
)

(define-read-only (get-token-uri (token-id uint))
	(ok none)
)

(define-public (transfer (token-id uint) (amount uint) (sender principal) (recipient principal))
	(let
		(
			(sender-balance (get-balance-uint token-id sender))
		)
		(asserts! (is-eq tx-sender sender) err-invalid-sender)
		(asserts! (<= amount sender-balance) err-insufficient-balance)
		(try! (ft-transfer? sft amount sender recipient))
		(set-balance token-id (- sender-balance amount) sender)
		(set-balance token-id (+ (get-balance-uint token-id recipient) amount) recipient)
		(print {type: "sft_transfered", token-id: token-id, amount: amount, sender: sender, recipient: recipient})
		(ok true)
	)
)



(define-public (mint (token-id uint) (amount uint) (recipient principal))
	(begin
		(asserts! (is-eq tx-sender contract-owner) err-owner-only)
		(try! (ft-mint? sft amount recipient))
		(set-balance token-id (+ (get-balance-uint token-id recipient) amount) recipient)
		(map-set token-supplies token-id (+ (unwrap-panic (get-total-supply token-id)) amount))
		(print {type: "sft_minted", token-id: token-id, amount: amount, recipient: recipient})
		(ok true)
	)
)

(define-public (burn (token-id uint) (amount uint) (sender principal)) 
	(let 
		(
			(sender-balance (get-balance-uint token-id sender))
		)
		(asserts! (is-eq tx-sender sender) err-invalid-sender)
		(asserts! (>= sender-balance amount) err-insufficient-balance)
		(try! (ft-burn? sft amount sender))
		(set-balance token-id (- sender-balance amount) sender)
		(map-set token-supplies token-id (- (unwrap-panic (get-total-supply token-id)) amount))
		(print {type: "sft_burned", token-id: token-id, amount: amount, sender: sender})
		(ok true)
	)
)