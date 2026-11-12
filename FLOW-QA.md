# Full-flow QA — Kuroko — 2026-11-11

The main vault browser flow now passes with the QA signer and real testnet transactions at 1440 and 375. The production wallet path remains Meteor. The earlier controlled-fixture coverage is retained below as additional error-state evidence.

## QA signer: real browser flow — PASS

Screenshots were captured locally during QA and are not committed.

Latest clean run: `f683351d-c134-4a31-a98e-5f1439030aa0`, finished `2026-11-11T16:33:07.629Z`. The app signed real transactions in Chrome at **1440×900** and **375×812**, with no human wallet or mocked receipts. There are **20 screenshots** for this clean run, including ordinary production screenshots at both widths. No overflow, raw error text, unexpected console/page errors, failed requests or HTTP errors were observed.

The earlier run exposed duplicate FastNEAR receipt snapshots: one 0.01 USDC deposit appeared four times and produced a false loss. History now deduplicates by transaction/receipt ID, ignores failed receipt logs, and keeps Earned unknown until indexed totals reconcile with contract state. That finalized deposit was resumed and withdrawn without replaying it. The clean run below then repeated both complete flows from the start.

| Step | Status | What the browser verified | Screenshots |
| --- | --- | --- | --- |
| 1. Open the vault | PASS | Live testnet state; ordinary approved screen. | `f683351d-c134-4a31-a98e-5f1439030aa0-home-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-home-375.png` |
| 2. Connect | PASS | The QA adapter exposes the existing demo account through the normal Connect control. | `f683351d-c134-4a31-a98e-5f1439030aa0-connected-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-connected-375.png` |
| 3. Enter a deposit | PASS | 0.01 USDC and the share preview. | `f683351d-c134-4a31-a98e-5f1439030aa0-deposit-input-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-deposit-input-375.png` |
| 4. Submit and wait for final | PASS | Real `ft_transfer_call`; Deposit confirmed and the exact finalized explorer hash. | `f683351d-c134-4a31-a98e-5f1439030aa0-deposit-confirmed-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-deposit-confirmed-375.png` |
| 5. Open position | PASS | 0.3100 shares, matching live balances and the actual indexed deposit receipt; Earned 0.00. | `f683351d-c134-4a31-a98e-5f1439030aa0-position-after-deposit-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-position-after-deposit-375.png` |
| 6. Enter withdrawal | PASS | Redeem the 0.0100 minted shares through the normal form. | `f683351d-c134-4a31-a98e-5f1439030aa0-withdraw-input-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-withdraw-input-375.png` |
| 7. Wait for final receipt | PASS | Real `withdraw`; Withdrawal confirmed and the exact finalized explorer hash. | `f683351d-c134-4a31-a98e-5f1439030aa0-withdrawal-confirmed-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-withdrawal-confirmed-375.png` |
| 8. Recheck position | PASS | Back to 0.3000 shares and 0.30 USDC value; USDC and vault balances match the starting snapshot; Earned 0.00. | `f683351d-c134-4a31-a98e-5f1439030aa0-position-after-withdrawal-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-position-after-withdrawal-375.png` |
| 9. Disconnect | PASS | Return to the disconnected account lookup; no key stored in local/session storage. | `f683351d-c134-4a31-a98e-5f1439030aa0-disconnected-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-disconnected-375.png` |

