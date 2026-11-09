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

`pnpm test` completed with exit code 0 without an environment override. The sandbox binary was loaded from this repository’s gitignored `.tools/` directory. The test suite does not claim relay signing, a mainnet fill, Sputnik DAO, Pyth, or 1Click execution. Those require the conditions in [BLOCKED.md](BLOCKED.md). Browser check (2026-11-09, production build via `vite preview`, headless Chrome through playwright-core, `VITE_VAULT_ACCOUNT=kuroko-f836334a.qday-bob-mw8rcsal.testnet VITE_USDC_ACCOUNT=usdc.testnet`):

| Route | 1440×900 | 390×844 | 375×812 | Page errors | Horizontal overflow |
| --- | --- | --- | --- | --- | --- |
| `/` landing | renders | renders | renders | 0 | 0 px |
| `/app` terminal | renders | renders | renders | 0 | 0 px |

The only console message is `ERR_CONNECTION_REFUSED` for `127.0.0.1:3100/stats`: the local listen service is not running because `PARTNER_JWT` is absent, and the tape shows **Setup required: PARTNER_JWT**. The landing's "Ask the vault" form called the testnet `check_trade` view: `USDC / wNEAR · 0.5 USDC · 30 bps` returned **Passes**, and the unlisted `USDC / ETH` pair returned **Refused**.

A separate NEAR testnet deployment was independently re-queried by RPC: transaction [`FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2`](https://testnet.nearblocks.io/txns/FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2) returned success and the vault's `state` returned the constitution in [deployment evidence](deployments/testnet-2026-11-09.json).
