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

`pnpm test` completed with exit code 0 without an environment override. The sandbox binary was loaded from this repository’s gitignored `.tools/` directory. The test suite does not claim relay signing, a mainnet fill, Sputnik DAO, Pyth, or 1Click execution. Those require the conditions in [BLOCKED.md](BLOCKED.md). Browser check (2026-11-10, after the web redesign; production build via `vite preview` on port 5371, headless Chrome through playwright-core, no env: the web reads the recorded live vault `kuroko-v-83692eef.testnet`):

| Route | 1440×900 | 375×812 | Page or console errors | Horizontal overflow |
| --- | --- | --- | --- | --- |
| `/` landing | renders | renders | 0 | 0 px |
| `/vault` | renders | renders | 0 | 0 px |
| `/position` (no wallet) | renders | renders | 0 | 0 px |
| `/position?account=kuroko-lp-346fc6f5.testnet` | renders | renders | 0 | 0 px |

- Live data on screen matched RPC: vault 0.30 USDC and 0.30 shares; the replayed history shows the 0.50 USDC deposit and 0.20 USDC withdrawal with their NearBlocks links; the read-only position shows 0.3000 USDC, 100.00% of the vault, net deposited 0.3000 USDC, earned 0.0000.
- The `/vault` "Would the rules allow this trade?" form called `check_trade` on testnet: USDC ↔ wNEAR, 0.5 USDC, 0.30% returned **Allowed**; by RPC the unlisted USDC ↔ ETH pair and a 10 bps fee both return `false`.
- With `prefers-reduced-motion: reduce` animations compute to `none` and the count-ups render their final value. Keyboard Tab shows a 2 px persimmon focus outline. Tap targets are 44 px or taller.
- The page makes no request to `127.0.0.1:3100` unless built with `VITE_SOLVER_API`, so the old `ERR_CONNECTION_REFUSED` console message is gone; Recent fills shows **Setup required: PARTNER_JWT**.
- NearBlocks' public API was rate-limited (HTTP 429) during this session, so history is read from FastNEAR's testnet transaction index (`tx.test.fastnear.com`) and the NEP-141 events inside each transaction; links still point to NearBlocks.

Previous browser check (2026-11-09) covered the old landing and `/app` terminal against the first, empty `usdc.testnet` deployment.