| Width | Action | Final transaction |
| --- | --- | --- |
| 1440 | Deposit 0.01 USDC | [7VoiQgZHiW1H2xNYuocXrTcbMZrXEEuFcpZAPeATjDJQ](https://testnet.nearblocks.io/txns/7VoiQgZHiW1H2xNYuocXrTcbMZrXEEuFcpZAPeATjDJQ) |
| 1440 | Withdraw minted shares | [5KMN9ifQGErkpZF1DzcwNZp3sDYM2ak2JmfEE6VbLzV4](https://testnet.nearblocks.io/txns/5KMN9ifQGErkpZF1DzcwNZp3sDYM2ak2JmfEE6VbLzV4) |
| 375 | Deposit 0.01 USDC | [Be35G1NBkJk54NYKVsCTLeJka4zAQWjGGNDRMMNHraBw](https://testnet.nearblocks.io/txns/Be35G1NBkJk54NYKVsCTLeJka4zAQWjGGNDRMMNHraBw) |
| 375 | Withdraw minted shares | [716jfMcfqcYnBZvj9WVM74eousjNddMqQ54WdPpcxatw](https://testnet.nearblocks.io/txns/716jfMcfqcYnBZvj9WVM74eousjNddMqQ54WdPpcxatw) |

The clean run's conservative budget charge is **0.002524721935183800000008 NEAR**. The cumulative ledger charge, including the earlier completed/resumed run, is **0.005049443870367600000016 NEAR** across **8 finalized transactions**; the cap is **0.3 NEAR**. The charge includes two yoctoNEAR per transaction conservatively, in addition to burned gas. No deployment, account creation, swap, vote opening or mainnet action was performed.

All hashes, public balance snapshots, final statuses, budget reservations and screenshot paths are in [deployments/qa-browser-2026-11-11.json](deployments/qa-browser-2026-11-11.json). The Node runner checks balances before touching credentials and before each reservation. A reservation is persisted before signing; uncertain submissions remain charged. It reads only the existing demo credential in Node and sends it directly to `page.addInitScript`. The adapter consumes the injection, signs with an in-memory key store, and never writes the key to browser storage, logs, builds or another file. Signing account/vault IDs must end in `.testnet`; the RPC is fixed to `https://test.rpc.fastnear.com`.

**Production isolation: PASS.** Ordinary production mode was built with `VITE_QA_SIGNER=1` deliberately; the build still contained zero `qa-signer`, `__KUROKO_QA` or `QA signer` markers and no QA chunk. The normal `pnpm build` was also checked with that flag set. Only `--mode qa` together with `VITE_QA_SIGNER=1` includes the adapter. No CSS, colors, fonts, layout rules or art changed.

| Change | Before | After |
| --- | --- | --- |
| Wallet-layer integration; ordinary production remains visually unchanged | `before-home-1440.png` · `before-home-375.png` | `after-production-home-1440.png` · `after-production-home-375.png` |
| Deduplicated history and reconciled position earnings | `before-position-1440.png` · `before-position-375.png` | `f683351d-c134-4a31-a98e-5f1439030aa0-position-after-withdrawal-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-position-after-withdrawal-375.png` |

The original observed false-loss screen is preserved as `f5034872-ae63-4a7d-8db3-3a26884d1d0d-failure-1440.png`. The final clean position screenshots above show the corrected result. The duplicate-receipt topology is also covered by regression tests.

Run **`pnpm test:e2e`**; see [TESTING.md](TESTING.md) for prerequisites, budget/resume behavior and the production-bundle grep. Test/build logs are under `qa-signer`, including `e2e-clean-run.log`, `tests.log` and `root-production-build.log`.

## Environment and method

Screenshots were captured locally during QA and are not committed.

- Branch: `main`. Work stayed in this repo; nothing was pushed.
- Node.js 26.5.0; pnpm 10.29.2. `pnpm install --frozen-lockfile`, `pnpm test` and `pnpm build` passed. The current suite has **21 executable tests, 0 failed, 0 skipped**: SDK 5, solver 1, MCP 1, web receipt/network/history checks 7, Rust unit 3, nearcore sandbox 4.
- Production preview: `pnpm --filter @kuroko/web exec vite preview --host 127.0.0.1 --port 5387 --strictPort`. Port 5387 was checked with `lsof` before use. Port 8787 was not used.
- Playwright `chromium.launch({channel:'chrome', headless:true})`, wrapped in the requested `withChromeLock`. One QA browser at a time; each browser closes in `finally`. Viewports: **1440×900** and **375×812**. Reduced motion was enabled for reproducible captures.
- Swap free was checked before builds. When it dropped below 500 MB, builds paused for two minutes. An expensive sandbox time advance was stopped and replaced with a local expiry fixture. No unrelated process was killed.
- **110 earlier functional-QA step screenshots**, 55 at each width. Every captured step has zero horizontal overflow (`scrollWidth <= innerWidth`), no `undefined`/`NaN`/raw JavaScript error text, no failed requests, and no unexpected console/page/HTTP errors. Four HTTP 503 responses and their browser console messages were deliberately injected for outage tests.
- The default vault/history/rule/position checks use live testnet RPC and FastNEAR. The earlier connected-wallet cases inject Meteor's extension message protocol and controlled RPC responses. Broadcast calls are blocked in that harness. A preliminary fixture lost its public identity on reload; that harness error was corrected before the final results below.
- No CSS, colors, fonts, layout rules or art changed. Changes are functional logic, factual copy, accessible labels, tests and documentation. The mechanical Impeccable detector returned no findings. This is a functional QA report, not a full WCAG certification.

Artifacts are local, outside Git, as requested:

`kuroko`

The per-step JSON files contain screenshot names, visible text, overflow, console/page errors, failed requests and HTTP errors. See `after-results.json`, `after-connected-results.json`, `after-extra-results.json`, `summary.json`, `tests.log` and `build.log`. Screenshots must be published separately if they are needed in a public demo.

## Ordered judge flow

Screenshots were captured locally during QA and are not committed.

| Step | Action and expected result | Status | Reason / evidence |
| --- | --- | --- | --- |
| 1 | Open `/`; understand the product and its testnet limits. | FIXED | The vault is both landing and detail page. The initial disconnected wallet no longer shows a false error. The pitch now says swap fills are unbuilt. `after-home-1440.png` · `after-home-375.png` |
| 2 | Browse vault value, share price, activity, account and transaction links. Toggle the chart and copy the contract account. | PASS | Live vault balance is 0.30 USDC; share price is 1.0000. Activity includes the recorded testnet runs and the browser round trips listed above. Clipboard content matches the contract account. `after-chart-price-1440.png` · `after-chart-price-375.png` · `after-copy-1440.png` · `after-copy-375.png` |
| 3 | Expand “How Kuroko earns”; inspect the rules and open the proposal form. | FIXED | The explanation separates the intended fee model from live features. No votes is a truthful empty state; a disconnected user cannot propose. `after-how-1440.png` · `after-how-375.png` · `after-propose-disconnected-1440.png` · `after-propose-disconnected-375.png` |
| 4 | Check USDC ↔ wNEAR at 0.50 USDC and 0.30%; then check USDC ↔ ETH and invalid inputs. | PASS | Allowed/refused results come from the testnet contract. Negative size and empty fee show validation feedback. `after-rule-allowed-1440.png` · `after-rule-allowed-375.png` · `after-rule-refused-1440.png` · `after-rule-refused-375.png` |
| 5 | Connect from the header, position stat, deposit card or position page. Close or block the popup. | PASS | All entry points open Meteor testnet. The login message names `kuroko-v-83692eef.testnet`, network `testnet`, type `ALL_METHODS`. Closing/blocking shows recovery guidance. `after-wallet-closed-1440.png` · `after-wallet-closed-375.png` · `after-wallet-blocked-1440.png` · `after-wallet-blocked-375.png` |
| 6 | Connect a funded testnet account without human wallet approval. | PASS | QA signer, real account, no extension or approval prompt. The production-specific manual check is noted below. `f683351d-c134-4a31-a98e-5f1439030aa0-connected-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-connected-375.png` |
| 7 | Choose Deposit or Withdraw, enter an amount, use Max and inspect the preview. | FIXED | Max controls have independent accessible names. Amounts above the balance/shares are refused locally. A pause blocks deposits but permits withdrawals, as the contract does. Connected checks use fixtures. `after-deposit-max-1440.png` · `after-deposit-max-375.png` · `after-withdraw-max-1440.png` · `after-withdraw-max-375.png` · `after-paused-withdraw-1440.png` · `after-paused-withdraw-375.png` |
| 8 | Submit a deposit/withdrawal and read the result/receipt. | PASS | Real QA browser transactions finalized at both widths; the app rendered matching confirmation hashes and updated positions. Earlier fixtures retain failed-receipt/refund coverage. `f683351d-c134-4a31-a98e-5f1439030aa0-deposit-confirmed-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-deposit-confirmed-375.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-withdrawal-confirmed-1440.png` · `f683351d-c134-4a31-a98e-5f1439030aa0-withdrawal-confirmed-375.png` |
| 9 | Open `/position`, look up the recorded depositor, clear it and look up an account with zero shares. | FIXED | Read-only lookup works without sign-in. Invalid query URLs show validation instead of a JSON exception. Account changes cannot display the previous account's balances while loading. `after-position-recorded-1440.png` · `after-position-recorded-375.png` · `after-query-invalid-1440.png` · `after-query-invalid-375.png` · `after-position-changing-1440.png` · `after-position-changing-375.png` |
| 10 | Return from the empty position to the vault; use navigation, aliases and keyboard focus. | PASS | The empty state links back to `/`; `/app` and `/vault` render the same vault. Header navigation and visible keyboard focus work. `after-position-return-1440.png` · `after-position-return-375.png` · `after-vault-alias-1440.png` · `after-vault-alias-375.png` · `after-app-alias-1440.png` · `after-app-alias-375.png` · `after-keyboard-focus-1440.png` · `after-keyboard-focus-375.png` |
| 11 | Propose rules, vote yes/no, inspect an already-voted proposal, and execute after closing. | PASS | Browser controls and receipts pass with controlled fixtures. Signed sandbox calls test a proposal, votes, duplicate-vote rejection, deposit/withdrawal locks, rejection of early execution and execution of an expired proposal. The sandbox API changes only the local proposal's expiry for the final execution test. `after-propose-receipt-1440.png` · `after-propose-receipt-375.png` · `after-vote-receipt-1440.png` · `after-vote-receipt-375.png` · `after-vote-ready-1440.png` · `after-vote-ready-375.png` · `after-execute-receipt-1440.png` · `after-execute-receipt-375.png` |
| 12 | Complete the 24-hour governance sequence on the deployed vault. | BLOCKED | The QA signer removes the wallet-approval automation boundary. A real full cycle still needs the contract’s 24-hour voting period; this run did not open a proposal or lock the judge’s vault. Signed sandbox execution and controlled browser states remain covered. |
| 13 | Load empty/slow/error data and recover. | FIXED | Loading stays explicit. Empty history is not fabricated. RPC/history failures show guidance; polling restores RPC state. Vote-fetch failure disables proposing; position refresh failures retain good values with visible warnings. `after-rpc-error-1440.png` · `after-rpc-error-375.png` · `after-rpc-recovered-1440.png` · `after-rpc-recovered-375.png` · `after-votes-error-1440.png` · `after-votes-error-375.png` · `after-position-stale-errors-1440.png` · `after-position-stale-errors-375.png` |
| 14 | Read the vault from MCP; request listen stats without a running solver. | PASS | A real stdio handshake and `get_vault_state` returned live balance `300000`; `get_listen_stats` returned an explicit tool error. The MCP process was stopped. `mcp.json` |
| 15 | Observe an Intents fill or earned fee. | BLOCKED | Relay access remains pending; filling swaps and depositor-safe mainnet custody are unbuilt. APY “—”, no fills and no votes are truthful empty states. No synthetic fill or revenue is shown as real. |

## Live testnet action evidence and budget

Screenshots were captured locally during QA and are not committed.

The earlier functional-QA pass spent public-testnet funds through `scripts/qa-testnet.mjs`. The QA signer pass above adds real browser transactions. It loaded the dedicated depositor credential by file path, checked available balances and a worst-case gas reservation, deposited **0.01 USDC**, withdrew the minted shares, and reconciled balances. It did not deploy, create accounts, wrap NEAR, swap, open votes or use mainnet. The original provisioning script, which wraps 2 NEAR, was not run.

| Action | Result | Public transaction |
| --- | --- | --- |
| Deposit 0.01 USDC | PASS; token reports `10000` raw units accepted; zero failed receipts | [4D5RnaxomSYYJhmKfuJ1yLNWiLD4ALrNUhoVCTguqCAQ](https://testnet.nearblocks.io/txns/4D5RnaxomSYYJhmKfuJ1yLNWiLD4ALrNUhoVCTguqCAQ) |
| Withdraw the minted shares | PASS; zero failed receipts; balances reconcile | [51ipDSwHXGDvwmig8Zp3xRsjvxoocFy1ZvrySLocvxdT](https://testnet.nearblocks.io/txns/51ipDSwHXGDvwmig8Zp3xRsjvxoocFy1ZvrySLocvxdT) |

Gas and attached deposit: **0.001262360967591900000001 NEAR**, below the **0.3 NEAR** cap. After the round trip: vault cash `300000`, vault shares `300000`, depositor shares `300000`, depositor USDC `332908` raw. Both transactions were independently queried again through public RPC. No additional public transaction was sent by the browser fixtures.

Local evidence: `testnet-roundtrip.json` and `receipt-verification.json`. To repeat on these existing testnet accounts, use a new report path:

```sh
node scripts/qa-testnet.mjs /absolute/path/to/new-qa-report.json
```

The script refuses an existing report and skips sending when balances or the budget are insufficient. Keep credentials private; do not attach them to the demo.

## Fixes and before/after evidence

Screenshots were captured locally during QA and are not committed.

Each pair below links 1440 and 375 screenshots. Normal visual styling is unchanged. Receipt and paused/voting cases are explicitly synthetic browser states backed by separate sandbox/live evidence.

| Fix | Before | After |
| --- | --- | --- |
| Normal disconnected Meteor state; truthful pitch | `before-home-1440.png` · `before-home-375.png` | `after-home-1440.png` · `after-home-375.png` |
| Remove generated signing-key logging from the pinned Meteor SDK | `before-wallet-closed-1440.png` · `before-wallet-closed-375.png` | `after-wallet-closed-1440.png` · `after-wallet-closed-375.png` |
| Friendly RPC errors; no invented initial share price | `before-rpc-error-1440.png` · `before-rpc-error-375.png` | `after-rpc-error-1440.png` · `after-rpc-error-375.png` |
| Vote errors replace indefinite loading; proposing is disabled without vote data | `before-votes-error-1440.png` · `before-votes-error-375.png` | `after-votes-error-1440.png` · `after-votes-error-375.png` |
| Validate direct position query URLs | `before-query-invalid-1440.png` · `before-query-invalid-375.png` | `after-query-invalid-1440.png` · `after-query-invalid-375.png` |
| Clear balances when the queried account changes | `before-position-changing-1440.png` · `before-position-changing-375.png` | `after-position-changing-1440.png` · `after-position-changing-375.png` |
| Respect paused withdrawal behavior | `before-paused-withdraw-1440.png` · `before-paused-withdraw-375.png` | `after-paused-withdraw-1440.png` · `after-paused-withdraw-375.png` |
| Reject amounts above available funds | `before-deposit-too-large-1440.png` · `before-deposit-too-large-375.png` | `after-deposit-too-large-1440.png` · `after-deposit-too-large-375.png` |
| Never confirm a refunded deposit | `before-deposit-refund-1440.png` · `before-deposit-refund-375.png` | `after-deposit-refund-1440.png` · `after-deposit-refund-375.png` |
| Never confirm a failed withdrawal receipt | `before-withdraw-failed-receipt-1440.png` · `before-withdraw-failed-receipt-375.png` | `after-withdraw-failed-receipt-1440.png` · `after-withdraw-failed-receipt-375.png` |
| Independent accessible names for Max controls | `before-connected-1440.png` · `before-connected-375.png` | `after-deposit-max-1440.png` · `after-deposit-max-375.png` |
| Show stale position refresh failures | `before-position-recorded-1440.png` · `before-position-recorded-375.png` | `after-position-stale-errors-1440.png` · `after-position-stale-errors-375.png` |

The test-token resolver now returns the accepted amount, matching the receipt semantics checked by the web. The new sandbox test verifies that a rejected receiver call refunds the sender, leaves balances unchanged, and cannot count as an accepted deposit.

## Per-screen and state evidence

Screenshots were captured locally during QA and are not committed.

All rows below were exercised at both widths. “Clean” means no unexpected page/console/HTTP error or failed request; all rows have zero horizontal overflow. Injected 503 rows are expected failure tests. External link destinations were checked against the deployment record and source; third-party availability and wallet sign-in are separate from the local app's operation.

| Case | Status and reason | Network | Screenshots |
| --- | --- | --- | --- |
| `home` | **FIXED** — Clean disconnected state and honest testnet pitch. | Clean | `after-home-1440.png` · `after-home-375.png` |
| `chart-price` | **PASS** — Chart switches from vault value to share price. | Clean | `after-chart-price-1440.png` · `after-chart-price-375.png` |
| `how` | **FIXED** — Explanation distinguishes live vault features from planned fills/fees. | Clean | `after-how-1440.png` · `after-how-375.png` |
| `propose-disconnected` | **PASS** — Form opens; submitting requires a connected shareholder. | Clean | `after-propose-disconnected-1440.png` · `after-propose-disconnected-375.png` |
| `rule-allowed` | **PASS** — Live allowed-pair check returns Allowed. | Clean | `after-rule-allowed-1440.png` · `after-rule-allowed-375.png` |
| `rule-refused` | **PASS** — Live off-list pair returns Refused. | Clean | `after-rule-refused-1440.png` · `after-rule-refused-375.png` |
| `rule-invalid` | **PASS** — Negative amount is rejected without signing. | Clean | `after-rule-invalid-1440.png` · `after-rule-invalid-375.png` |
| `rule-fee-empty` | **FIXED** — An empty fee is rejected instead of becoming zero. | Clean | `after-rule-fee-empty-1440.png` · `after-rule-fee-empty-375.png` |
| `withdraw-preview` | **PASS** — Withdrawal preview uses shares and current NAV. | Clean | `after-withdraw-preview-1440.png` · `after-withdraw-preview-375.png` |
| `deposit-preview` | **PASS** — Deposit preview shows shares for the entered USDC. | Clean | `after-deposit-preview-1440.png` · `after-deposit-preview-375.png` |
| `copy` | **PASS** — Clipboard matches the exact vault account. | Clean | `after-copy-1440.png` · `after-copy-375.png` |
| `position-disconnected` | **PASS** — Read-only account lookup is available without a wallet. | Clean | `after-position-disconnected-1440.png` · `after-position-disconnected-375.png` |
| `lookup-invalid` | **PASS** — Invalid account input shows a clear validation message. | Clean | `after-lookup-invalid-1440.png` · `after-lookup-invalid-375.png` |
| `position-recorded` | **PASS** — Recorded depositor shares/value/history read from testnet. | Clean | `after-position-recorded-1440.png` · `after-position-recorded-375.png` |
| `position-clear` | **PASS** — Clear returns to account lookup. | Clean | `after-position-clear-1440.png` · `after-position-clear-375.png` |
| `position-zero` | **PASS** — Zero-share account has a useful empty state and return link. | Clean | `after-position-zero-1440.png` · `after-position-zero-375.png` |
| `position-return` | **PASS** — Empty-position link returns to the vault. | Clean | `after-position-return-1440.png` · `after-position-return-375.png` |
| `vault-alias` | **PASS** — Direct /vault navigation renders the vault. | Clean | `after-vault-alias-1440.png` · `after-vault-alias-375.png` |
| `app-alias` | **PASS** — Legacy /app navigation renders the vault. | Clean | `after-app-alias-1440.png` · `after-app-alias-375.png` |
| `query-invalid` | **FIXED** — Invalid query URL is validated without a contract call. | Clean | `after-query-invalid-1440.png` · `after-query-invalid-375.png` |
| `wallet-closed` | **PASS** — Meteor testnet popup has the right contract; closing shows guidance. | Clean | `after-wallet-closed-1440.png` · `after-wallet-closed-375.png` |
| `wallet-blocked` | **PASS** — Blocked popup shows recovery guidance. | Clean | `after-wallet-blocked-1440.png` · `after-wallet-blocked-375.png` |
| `rpc-error` | **FIXED** — RPC error shows a friendly unavailable state and vote error. | Clean | `after-rpc-error-1440.png` · `after-rpc-error-375.png` |
| `rpc-recovered` | **PASS** — Automatic polling recovers live vault data after the fault is removed. | Clean | `after-rpc-recovered-1440.png` · `after-rpc-recovered-375.png` |
| `history-error` | **PASS** — Injected HTTP 503 gives visible retry guidance. | Injected 503 | `after-history-error-1440.png` · `after-history-error-375.png` |
| `history-empty` | **PASS** — Empty index yields explicit empty chart/activity, not fabricated rows. | Clean | `after-history-empty-1440.png` · `after-history-empty-375.png` |
| `history-malformed` | **FIXED** — Malformed index response gives a clear error instead of crashing. | Clean | `after-history-malformed-1440.png` · `after-history-malformed-375.png` |
| `loading` | **PASS** — Slow RPC shows loading and disables trade checking until rules arrive. | Clean | `after-loading-1440.png` · `after-loading-375.png` |
| `connected` | **PASS** — Synthetic Meteor connection loads the configured account and balances. Fixture. | Clean | `after-connected-1440.png` · `after-connected-375.png` |
| `deposit-max` | **FIXED** — Max fills the full USDC balance; independent accessible label. Fixture. | Clean | `after-deposit-max-1440.png` · `after-deposit-max-375.png` |
| `deposit-receipt` | **PASS** — Synthetic accepted deposit renders confirmation and receipt link. Fixture. | Clean | `after-deposit-receipt-1440.png` · `after-deposit-receipt-375.png` |
| `deposit-refund` | **FIXED** — Synthetic refund renders an error, never Deposit confirmed. Fixture. | Clean | `after-deposit-refund-1440.png` · `after-deposit-refund-375.png` |
| `withdraw-max` | **FIXED** — Max fills owned shares; independent accessible label. Fixture. | Clean | `after-withdraw-max-1440.png` · `after-withdraw-max-375.png` |
| `withdraw-failed-receipt` | **FIXED** — Failed downstream receipt cannot render Withdrawal confirmed. Fixture. | Clean | `after-withdraw-failed-receipt-1440.png` · `after-withdraw-failed-receipt-375.png` |
| `withdraw-receipt` | **PASS** — Synthetic successful withdrawal renders its receipt. Fixture. | Clean | `after-withdraw-receipt-1440.png` · `after-withdraw-receipt-375.png` |
| `deposit-too-large` | **FIXED** — Amount over balance is refused before asking the wallet to sign. Fixture. | Clean | `after-deposit-too-large-1440.png` · `after-deposit-too-large-375.png` |
| `paused-deposit` | **PASS** — Paused vault disables depositing. Fixture. | Clean | `after-paused-deposit-1440.png` · `after-paused-deposit-375.png` |
| `paused-withdraw` | **FIXED** — Paused vault still permits withdrawing, as the contract does. Fixture. | Clean | `after-paused-withdraw-1440.png` · `after-paused-withdraw-375.png` |
| `votes-error` | **FIXED** — Vote-data failure is visible and disables proposing. Fixture. | Clean | `after-votes-error-1440.png` · `after-votes-error-375.png` |
| `vote-open` | **PASS** — Open proposal renders yes/no controls and locks transfers. Fixture. | Clean | `after-vote-open-1440.png` · `after-vote-open-375.png` |
| `vote-receipt` | **PASS** — Synthetic yes vote renders Vote recorded with receipt. Fixture. | Clean | `after-vote-receipt-1440.png` · `after-vote-receipt-375.png` |
| `vote-no-receipt` | **PASS** — Synthetic no vote renders Vote recorded with receipt. Fixture. | Clean | `after-vote-no-receipt-1440.png` · `after-vote-no-receipt-375.png` |
| `vote-already-voted` | **PASS** — Both vote buttons disable for an account already in voters. Fixture. | Clean | `after-vote-already-voted-1440.png` · `after-vote-already-voted-375.png` |
| `vote-ready` | **PASS** — Closed proposal exposes Execute. Fixture. | Clean | `after-vote-ready-1440.png` · `after-vote-ready-375.png` |
| `execute-receipt` | **PASS** — Synthetic execution renders Proposal executed with receipt. Fixture. | Clean | `after-execute-receipt-1440.png` · `after-execute-receipt-375.png` |
| `propose-invalid` | **PASS** — Empty allowed-pair list is rejected. Fixture. | Clean | `after-propose-invalid-1440.png` · `after-propose-invalid-375.png` |
| `propose-receipt` | **PASS** — Synthetic proposal renders the 24-hour vote confirmation. Fixture. | Clean | `after-propose-receipt-1440.png` · `after-propose-receipt-375.png` |
| `position-connected` | **PASS** — Connected account position reads balances/history. Fixture. | Clean | `after-position-connected-1440.png` · `after-position-connected-375.png` |
| `disconnect` | **PASS** — Disconnect returns to the unconnected lookup flow. Fixture. | Clean | `after-disconnect-1440.png` · `after-disconnect-375.png` |
| `position-changing` | **FIXED** — A new account shows loading, never the previous account balance. Fixture. | Clean | `after-position-changing-1440.png` · `after-position-changing-375.png` |
| `connect-position-stat` | **PASS** — Vault position-stat connect opens Meteor testnet. | Clean | `after-connect-position-stat-1440.png` · `after-connect-position-stat-375.png` |
| `connect-deposit-card` | **PASS** — Deposit-card connect opens Meteor testnet. | Clean | `after-connect-deposit-card-1440.png` · `after-connect-deposit-card-375.png` |
| `connect-position-page` | **PASS** — Position-page connect opens Meteor testnet. | Clean | `after-connect-position-page-1440.png` · `after-connect-position-page-375.png` |
| `position-stale-errors` | **FIXED** — Failed refresh retains good data with visible state/history warnings. | Injected 503 | `after-position-stale-errors-1440.png` · `after-position-stale-errors-375.png` |
| `keyboard-focus` | **PASS** — Keyboard navigation has a visible focus indicator. | Clean | `after-keyboard-focus-1440.png` · `after-keyboard-focus-375.png` |

## Remaining boundaries

- **Manual check:** a human Meteor sign-in and approval in the ordinary production build remain to be checked. The QA signer separately verifies the same app controls, real signing, final receipts and positions without human interaction.
- **BLOCKED:** relay capture, real Intents fills, fees and safe mainnet custody. These remain outside the working prototype; see [BLOCKED.md](BLOCKED.md).
- **BLOCKED:** the full 24-hour governance cycle on the deployed vault. No live proposal was opened; the signed sandbox lifecycle and controlled browser states cover its behavior.
- The repository remains local, with no hosted demo recorded. Nick still supplies the submission identity, payout account, public repo and X/video fields in [HACKATHON_SUBMISSION_FORM.md](HACKATHON_SUBMISSION_FORM.md).
- Build output includes existing dependency warnings and a large-bundle warning. They did not prevent the build or cause an observed runtime failure.

## Cleanup

QA Chrome instances and the stdio MCP process were closed. The preview server is stopped before handoff; no server is left running by this QA. No mainnet action, push, credential disclosure or `.loom/` edit was performed.

## R3 documentation check — 2026-11-12

Checked tracked Markdown for absolute local paths; the required grep returned no matches after cleanup. Historical result rows, status words and transaction hashes are unchanged. Runtime tests executed: 0. New transactions: 0. NEAR spent: 0.
