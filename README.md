# Kuroko (黒子)

**Track:** `business` (primary), `defi` (secondary). **Status:** testnet vault prototype and read-only solver monitor; mainnet market making **BLOCKED**.

Kuroko explores a business that could earn the spread by filling other people's NEAR Intents swaps. Depositors would supply USDC and set limits; a solver would price eligible requests. This repository implements the depositors' vault accounting and policy checks on NEAR testnet, an authenticated **listen-only** relay client, a dashboard, and a read-only MCP surface. It has **no Kuroko fill, no earned spread, and no safe mainnet depositor custody** yet.

## Do X → see Y

1. `pnpm install --frozen-lockfile && pnpm test && pnpm build` → 13 passing tests, zero skipped, and a Vite build. The root test command builds the vault and a real local NEP-141 token, then runs nearcore sandbox tests. It keeps the sandbox binary under this project’s ignored `.tools/` directory. See [TESTING.md](TESTING.md).
2. `VITE_VAULT_ACCOUNT=kuroko-f836334a.qday-bob-mw8rcsal.testnet VITE_USDC_ACCOUNT=usdc.testnet pnpm dev` → open `http://127.0.0.1:5173` for the landing and `/app` for the terminal. The terminal reads the deployed vault's live state from testnet RPC. Its tape says **Setup required: PARTNER_JWT** while the relay is unavailable. It shows no fills and no revenue.
3. `VAULT_ACCOUNT=kuroko-f836334a.qday-bob-mw8rcsal.testnet pnpm --filter @kuroko/mcp start` → an MCP host can call `get_vault_state` and receive live testnet state. `get_listen_stats` reports a setup error until the local solver is running.
4. Once Nick has an approved relay JWT, put the names from `.env.example` in a gitignored `.env` or process environment, set `KUROKO_ASSET_IN` and `KUROKO_ASSET_OUT` to exact `nep141:` identifiers, and run `pnpm listen`. The client subscribes to real quote events; with `NEAR_MAINNET_ACCOUNT` it computes what it **would** quote from live `intents.near` balances, and without that account it records the real request with an inventory setup reason, writes dated local capture files under ignored `packages/solver/data/`, and **sends no quote response**. Run it for at least 30 minutes and verify `/stats` on `127.0.0.1:3100`. This step has not run because the Partner JWT is absent. See [BLOCKED.md](BLOCKED.md).

The browser's deposit, withdrawal, proposal, and vote buttons sign transactions through MyNearWallet on **testnet** only. A wallet and actual testnet USDC are required for those actions. They have been tested through sandbox receipts, not through this browser session. The deployed testnet vault currently has 0 shares and 0 USDC.

## What runs and what does not

| Component | Current behavior | Evidence / limit |
| --- | --- | --- |
| `packages/contract` | `kuroko_vault` accepts NEP-141 USDC through `ft_transfer_call`, mints shares at cash NAV, burns shares for proportional withdrawals, and restores state if transfer fails. Shareholders propose and vote on allowed pairs, inventory cap, spread floor, and daily loss threshold. | 3 Rust unit tests and 3 real nearcore sandbox tests; [testnet deployment](deployments/testnet-2026-11-09.json). The loss input is an operator report and is **not** a verified settlement feed. Governance is native share voting, not Sputnik DAO. |
| `packages/sdk` | Integer constant-product AMM quote math and prequote constitution checks. | 5 local tests. These off-chain checks do not constrain a registered Verifier signing key. |
| `packages/solver` | Authenticated relay WebSocket subscription, mainnet Verifier reserve reads, listen-only tape and stats. | 1 test that missing auth fails explicitly. No real relay requests captured without `PARTNER_JWT`; no quotes sent, wins, or fills. |
| `packages/web` | Landing (`/`) with live vault state, NearBlocks v3 transactions and a live `check_trade` probe; terminal (`/app`) with the relay tape, vault NAV and deposit/withdraw, constitution votes, a propose form and the fills ledger. Explicit setup, empty and error states. Optional art goes in `packages/web/public/art/`; missing files render a designed placeholder. | TypeScript and production build pass; headless Chrome check at 1440, 390 and 375 px with no page errors or overflow (see [TESTING.md](TESTING.md)). |
| `packages/mcp` | `get_vault_state` and `get_listen_stats` are read-only tools. | Build and 1 setup-state test pass. |

## Deployment and evidence

