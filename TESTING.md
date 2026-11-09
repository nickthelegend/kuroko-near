# Testing — 2026-11-09

Run from a clean clone with Node 26, pnpm 10.29.2, Rust 1.95.0 and cargo-near 0.22.0:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

`pnpm test` builds both WASM contracts on the external project volume and runs the NEAR sandbox tests in sequence. No mainnet account or Partner JWT is needed for this gate.

## Observed counts

| Suite | Real tests passed | Failed | Skipped | Evidence |
| --- | ---: | ---: | ---: | --- |
| NEAR vault Rust unit tests | 3 | 0 | 0 | Share minting at NAV, proportional withdrawal math, vote weight reuse |
| NEAR sandbox integration tests | 3 | 0 | 0 | Real nearcore sandbox receipts for forged deposit, unauthorized loss/withdrawal, constitution limits, daily pause, NEP-141 deposit and withdrawal |
| TypeScript SDK | 5 | 0 | 0 | Integer AMM math, exact-output rounding, pair and inventory refusal, missing-inventory setup reason |
| Solver service | 1 | 0 | 0 | Listen mode refuses to run without relay credential |
| MCP server | 1 | 0 | 0 | Missing vault account produces a setup error instead of fabricated state |
| Web | 0 | 0 | 0 | TypeScript check and Vite production build pass; no browser test was claimed |
| **Total** | **13** | **0** | **0** | `pnpm test`, 2026-11-09 |

The `packages/contract/fixture-token` contract implements actual NEP-141 `ft_transfer_call` and `ft_transfer` behavior on the local chain. The integration test deploys it and the vault to nearcore sandbox. The test caught an actual receiver argument mismatch: the receiver originally expected `_msg`, whereas NEP-141 sends `msg`. The fixed receiver minted shares on receipt and returned USDC on withdrawal. No RPC stubs are used.

## Live testnet verification

Deployment: [`FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2`](https://testnet.nearblocks.io/txns/FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2). The recorded [`deployments/testnet-2026-11-09.json`](deployments/testnet-2026-11-09.json) includes the account, WASM SHA-256, RPC URL, init transaction, and observed state. I re-queried `state` on `kuroko-f836334a.qday-bob-mw8rcsal.testnet` from `https://test.rpc.fastnear.com` at a final block; the vault still reported 0 shares, 0 USDC, active policy, and 30 bps minimum spread. `usdc.testnet` also answered `ft_metadata` as a six-decimal USDC NEP-141 contract. No testnet deposit transaction is claimed.

## Checks that remain blocked

The official relay requires `PARTNER_JWT`; an unauthenticated upgrade returned HTTP 401. Consequently there are no real quote request fixtures, no 30-minute capture, no relay-format signing test, and no proven wins or fills. The function-call-key constraint requested for the mainnet signer is not supported by the Verifier's key model. See [BLOCKED.md](BLOCKED.md) and [research](docs/RESEARCH.md). A local sandbox policy check is not proof that `intents.near` enforces that policy on an off-chain signed intent.

The computer-use browser host was unavailable during this run, so 375 px layout was reviewed from CSS and build output but not visually verified in a browser. The Vite build emitted a large-chunk warning for the NEAR wallet dependencies; it completed successfully.
