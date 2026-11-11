# Full-flow QA — 2026-11-11

`pnpm install --frozen-lockfile`, `pnpm test` and `pnpm build` passed during this QA. The current suite has **17 executable tests, 0 failed, 0 skipped**: SDK 5, solver 1, MCP 1, web receipt validation 3, Rust unit 3, sandbox 4. The older 13-test result below is historical.

New checks cover refunded deposits, failed withdrawal receipts, pending/incomplete wallet results, the shareholder proposal/vote/execute lifecycle, transfer locks during voting, and withdrawals while paused. The governance sandbox test expires its local proposal through the sandbox state API; it does not wait 24 hours or change a deployed contract. The local test token now returns the amount accepted by the receiver from its transfer resolver.

The bounded live testnet script deposited and withdrew 0.01 Circle testnet USDC, reconciled balances, and spent 0.001262360967591900000001 NEAR in gas and attached deposit. No mainnet action was taken. The vault balance remains 0.30 USDC, and the depositor holds 0.30 shares after the round trip.

See [FLOW-QA.md](FLOW-QA.md) for the two-width Chrome walkthrough, before/after screenshots, injected failure-state coverage, transaction links, and the human Meteor sign-in boundary.

# Testing — 2026-11-09

Command run from the repository root:

```sh
pnpm test
```

| Suite | Passed | Failed | Skipped | What it checked |
| --- | ---: | ---: | ---: | --- |
| SDK (`tsx --test`) | 5 | 0 | 0 | Integer quote math, exact-output rounding, policy rejection, missing inventory |
| Solver (`tsx --test`) | 1 | 0 | 0 | Missing Partner JWT produces an explicit setup error before network access |
| MCP (`tsx --test`) | 1 | 0 | 0 | Missing vault account is surfaced rather than invented |
| Contract unit (`cargo test`) | 3 | 0 | 0 | Share mint/burn arithmetic and vote weight |
| Vault sandbox (`near-workspaces`) | 2 | 0 | 0 | Signed calls reject forged deposit, unauthorized loss report and non-shareholder withdrawal; constitution checks and loss pause |
| Asset sandbox (`near-workspaces`) | 1 | 0 | 0 | Real local NEP-141 token transfer, share mint, withdrawal and token balance reconciliation |
| Web | TypeScript pass | 0 | 0 | `tsc --noEmit`; production `pnpm --filter @kuroko/web build` also passed |
| **Total executable tests** | **13** | **0** | **0** | Two sandbox suites run on real local nearcore |

`pnpm test` completed with exit code 0 without an environment override. The sandbox binary was loaded from this repository’s gitignored `.tools/` directory. The test suite does not claim relay signing, a mainnet fill, Sputnik DAO, Pyth, or 1Click execution. Those require the conditions in [BLOCKED.md](BLOCKED.md). Browser check (2026-11-10, second redesign: the vault page is the home page, Morpho-style; production build via `vite preview` on port 5374, headless Chrome through playwright-core, no env: the web reads the recorded live vault `kuroko-v-83692eef.testnet`):

| Route | 1440×900 | 375×812 | Page or console errors | Horizontal overflow |
| --- | --- | --- | --- | --- |
| `/` vault (home) | renders | renders | 0 | 0 px |
| `/app` and `/vault` (aliases of `/`) | renders | renders | 0 | 0 px |
| `/position` (no wallet) | renders | renders | 0 | 0 px |
| `/position?account=kuroko-lp-346fc6f5.testnet` | renders | renders | 0 | 0 px |

- Live data on screen matched RPC: total deposits 0.30 USDC, share price 1.0000 USDC; the activity table shows the 0.50 USDC deposit and the 0.20 USDC withdrawal with dates and NearBlocks links; the read-only position shows 0.30 USDC, 0.3000 shares, 100% of the vault, net deposited 0.30 USDC, earned 0.00.
- The "Check a trade against the rules" form called `check_trade` on testnet: USDC ↔ wNEAR, 0.50 USDC at 0.30% returned **Allowed**; USDC ↔ ETH returned **Refused**.
- With `prefers-reduced-motion: reduce` the fade-ins and skeleton pulse are off. Keyboard Tab shows a 2 px green focus outline. Buttons, tabs, the chart toggle and form fields are 44 px or taller.
- The page makes no request to `127.0.0.1:3100` unless built with `VITE_SOLVER_API`; the activity section shows one line: Swap fills: none yet (Setup required: PARTNER_JWT).
- History is read from FastNEAR's testnet transaction index (`tx.test.fastnear.com`) and the NEP-141 events inside each transaction (NearBlocks' public API rate-limited this session); links still point to NearBlocks.

Earlier browser checks (2026-11-09 and the first 2026-11-10 pass) covered the old landing, `/app` terminal and art-led vault page, all since replaced.

## Wallet: Meteor Wallet replaces MyNearWallet (2026-11-10)

MyNearWallet's testnet pop-up now refuses every app ("MyNearWallet can't connect to apps anymore … no longer accepts new app connections"), so the old **Connect** dead-ended. The web app now uses `@near-wallet-selector/core` 10.1.4 with `@near-wallet-selector/meteor-wallet` 10.1.4; MyNearWallet is removed. `pnpm-workspace.yaml` gives the wallet packages their own near-api-js 6.2.5 (Meteor's SDK peer) and `@near-js/utils` 2.5.1 (the `@near-js` 2.x peer); `packages/web` keeps near-api-js 5.0.0.

Checked against `vite build && vite preview` in headless Chrome at 1440×900 and 375×812:

- `/` → **Connect** opens a pop-up at `https://wallet.meteorwallet.app/connect/testnet/login?…`. The request the app posts into it reads `actionType: login`, `network: testnet`, `contract_id: kuroko-v-83692eef.testnet`, `type: ALL_METHODS` with a fresh public key.
- Closing the pop-up shows "The wallet closed before you signed in." under the header. With pop-ups blocked (`window.open` returning null) it shows "Your browser blocked the wallet window. Allow pop-ups for this site, then try again."
- 0 console errors, no horizontal overflow at 375.

Not done: a full Meteor sign-in, a browser deposit and its approval. Meteor's site sits behind Cloudflare, which shows headless Chrome "Sorry, you have been blocked", and signing in needs a person with a Meteor testnet account (see BLOCKED.md).

