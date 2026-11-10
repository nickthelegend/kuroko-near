# Kuroko (黒子)

**Deposit USDC; Kuroko fills other people's swaps on NEAR Intents and shares the fees with you.**

**Track:** `business` (primary), `defi` (secondary). **Status:** testnet vault with a real deposit and withdrawal on Circle's testnet USDC; swap filling and mainnet market making **BLOCKED** (relay access and a restricted signer).

Every NEAR Intents swap is filled by a market maker (a "solver") that quotes a price and keeps a small fee. Kuroko pools depositors' USDC to be that market maker, inside rules the depositors vote on (allowed pairs, largest trade, smallest fee, daily loss limit), and the fees raise the value of every share. This repository implements the vault (shares, rules, votes) on NEAR testnet, a web app, an authenticated **listen-only** relay client and a read-only MCP surface. It has **no Kuroko fill, no earned fee, and no safe mainnet depositor custody** yet, and the app says so on every screen.

## Do X → see Y

1. `pnpm install --frozen-lockfile && pnpm test && pnpm build` → 13 passing tests, zero skipped, and a Vite build. The root test command builds the vault and a real local NEP-141 token, then runs nearcore sandbox tests. It keeps the sandbox binary under this project’s ignored `.tools/` directory. See [TESTING.md](TESTING.md).
2. `pnpm dev` → open `http://127.0.0.1:5371`. With no env it reads the vault from the recorded live run (`deployments/testnet-live.json`); `VITE_VAULT_ACCOUNT` and `VITE_USDC_ACCOUNT` override it. Two pages, laid out like a Morpho or Hyperliquid vault page (no illustrations; the numbers are the design):
   - `/` is the vault (`/vault` and the old `/app` show the same page): the one-line pitch, four numbers (total deposits, share price, your position, APY "—" until real fills), a chart of the vault's USDC and share price replayed from every NEP-141 `ft_transfer` event of the vault's transactions (FastNEAR's public testnet transaction index), one deposit/withdraw panel, an activity table with NearBlocks links and one line on fills (Setup required: PARTNER_JWT, no fake rows), the rules with a live `check_trade` test, votes and a propose form, and a collapsed "How Kuroko earns".
   - `/position`: value, shares, share of the vault and earned, plus your own transactions. Without a wallet you can look up any account read-only, for example `/position?account=kuroko-lp-346fc6f5.testnet` (the depositor from the recorded run).
3. `VAULT_ACCOUNT=kuroko-v-83692eef.testnet pnpm --filter @kuroko/mcp start` → an MCP host can call `get_vault_state` and receive live testnet state. `get_listen_stats` reports a setup error until the local solver is running.
4. Once Nick has an approved relay JWT, put the names from `.env.example` in a gitignored `.env` or process environment, set `KUROKO_ASSET_IN` and `KUROKO_ASSET_OUT` to exact `nep141:` identifiers, and run `pnpm listen`. The client subscribes to real quote events; with `NEAR_MAINNET_ACCOUNT` it computes what it **would** quote from live `intents.near` balances, and without that account it records the real request with an inventory setup reason, writes dated local capture files under ignored `packages/solver/data/`, and **sends no quote response**. Run it for at least 30 minutes and verify `/stats` on `127.0.0.1:3100`. This step has not run because the Partner JWT is absent. See [BLOCKED.md](BLOCKED.md).

5. `node scripts/live-testnet.mjs` → the recorded live run, reproducible with fresh accounts: it creates a vault account and a depositor through the testnet account helper, deploys `kuroko_vault` configured for Circle's testnet USDC (`3e2210e1…cb8af`), swaps 2 wNEAR for USDC on Ref Finance testnet pool 1845, deposits 0.5 USDC and withdraws 0.2 USDC worth of shares. Every step is a signed testnet transaction written to `deployments/testnet-live.json`; keys stay in the gitignored `.near-credentials/`.

The browser's deposit, withdrawal, proposal and vote buttons sign through [Meteor Wallet](https://wallet.meteorwallet.app) on **testnet** only and need a wallet holding Circle testnet USDC ([Circle faucet](https://faucet.circle.com/), NEAR testnet). The recorded deposit and withdrawal were signed by the script above, not by a browser wallet.

**Connecting a wallet.** You need a `.testnet` account in Meteor Wallet (create or import one there; NEAR's guide is [Create an account](https://docs.near.org/getting-started/create-account), and free testnet NEAR comes from [near-faucet.io](https://near-faucet.io)). **Connect** opens Meteor in a pop-up (or its browser extension) at `wallet.meteorwallet.app/connect/testnet/login`, asking for a function-call key on the vault; the result is posted back to the page, so there is no redirect. A withdrawal, proposal or vote is then signed by that key; a deposit (a USDC `ft_transfer_call` with 1 yocto) opens Meteor for approval. A blocked pop-up or a closed wallet window shows a plain line under the header. The app uses NEAR Wallet Selector 10.1.4 with its Meteor module; MyNearWallet was removed on 2026-11-10, because its testnet pop-up now answers "MyNearWallet can't connect to apps anymore" and points to Meteor.

## What runs and what does not

| Component | Current behavior | Evidence / limit |
| --- | --- | --- |
| `packages/contract` | `kuroko_vault` accepts NEP-141 USDC through `ft_transfer_call`, mints shares at cash NAV, burns shares for proportional withdrawals, and restores state if transfer fails. Shareholders propose and vote on allowed pairs, inventory cap, spread floor, and daily loss threshold. | 3 Rust unit tests and 3 real nearcore sandbox tests; [testnet deployment](deployments/testnet-2026-11-09.json). The loss input is an operator report and is **not** a verified settlement feed. Governance is native share voting, not Sputnik DAO. |
| `packages/sdk` | Integer constant-product AMM quote math and prequote constitution checks. | 5 local tests. These off-chain checks do not constrain a registered Verifier signing key. |
| `packages/solver` | Authenticated relay WebSocket subscription, mainnet Verifier reserve reads, listen-only tape and stats. | 1 test that missing auth fails explicitly. No real relay requests captured without `PARTNER_JWT`; no quotes sent, wins, or fills. |
| `packages/web` | Vault page (`/`, aliases `/vault` and `/app`) and position page (`/position`), laid out like a Morpho vault page: four numbers, value chart, one deposit/withdraw panel, plain activity and rules tables. Reads vault state from testnet RPC and history from FastNEAR's testnet transaction index. Fills are one line reading Setup required: PARTNER_JWT; the solver is only polled when `VITE_SOLVER_API` is set. Explicit loading, empty and error states. | TypeScript and production build pass; headless Chrome check at 1440 and 375 px with no page errors or overflow (see [TESTING.md](TESTING.md)). |
| `packages/mcp` | `get_vault_state` and `get_listen_stats` are read-only tools. | Build and 1 setup-state test pass. |

## Deployment and evidence

| Network | Contract / action | Transaction and independently queryable evidence | State |
| --- | --- | --- | --- |
| NEAR testnet | Live vault `kuroko-v-83692eef.testnet` on Circle testnet USDC: deploy, deposit 0.5 USDC, withdraw 0.2 USDC | deploy [iYayUZVz…](https://testnet.nearblocks.io/txns/iYayUZVzWXJCLUMDkuRLGWx5UurrUhddtXSEafHNo2Y) · swap on Ref [DmByBMyA…](https://testnet.nearblocks.io/txns/DmByBMyAse5ya1Uf71xDhM9bWJcXL3oUpR9GFHy8T8Tx) · deposit [BkreUSyB…](https://testnet.nearblocks.io/txns/BkreUSyBXxX2qNjPFqZTwVFWdPseGiF4qQHErcW1Pcnq) · withdraw [4dZANf4G…](https://testnet.nearblocks.io/txns/4dZANf4GyFrjVXPUeZV6hmdWRXvqyXdPo8gDjC2NYXRh) · [record](deployments/testnet-live.json) | Verified by RPC on 2026-11-10: 0.3 shares, 0.3 USDC; the depositor's USDC balance reconciles (632908 − 500000 + 200000 = 332908 raw). Same wasm sha256 `924312…2442` as the first deploy. |
| NEAR testnet (first deploy, superseded) | `kuroko_vault` deploy + `new` on `usdc.testnet` (no public mint, no pool, so no deposit was possible) | [FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2](https://testnet.nearblocks.io/txns/FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2) · [deployment record](deployments/testnet-2026-11-09.json) · [contract account](https://testnet.nearblocks.io/address/kuroko-f836334a.qday-bob-mw8rcsal.testnet) | Verified via `https://test.rpc.fastnear.com` final-state query on 2026-11-09. 0 shares, 0 USDC, 30 bps spread floor. |
| Local nearcore sandbox | NEP-141 deposit, share mint, withdrawal, forged-deposit rejection, policy limits and pause | `pnpm test` runs signed transactions against near-workspaces sandbox | 3 sandbox tests pass. Sandbox hashes are ephemeral, not public explorer transactions. |
| NEAR Intents mainnet | Relay subscription, market making, fills, revenue | No transaction exists | **BLOCKED**: partner access, inventory, and custody design. |

## NEAR features and boundaries

- **NEP-141:** the vault receives USDC via the standard `ft_transfer_call` path; the sandbox uses an actual local NEP-141 contract. The live testnet vault is configured for Circle's testnet USDC (`3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`, six decimals via `ft_metadata`); its deposit and withdrawal emitted standard NEP-141 `ft_transfer` events, which the web app replays for the vault's history.
- **NEAR Intents / `intents.near`:** the solver follows the market-maker Message Bus format and reads its own Verifier reserves from mainnet. The relay is mainnet-only and requires a Partner JWT. Kuroko remains in listen mode until the protocol and custody gates are met.
- **Function-call keys:** these restrict NEAR transaction actions; they do **not** restrict off-chain intent signatures from a key registered with `intents.near`. The requested signer restriction is therefore not claimed. A malicious or compromised registered key could bypass this vault's view check. See [research](docs/RESEARCH.md).
- **Sputnik DAO:** not integrated. The prototype uses a native one-day majority share vote and locks withdrawals while a vote is open. A real DAO integration requires a DAO account and a tested executor design.
- **1Click and price guard:** not used at runtime. No rebalancing or price-guard claim is made. Pyth Core has ended NEAR support, so a guard would use the Rhea price oracle on mainnet and a signed relayer price on testnet; both need verification and a safe execution path.

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
node -e 'const a="kuroko-v-83692eef.testnet";fetch("https://test.rpc.fastnear.com",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:"verify",method:"query",params:{request_type:"call_function",finality:"final",account_id:a,method_name:"state",args_base64:"e30="}})}).then(r=>r.json()).then(j=>console.log(JSON.parse(Buffer.from(j.result.result).toString())))'
```

Only names belong in `.env.example`. The local `.near-credentials/`, `.env`, solver capture files, build outputs, and `.tools/` are gitignored. Never paste keys into an issue or demo. See [BLOCKED.md](BLOCKED.md) for the exact remaining access and architecture needs.

## Hackathon submission

The repository has not been made public or submitted. Nick must publish it before **2026-11-14 23:59 UTC**, make the demo post, and complete the human fields in [HACKATHON_SUBMISSION_FORM.md](HACKATHON_SUBMISSION_FORM.md). The final API payload requires Nick's explicit confirmation under the [event rules](https://nearhackathon.com/HACKATHON.md).

## Team and other projects

Lead: <TBD by Nick>

Other project by this lead, if any: <TBD by Nick>. The lead must disclose any second independent submission under Q-015.

## Build provenance and license

The scaffold is commit `6a91d02`; subsequent commits are this hackathon build. The official [AMM solver](https://github.com/defuse-protocol/near-intents-amm-solver) and [Rhea lending solver](https://github.com/rhea-finance/lending-near-intents-solver-golang) informed the protocol research; their code was not vendored. The local test token is a project test contract. MIT, Copyright (c) 2026 Nivesh Gajengi.
