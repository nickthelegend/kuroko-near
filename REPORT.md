# Kuroko build report — updated 2026-11-11

This report includes the Nov 11 full-flow QA. No contract was redeployed. The bounded testnet deposit/withdrawal round trip and browser evidence are recorded in [FLOW-QA.md](FLOW-QA.md).

## What works live

- The current NEAR testnet vault is `kuroko-v-83692eef.testnet`, configured for Circle testnet USDC. The Nov 10 script run deposited 0.5 USDC and withdrew 0.2 USDC worth of shares. Its recorded final state is 0.3 USDC and 0.3 shares. Exact transaction links and amounts are in [deployments/testnet-live.json](deployments/testnet-live.json). No Kuroko swap fill or revenue is claimed.
- The first vault, `kuroko-f836334a.qday-bob-mw8rcsal.testnet`, used `usdc.testnet` and had zero deposits. It is superseded by the Circle-USDC vault above; see [the first deployment record](deployments/testnet-2026-11-09.json).
- The dashboard reads the testnet vault and can prepare wallet approved deposit, withdrawal, and share vote transactions. The read-only MCP exposes vault state. The solver has an authenticated **listen-only** path and local stats endpoint; no live relay session was possible without `PARTNER_JWT`.
- Local nearcore sandbox tests used a real NEP-141 token fixture for deposit and withdrawal.

## Test result

The Nov 11 `pnpm test` run passed: **17 executable tests, 0 failed, 0 skipped** (SDK 5, solver 1, MCP 1, web receipt validation 3, contract unit 3, sandbox 4). Web TypeScript and production build passed. Nov 10 browser checks at 1440 and 375 px also passed with no page errors or horizontal overflow. Meteor connection and popup errors were checked; a full browser sign-in and deposit remain unverified. See [TESTING.md](TESTING.md).

## Blocked

`PARTNER_JWT` is required for the 30-minute relay capture and real quote fixtures under the [market-maker guide](https://docs.near-intents.org/integration/market-makers/quickstart). `NEAR_MAINNET_ACCOUNT`, `NEAR_PRIVATE_KEY`, funded inventory, and Nick's approval are required for mainnet activity. A restricted custody design is still needed: a function-call key does not constrain off-chain Intents signatures under the [Verifier account model](https://docs.near-intents.org/integration/verifier-contract/account-abstraction). Sputnik DAO, a price guard (Pyth has ended NEAR support; Rhea on mainnet, relayer price on testnet), 1Click rebalance, real fills, spread revenue, and a public repo remain pending. Exact steps are in [BLOCKED.md](BLOCKED.md).

## Demo commands

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

Open `http://127.0.0.1:5371/`. The default accounts come from `deployments/testnet-live.json`. Test prerequisites and read-only demo steps are in [README.md](README.md). For an agent, run:

```sh
VAULT_ACCOUNT=kuroko-v-83692eef.testnet pnpm --filter @kuroko/mcp start
```

With Partner JWT and account inventory configured in the environment, `pnpm listen` opens the authenticated mainnet relay in listen mode. It never submits quotes.
