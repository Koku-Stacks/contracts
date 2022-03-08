
;; token-option
;; Using STX Semi-Fungible Token standard

(impl-trait .sip013-trait-sft-standard.sip013-trait-sft-standard)

(define-constant ERR_CONTRACT_OWNER_ONLY (err u103))
(define-constant ERR-INSUFFICIENT-BALANCE (err u110))
(define-constant ERR-INVALID-SENDER (err u111))
(define-constant ERR_AMOUNT_IS_NON_POSITIVE (err u112))
(define-constant ERR_NOT_AUTHORIZED (err u1000)) 

(define-constant contract-owner tx-sender)

(define-fungible-token sft)

(define-map token-balances {token-id: uint, owner: principal} {amount: uint})
(define-map token-supplies {token-id: uint} {supply: uint})

(define-data-var token-uri (string-utf8 256) u"https://dy.finance/")
;; (define-data-var contract-owner principal tx-sender)

(define-private (set-balance (token-id uint) (amount uint) (owner principal))
	(map-set token-balances {token-id: token-id, owner: owner} {amount: amount})
)

(define-private (get-total-supply-uint (token-id uint)) 
    (default-to {supply: u0} (map-get? token-supplies {token-id: token-id}))
)

(define-private (get-balance-uint (token-id uint) (recipient principal))
	(default-to {amount: u0} (map-get? token-balances {token-id: token-id, owner: recipient}))
)

(define-read-only (get-balance (token-id uint) (recipient principal))
	(ok (get amount (get-balance-uint token-id recipient)))
)

(define-read-only (get-overall-balance (recipient principal))
	(ok (ft-get-balance sft recipient))
)

(define-read-only (get-total-supply (token-id uint))
	(ok (default-to u0 (get supply (map-get? token-supplies {token-id: token-id}))))
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

(define-public (set-token-uri (new-token-uri (string-utf8 256)))
  (begin
    (asserts! (is-eq contract-owner contract-caller) ERR_NOT_AUTHORIZED)
    (ok (var-set token-uri new-token-uri))
  )
)

(define-public (transfer (token-id uint) (amount uint) (sender principal) (recipient principal))
	(let
		(
			(sender-balance (get amount (get-balance-uint token-id sender)))
            ;; (map-get? token-balances {amount: amount})
		)
		(asserts! (is-eq tx-sender sender) ERR-INVALID-SENDER)
		(asserts! (<= amount sender-balance) ERR-INSUFFICIENT-BALANCE)
		(try! (ft-transfer? sft amount sender recipient))
		(set-balance token-id (- sender-balance amount) sender)
		(set-balance token-id (+ (get amount (get-balance-uint token-id recipient)) amount) recipient)
		(print {type: "sft_transfer_event", token-id: token-id, amount: amount, sender: sender, recipient: recipient})
		(ok true)
	)
)

(define-public (transfer-memo (token-id uint) (amount uint) (sender principal) (recipient principal) (memo (buff 34)))
	(begin
		(try! (transfer token-id amount sender recipient))
		(print memo)
		(ok true)
	)
)

(define-private (transfer-many-iter (item {token-id: uint, amount: uint, sender: principal, recipient: principal}) (previous-response (response bool uint)))
	(match previous-response prev-ok (transfer (get token-id item) (get amount item) (get sender item) (get recipient item)) prev-err previous-response)
)

(define-public (transfer-many (transfers (list 200 {token-id: uint, amount: uint, sender: principal, recipient: principal})))
	(fold transfer-many-iter transfers (ok true))
)

(define-private (transfer-many-memo-iter (item {token-id: uint, amount: uint, sender: principal, recipient: principal, memo: (buff 34)}) (previous-response (response bool uint)))
	(match previous-response prev-ok (transfer-memo (get token-id item) (get amount item) (get sender item) (get recipient item) (get memo item)) prev-err previous-response)
)

(define-public (transfer-many-memo (transfers (list 200 {token-id: uint, amount: uint, sender: principal, recipient: principal, memo: (buff 34)})))
	(fold transfer-many-memo-iter transfers (ok true))
)

(define-public (mint (token-id uint) (amount uint) (recipient principal) (supply uint))
	(begin
		(asserts! (is-eq tx-sender contract-owner) ERR_CONTRACT_OWNER_ONLY)
        (asserts! (> amount u0) ERR_AMOUNT_IS_NON_POSITIVE)
		(try! (ft-mint? sft amount recipient))
		(set-balance token-id (+ (get amount (get-balance-uint token-id recipient)) amount) recipient)
		(map-set token-supplies {token-id: token-id} {supply: (+ (get supply (get-total-supply-uint token-id)) amount)})
		(print {type: "sft_mint_event", token-id: token-id, amount: amount, recipient: recipient})
		(ok true)
	)
)

(define-public (burn (token-id uint) (amount uint) (sender principal) (supply uint)) 
	(let 
		(
			(sender-balance (get amount (get-balance-uint token-id sender)))
		)
		(asserts! (is-eq tx-sender sender) ERR-INVALID-SENDER)
		(asserts! (>= sender-balance amount) ERR-INSUFFICIENT-BALANCE)
		(try! (ft-burn? sft amount sender))
		(set-balance token-id (- sender-balance amount) sender)
		(map-set token-supplies {token-id: token-id} {supply: (- (get supply (get-total-supply-uint token-id)) amount)})
		(print {type: "sft_burn", token-id: token-id, amount: amount, sender: sender})
		(ok true)
	)
)