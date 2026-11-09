# Kuroko build report — 2026-11-09

## What works live

- The NEAR testnet vault at [`kuroko-f836334a.qday-bob-mw8rcsal.testnet`](https://testnet.nearblocks.io/address/kuroko-f836334a.qday-bob-mw8rcsal.testnet) was deployed in [transaction `FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2`](https://testnet.nearblocks.io/txns/FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2). RPC returned transaction success and the expected vault `state`. Its cash and shares are both zero; no deposit or revenue is claimed on testnet.
- The dashboard reads the testnet vault and can prepare wallet approved deposit, withdrawal, and share vote transactions. The read-only MCP exposes vault state. The solver has an authenticated **listen-only** path and local stats endpoint; no live relay session was possible without `PARTNER_JWT`.
- Local nearcore sandbox tests used a real NEP-141 token fixture for deposit and withdrawal.

## Test result

`pnpm test` passed: **13 executable tests, 0 failed, 0 skipped** (SDK 5, solver 1, MCP 1, contract unit 3, sandbox 3). Web TypeScript and production build passed. See [TESTING.md](TESTING.md). A 375px browser visual check could not be completed because the browser access host was unavailable.

## Blocked

`PARTNER_JWT` is required for the 30-minute relay capture and real quote fixtures under the [market-maker guide](https://docs.near-intents.org/integration/market-makers/quickstart). `NEAR_MAINNET_ACCOUNT`, `NEAR_PRIVATE_KEY`, funded inventory, and Nick's approval are required for mainnet activity. A restricted custody design is still needed: a function-call key does not constrain off-chain Intents signatures under the [Verifier account model](https://docs.near-intents.org/integration/verifier-contract/account-abstraction). Sputnik DAO, a price guard (Pyth has ended NEAR support; Rhea on mainnet, relayer price on testnet), 1Click rebalance, real fills, spread revenue, and a public repo remain pending. Exact steps are in [BLOCKED.md](BLOCKED.md).

## Demo commands

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
VITE_VAULT_ACCOUNT=kuroko-f836334a.qday-bob-mw8rcsal.testnet VITE_USDC_ACCOUNT=usdc.testnet pnpm dev
```

Open the URL printed by Vite. For an agent, run:

```sh
VAULT_ACCOUNT=kuroko-f836334a.qday-bob-mw8rcsal.testnet pnpm --filter @kuroko/mcp start
```

With Partner JWT and account inventory configured in the environment, `pnpm listen` opens the authenticated mainnet relay in listen mode. It never submits quotes.
