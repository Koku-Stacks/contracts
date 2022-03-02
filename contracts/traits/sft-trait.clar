
;; sft-trait
;; <add a description here>

(define-trait sft-trait
	(
		;; Get a token type balance of the passed principal.
		(get-balance (uint principal) (response uint uint))

		;; Get the total SFT balance of the passed principal.
		(get-overall-balance (principal) (response uint uint))

		;; Get the current total supply of a token type.
		(get-total-supply (uint) (response uint uint))

		;; Get the overall SFT supply.
		(get-overall-supply () (response uint uint))

		;; Get the number of decimal places of a token type.
		(get-decimals (uint) (response uint uint))

		;; Get an optional token URI that represents metadata for a specific token.
		(get-token-uri (uint) (response (optional (string-utf8 256)) uint))

		;; Transfer from one principal to another.
		(transfer (uint uint principal principal) (response bool uint))

        ;; Mint the token and verify the address response
        (mint (uint uint principal) (response bool uint))

        ;; Burn the token when not needed and verify the address response
        (burn (uint uint principal) (response bool uint))  
	)
)