| Network | Contract / action | Transaction and independently queryable evidence | State |
| --- | --- | --- | --- |
| NEAR testnet | `kuroko_vault` deploy + `new` | [FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2](https://testnet.nearblocks.io/txns/FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2) · [deployment record](deployments/testnet-2026-11-09.json) · [contract account](https://testnet.nearblocks.io/address/kuroko-f836334a.qday-bob-mw8rcsal.testnet) | Verified via `https://test.rpc.fastnear.com` final-state query on 2026-11-09. 0 shares, 0 USDC, 30 bps spread floor. |
| Local nearcore sandbox | NEP-141 deposit, share mint, withdrawal, forged-deposit rejection, policy limits and pause | `pnpm test` runs signed transactions against near-workspaces sandbox | 3 sandbox tests pass. Sandbox hashes are ephemeral, not public explorer transactions. |
| NEAR Intents mainnet | Relay subscription, market making, fills, revenue | No transaction exists | **BLOCKED**: partner access, inventory, and custody design. |

## NEAR features and boundaries

- **NEP-141:** the vault receives USDC via the standard `ft_transfer_call` path; the sandbox uses an actual local NEP-141 contract. The deployed testnet vault is configured for `usdc.testnet`, which reports six decimal places via `ft_metadata`.
- **NEAR Intents / `intents.near`:** the solver follows the market-maker Message Bus format and reads its own Verifier reserves from mainnet. The relay is mainnet-only and requires a Partner JWT. Kuroko remains in listen mode until the protocol and custody gates are met.
- **Function-call keys:** these restrict NEAR transaction actions; they do **not** restrict off-chain intent signatures from a key registered with `intents.near`. The requested signer restriction is therefore not claimed. A malicious or compromised registered key could bypass this vault's view check. See [research](docs/RESEARCH.md).
- **Sputnik DAO:** not integrated. The prototype uses a native one-day majority share vote and locks withdrawals while a vote is open. A real DAO integration requires a DAO account and a tested executor design.
- **1Click and Pyth:** not used at runtime. No rebalancing or price-guard claim is made. These require approved credentials, asset feed mapping, and a safe execution path.

No mainnet signing, spending, or deployment was performed. This repository is local only; it has no remote and has not been pushed or published.

## Layout

```text
packages/contract  Rust near-sdk vault, local NEP-141 test token, sandbox tests
packages/sdk       TypeScript quote math and policy evaluation
packages/solver    Authenticated listen-only relay process
packages/web       Vite + React dashboard and testnet wallet actions
packages/mcp       Read-only agent tools
docs/RESEARCH.md   Protocol research and security implications
```

## Reproduce live state

The recorded deployment uses `https://test.rpc.fastnear.com`. The following read-only command independently queries its current state:

```sh
node -e 'const a="kuroko-f836334a.qday-bob-mw8rcsal.testnet";fetch("https://test.rpc.fastnear.com",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:"verify",method:"query",params:{request_type:"call_function",finality:"final",account_id:a,method_name:"state",args_base64:"e30="}})}).then(r=>r.json()).then(j=>console.log(JSON.parse(Buffer.from(j.result.result).toString())))'
```

Only names belong in `.env.example`. The local `.near-credentials/`, `.env`, solver capture files, build outputs, and `.tools/` are gitignored. Never paste keys into an issue or demo. See [BLOCKED.md](BLOCKED.md) for the exact remaining access and architecture needs.

## Hackathon submission

The repository has not been made public or submitted. Nick must publish it before **2026-11-14 23:59 UTC**, make the demo post, and complete the human fields in [HACKATHON_SUBMISSION_FORM.md](HACKATHON_SUBMISSION_FORM.md). The final API payload requires Nick's explicit confirmation under the [event rules](https://nearhackathon.com/HACKATHON.md).

## Team and other projects

Lead: <TBD by Nick>

Other project by this lead, if any: <TBD by Nick>. The lead must disclose any second independent submission under Q-015.

## Build provenance and license

The scaffold is commit `6a91d02`; subsequent commits are this hackathon build. The official [AMM solver](https://github.com/defuse-protocol/near-intents-amm-solver) and [Rhea lending solver](https://github.com/rhea-finance/lending-near-intents-solver-golang) informed the protocol research; their code was not vendored. The local test token is a project test contract. MIT, Copyright (c) 2026 Nivesh Gajengi.
