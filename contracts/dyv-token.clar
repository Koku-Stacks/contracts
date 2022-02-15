;;  Business Source License 1.1

;;  Copyright (c) 2022 Koku

;;  License text copyright (c) 2017 MariaDB Corporation Ab, All Rights Reserved. "Business Source License" is a trademark of MariaDB Corporation Ab.

;;  Parameters
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;;  Licensor:             Koku

;;  Licensed Work:        Koku V1 CoreThe Licensed Work is (c) 2022 Koku

;;  Additional Use Grant: Any uses listed and defined at daikoku.network

;;  Change Date:          The earlier of 2025-01-01 or a date specified at daikoku.network

;;  Change License:       GNU General Public License v2.0 or later

;;  Terms
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;;  The Licensor hereby grants you the right to copy, modify, create derivative works,redistribute, and make non-production use of the Licensed Work. The Licensor maymake an Additional Use Grant, above, permitting limited production use.

;;  Effective on the Change Date, or the fourth anniversary of the first publicly available distribution of a specific version of the Licensed Work under this License, whichever comes first, the Licensor hereby grants you rights under the terms of the Change License, and the rights granted in the paragraph above terminate.

;;  If your use of the Licensed Work does not comply with the requirements currently ineffect as described in this License, you must purchase a commercial license from the Licensor, its affiliated entities, or authorized resellers, or you must refrain fromusing the Licensed Work.

;;  All copies of the original and modified Licensed Work, and derivative works of the Licensed Work, are subject to this License. This License applies separately for each version of the Licensed Work and the Change Date may vary for each version of the Licensed Work released by Licensor.

;;  You must conspicuously display this License on each original or modified copy of the Licensed Work. If you receive the Licensed Work in original or modified form from athird party, the terms and conditions set forth in this License apply to your use of that work.

;;  Any use of the Licensed Work in violation of this License will automatically terminate your rights under this License for the current and all other versions of the Licensed Work.

;;  This License does not grant you any right in any trademark or logo of Licensor or its affiliates (provided that you may use a trademark or logo of Licensor as expressly required by this License).

;;  TO THE EXTENT PERMITTED BY APPLICABLE LAW, THE LICENSED WORK IS PROVIDED ON AN "AS IS"BASIS. LICENSOR HEREBY DISCLAIMS ALL WARRANTIES AND CONDITIONS, EXPRESS OR IMPLIED, INCLUDING (WITHOUT LIMITATION) WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULARPURPOSE, NON-INFRINGEMENT, AND TITLE.

;;  MariaDB hereby grants you permission to use this License’s text to license your works, and to refer to it using the trademark "Business Source License", as long as you comply with the Covenants of Licensor below.

;;  Covenants of Licensor
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;;  In consideration of the right to use this License’s text and the "Business Source License" name and trademark, Licensor covenants to MariaDB, and to all other recipients of the licensed work to be provided by Licensor:

;;  1. To specify as the Change License the GPL Version 2.0 or any later version, or a license that is compatible with GPL Version 2.0 or a later version, where "compatible" means that software provided under the Change License can be included in a program with software providedunder GPL Version 2.0 or a later version. Licensor may specify additional Change Licenses without limitation.

;;  2. To either: (a) specify an additional grant of rights to use that does not impose any additional restriction on the right granted in this License, as the Additional Use Grant; or(b) insert the text "None".

;;  3. To specify a Change Date.

;;  4. Not to modify this License in any other way.

;;  Notice
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;;  The Business Source License (this document, or the "License") is not an Open Source license. However, the Licensed Work will eventually be made available under an Open Source License, as stated in this License.

(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_CONTRACT_ALREADY_AUTHORIZED (err u100))
(define-constant ERR_CONTRACT_IS_NOT_AUTHORIZED (err u101))
(define-constant ERR_NOT_AUTHORIZED (err u102))
(define-constant ERR_TOKEN_HOLDER_ONLY (err u4))
(define-constant ERR_CONTRACT_OWNER_ONLY (err u103))
(define-constant ERR_OWNERSHIP_TRANSFER_ALREADY_SUBMITTED (err u104))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CANCEL (err u105))
(define-constant ERR_NO_OWNERSHIP_TRANSFER_TO_CONFIRM (err u106))
(define-constant ERR_NOT_NEW_OWNER (err u107))
(define-constant ERR_INSUFFICIENT_TOKENS_TO_MINT (err u108))
(define-constant ERR_CONTRACT_LOCKED (err u109))

;; this considers a max supply of 21_000_000 tokens with six decimal places
(define-fungible-token token u21000000000000)

(define-data-var owner principal tx-sender)
(define-data-var submitted-new-owner (optional principal) none)
(define-data-var token-uri (string-utf8 256) u"www.token.com")
(define-data-var remaining-tokens-to-mint uint u21000000000000)
(define-data-var contract-lock bool false)

(define-map authorized-contracts {authorized: principal} bool)

(define-read-only (get-owner)
  (var-get owner))

(define-read-only (is-authorized (contract principal))
  (is-some (map-get? authorized-contracts {authorized: contract})))

(define-read-only (get-contract-lock)
  (var-get contract-lock)
)

(define-read-only (get-token-uri)
  (ok (some (var-get token-uri))))

(define-read-only (get-remaining-tokens-to-mint)
  (var-get remaining-tokens-to-mint))

(define-read-only (get-name)
  (ok "dYrivaNative"))

(define-read-only (get-symbol)
  (ok "DYV"))

(define-read-only (get-decimals)
  (ok u6))

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance token account)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply token)))

;; public functions
(define-public (set-contract-lock (lock bool))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (ok (var-set contract-lock lock))
  )
)

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

(define-public (add-authorized-contract (new-contract principal))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-none (map-get? authorized-contracts {authorized: new-contract})) ERR_CONTRACT_ALREADY_AUTHORIZED)
    (map-insert authorized-contracts {authorized: new-contract} true)
    (ok true)))

(define-public (revoke-authorized-contract (contract principal))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (asserts! (is-some (map-get? authorized-contracts {authorized: contract})) ERR_CONTRACT_IS_NOT_AUTHORIZED)
    (map-delete authorized-contracts {authorized: contract})
    (ok true)))

(define-public (set-token-uri (new-token-uri (string-utf8 256)))
  (begin
    (asserts! (is-eq (get-owner) tx-sender) ERR_CONTRACT_OWNER_ONLY)
    (var-set token-uri new-token-uri)
    (ok true)))

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq (get-contract-lock) false) ERR_CONTRACT_LOCKED)
    (asserts! (is-authorized tx-sender) ERR_NOT_AUTHORIZED)
    (asserts! (<= amount (get-remaining-tokens-to-mint)) ERR_INSUFFICIENT_TOKENS_TO_MINT)
    (try! (ft-mint? token amount recipient))
    (var-set remaining-tokens-to-mint (- (get-remaining-tokens-to-mint) amount))
    (ok true)))

(define-public (burn (amount uint))
  (begin
    (asserts! (is-eq (get-contract-lock) false) ERR_CONTRACT_LOCKED)
    (ft-burn? token amount tx-sender))
  )

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq (get-contract-lock) false) ERR_CONTRACT_LOCKED)
    (asserts! (is-eq tx-sender sender) ERR_TOKEN_HOLDER_ONLY)
    (try! (ft-transfer? token amount sender recipient))
    (match memo some-memo (print some-memo) 0x)
    (ok true)))
