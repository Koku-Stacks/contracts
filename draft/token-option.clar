
;; token-option
;; Using STX Semi-Fungible Token standard

(impl-trait .sip013-trait-sft-standard.sip013-trait-sft-standard)
(impl-trait .owner-trait.owner-trait)

(define-constant ERR_CONTRACT_OWNER_ONLY (err u103))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u104))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u105))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u106))
(define-constant ERR_NOT_NEW_OWNER (err u107))
(define-constant ERR_INSUFFICIENT_BALANCE (err u110))
(define-constant ERR_INVALID_SENDER (err u111))
(define-constant ERR_AMOUNT_IS_NON_POSITIVE (err u112))
(define-constant ERR_NOT_AUTHORIZED (err u1000))

(define-fungible-token sft)

(define-map token-balances {token-id: uint, token-owner: principal} {amount: uint})
(define-map token-supplies {token-id: uint} {supply: uint})

(define-data-var token-uri (string-utf8 256) u"https://dy.finance/")
(define-data-var owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)

(define-private (set-balance (token-id uint) (amount uint) (token-owner principal))
	(map-set token-balances {token-id: token-id, token-owner: token-owner} {amount: amount})
)

(define-private (get-total-supply-uint (token-id uint)) 
    (default-to {supply: u0} (map-get? token-supplies {token-id: token-id}))
)

(define-private (get-balance-uint (token-id uint) (recipient principal))
	(default-to {amount: u0} (map-get? token-balances {token-id: token-id, token-owner: recipient}))
)

(define-read-only (get-owner)
  (ok (var-get owner)))

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

(define-public (submit-ownership-transfer (new-owner principal))
  (begin
    (asserts! (is-eq (var-get owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-none (var-get submitted-new-owner)) ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED)
    (var-set submitted-new-owner (some new-owner))
    (ok true)))

(define-public (cancel-ownership-transfer)
  (begin
    (asserts! (is-eq (var-get owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
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

(define-public (set-token-uri (new-token-uri (string-utf8 256)))
  (begin
    (asserts! (is-eq (var-get owner) contract-caller) ERR_NOT_AUTHORIZED)
    (ok (var-set token-uri new-token-uri))
  )
)

(define-public (transfer (token-id uint) (amount uint) (sender principal) (recipient principal))
	(let
		(
			(sender-balance (get amount (get-balance-uint token-id sender)))
		)
		(asserts! (is-eq tx-sender sender) ERR_INVALID_SENDER)
		(asserts! (<= amount sender-balance) ERR_INSUFFICIENT_BALANCE)
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

(define-public (mint (token-id uint) (amount uint) (recipient principal))
	(begin
		(asserts! (is-eq tx-sender (var-get owner)) ERR_CONTRACT_OWNER_ONLY)
        (asserts! (> amount u0) ERR_AMOUNT_IS_NON_POSITIVE)
		(try! (ft-mint? sft amount recipient))
		(set-balance token-id (+ (get amount (get-balance-uint token-id recipient)) amount) recipient)
		(map-set token-supplies {token-id: token-id} {supply: (+ (get supply (get-total-supply-uint token-id)) amount)})
		(print {type: "sft_mint_event", token-id: token-id, amount: amount, recipient: recipient})
		(ok true)
	)
)

(define-public (burn (token-id uint) (amount uint) (sender principal)) 
	(let 
		(
			(sender-balance (get amount (get-balance-uint token-id sender)))
		)
		(asserts! (is-eq tx-sender sender) ERR_INVALID_SENDER)
		(asserts! (>= sender-balance amount) ERR_INSUFFICIENT_BALANCE)
		(try! (ft-burn? sft amount sender))
		(set-balance token-id (- sender-balance amount) sender)
		(map-set token-supplies {token-id: token-id} {supply: (- (get supply (get-total-supply-uint token-id)) amount)})
		(print {type: "sft_burn", token-id: token-id, amount: amount, sender: sender})
		(ok true)
	)
)