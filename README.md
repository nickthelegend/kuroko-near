# Kuroko

**A USDC yield vault on NEAR whose solver fills swaps on NEAR Intents, inside rules the depositors vote on.**

Every swap on NEAR Intents is filled by a market maker (a "solver") who keeps a small spread. Kuroko pools depositors' USDC to be that market maker: you deposit USDC and receive shares, the solver may only quote pairs, sizes and fees the vault's on-chain rules allow, and the spread it earns stays in the vault, so the share price rises for every depositor.

**What is live and what is blocked, in one line:** three vault contracts, deposits, withdrawals, share-weighted rule votes and the contract's own trade check are live on NEAR testnet. Swap fills are **BLOCKED**: the solver needs a NEAR Intents Partner JWT (`PARTNER_JWT`) that Kuroko does not have, so there are no fills, no earned spread and no APY (the app shows "—"). See [BLOCKED.md](BLOCKED.md).

## Try it

Node.js 22.12+ and pnpm 10.29.2. The app reads NEAR testnet and FastNEAR's public transaction index; no wallet or key is needed to look around.

1. `pnpm install --frozen-lockfile && pnpm dev`, then open `http://127.0.0.1:5360/` - see the landing page with the Core vault's live total, the latest NEAR testnet block ticking, and every vault's numbers read from chain.
2. Click **Launch app** (`/vaults`) - see the three vaults (Core, Wide, Stable) with live deposits, share price, the pairs each may quote and its fee floor. APY is "—" because nothing has been earned.
3. Open **Kuroko Core USDC** (`/vault/core`) - see total deposits, share price, a chart rebuilt from every on-chain USDC transfer, where the money is (100% held in the vault; 0% with the solver, labelled Blocked), the rules and the vault's activity.
4. In **Rules**, press **Check** with USDC ↔ wNEAR at 0.30% - see **Allowed**; choose USDC ↔ ETH (testnet) and check again - see **Refused**. This calls the contract's `check_trade` view.
5. Open **Governance** (`/governance`) - see each vault's rules and the open vote on the Stable vault (proposal 0: fee floor 0.05% → 0.08%, largest trade 5 → 3 USDC), with its live countdown and the yes/no split of real share votes.
6. Open **Relay** (`/relay`) - see the honest blocked state: the NEAR Intents relay probed live every 6 s, a live dry-run 1Click quote for 100 USDC → wNEAR on mainnet (the market Kuroko would quote into), what Kuroko would quote at its 0.30% floor, and the setup checklist for `PARTNER_JWT`.
7. Open **Activity** (`/activity`) or **Portfolio** (`/portfolio?account=kuroko-lp2-222541d6.testnet`) - see every deposit and withdrawal, and one depositor's positions, read-only.
8. To deposit yourself, connect a NEAR testnet account with [Meteor Wallet](https://wallet.meteorwallet.app), get Circle testnet USDC from [faucet.circle.com](https://faucet.circle.com/), and use the deposit card on a vault page.
9. `pnpm test` - 21 executable tests (contract unit + nearcore sandbox, SDK, solver, MCP, web). See [TESTING.md](TESTING.md).

The demo film (live testnet deposit and withdrawal in the app) is described in [docs/FILM.md](docs/FILM.md).

## Live on NEAR testnet

All three vaults run the same wasm (sha256 `924312053f4ba27e5206fb42f8400d34792a6654a18caaea5c245efdc1c02442`) on Circle testnet USDC (`3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`). Records: [deployments/testnet-live.json](deployments/testnet-live.json) and [deployments/testnet-vaults.json](deployments/testnet-vaults.json).

| Vault | Contract | Rules at deploy | Deploy tx |
| --- | --- | --- | --- |
| Kuroko Core USDC | [kuroko-v-83692eef.testnet](https://testnet.nearblocks.io/address/kuroko-v-83692eef.testnet) | USDC ↔ wNEAR, largest trade 1 USDC, fee floor 0.30%, loss pause 0.10 USDC | [iYayUZVz…](https://testnet.nearblocks.io/txns/iYayUZVzWXJCLUMDkuRLGWx5UurrUhddtXSEafHNo2Y) |
| Kuroko Wide USDC | [kuroko-wide-fbdc8316.testnet](https://testnet.nearblocks.io/address/kuroko-wide-fbdc8316.testnet) | USDC ↔ wNEAR / ETH / AURORA, 2 USDC, 0.50%, 0.25 USDC | [5wuWKuFX…](https://testnet.nearblocks.io/txns/5wuWKuFXLorKnaNS5tKujXgYqbSVtxRqKeF26pxbirXF) |
| Kuroko Stable USDC | [kuroko-stable-72e3ee65.testnet](https://testnet.nearblocks.io/address/kuroko-stable-72e3ee65.testnet) | USDC ↔ USDT / USDC.e, 5 USDC, 0.05%, 0.05 USDC | [7xBRz7ia…](https://testnet.nearblocks.io/txns/7xBRz7iaKwxkeGjkqRkw7qfGmvV7j7KBqdbuWAWbSuTN) |

| Action | Transaction |
| --- | --- |
| Deposit 0.5 USDC into Core, then withdraw 0.2 (Nov 10) | [BkreUSyB…](https://testnet.nearblocks.io/txns/BkreUSyBXxX2qNjPFqZTwVFWdPseGiF4qQHErcW1Pcnq) · [4dZANf4G…](https://testnet.nearblocks.io/txns/4dZANf4GyFrjVXPUeZV6hmdWRXvqyXdPo8gDjC2NYXRh) |
| Depositor 2 deposits into Wide (0.30) and Core (0.15) | [HC8MVauU…](https://testnet.nearblocks.io/txns/HC8MVauUTcdEdfEXFpS1YiEcPUjFS6mza3ZBDYnMxqor) · [5qYFZZWt…](https://testnet.nearblocks.io/txns/5qYFZZWt2PtHDu6d2wdN8bvKgXru7jk8qZzQ2nj2E6Fq) |
| Depositor 3 deposits into Stable (0.25) and Wide (0.15) | [4nTjk3xU…](https://testnet.nearblocks.io/txns/4nTjk3xUV9pE6Cmv1PnGtxvzrJPEUasW3cVptthSNZVo) · [Cdb1uBfT…](https://testnet.nearblocks.io/txns/Cdb1uBfTnJZQ78B2Xxwer9aK7G8UkEb2KLTspNQaZn3T) |
| Depositor 2 joins Stable (0.10 + 0.08) | [D36aTHN2…](https://testnet.nearblocks.io/txns/D36aTHN2yj5w1zzgWG7LR9HrP9JyeVNwoALUfZh5SZRj) · [Hv5AD9Rq…](https://testnet.nearblocks.io/txns/Hv5AD9Rqb3z24BLz5C3ZSZrMdjtujqiQzi63DqGaG32S) |
| Stable vote: propose, vote yes, vote no | [HgccnkSi…](https://testnet.nearblocks.io/txns/HgccnkSivxM6QLCm79xJ5ZBTYUSu9GuHCsQApye4xx9y) · [FJgfsvKx…](https://testnet.nearblocks.io/txns/FJgfsvKxD13vjoJ6uWT6QY8R3haVrY8WuZi87TUC3Hyp) · [9eWRBA84…](https://testnet.nearblocks.io/txns/9eWRBA841u5WGXWh3cuevkMe5S8F6JFJbeGGGCLDYhyS) |
| Browser QA deposits and withdrawals (Nov 11) | [deployments/qa-browser-2026-11-11.json](deployments/qa-browser-2026-11-11.json) |
| Film take: deposit and withdrawal signed in the app | [docs/FILM.md](docs/FILM.md) |

All depositor accounts are the team's test accounts (`kuroko-lp-…`, `kuroko-lp2-…`, `kuroko-lp3-…`); the activity feed labels them "test". Testnet USDC was bought with test NEAR on Ref Finance testnet pool 1845. Scripts: [scripts/live-testnet.mjs](scripts/live-testnet.mjs), [scripts/seed-vaults.mjs](scripts/seed-vaults.mjs), [scripts/open-vote.mjs](scripts/open-vote.mjs). Keys stay in the gitignored `.near-credentials/`.

## How it works

| Piece | What it does | Evidence / limit |
| --- | --- | --- |
| `packages/contract` | `kuroko_vault` (near-sdk): accepts NEP-141 USDC via `ft_transfer_call`, mints shares at cash NAV, burns shares for proportional withdrawals (state restored if the transfer fails). Shareholders propose and vote on allowed pairs, largest trade, fee floor and daily loss pause; deposits and withdrawals wait while a vote is open. `check_trade` is a public view. | 3 Rust unit tests, 4 nearcore sandbox tests with a real NEP-141 token. The loss input is an operator report, not a verified settlement feed. |
| `packages/sdk` | Integer constant-product quote math and pre-quote rule checks. | 5 tests. These off-chain checks do not constrain a registered Intents signing key. |
| `packages/solver` | Authenticated relay WebSocket subscription, mainnet Verifier reserve reads, listen-only tape and stats. | 1 test (missing auth fails loudly). **Blocked:** no relay session without `PARTNER_JWT`; never sends quotes. |
| `packages/web` | Landing page and app (vaults, vault detail with deposit/withdraw, portfolio, activity, relay, governance), laid out like Morpho / Yearn / Spark. One live store polls each vault's contract state every 5 s, the chain head every 2.5 s and FastNEAR history every 30 s; numbers tween on change and new transfers slide into the feed. The relay page probes `solver-relay-v2.chaindefuser.com` and asks 1Click for a `dry: true` quote. Reads rotate across FastNEAR, its archival node and dRPC when one is rate-limited. | 7 web tests; FLOW-QA screenshots at 1440 and 390 with zero horizontal overflow ([FLOW-QA.md](FLOW-QA.md)). |
| `packages/mcp` | `get_vault_state` and `get_listen_stats` read-only tools for agents. | 1 test. |

## NEAR features used

- **NEP-141 `ft_transfer_call`** into the vault, with refunds of unused amounts; history replayed from standard `ft_transfer` events.
- **NEAR Intents:** the solver follows the market-maker Message Bus format; the web app uses the public relay endpoint for a liveness probe and 1Click `dry: true` quotes (no deposit address, nothing moves). NEAR Intents has no testnet (event FAQ Q-007), so the vaults are on testnet and market data is read from mainnet.
- **Function-call keys** restrict NEAR actions but **not** off-chain intent signatures from a key registered with `intents.near`; the vault's rules therefore cannot yet bind a solver. This is listed as a blocker, not claimed.
- **Governance** is native share voting in the contract, not Sputnik DAO.

## Design

Brand: stage black, bone and one Kuroko orange; Gantari and Fira Mono ([docs/BRAND.md](docs/BRAND.md)). Art generated with ChatGPT ([docs/ART.md](docs/ART.md)).

## Reproduce live state without the app

```sh
node -e 'const a="kuroko-v-83692eef.testnet";fetch("https://test.rpc.fastnear.com",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:"verify",method:"query",params:{request_type:"call_function",finality:"final",account_id:a,method_name:"state",args_base64:"e30="}})}).then(r=>r.json()).then(j=>console.log(JSON.parse(Buffer.from(j.result.result).toString())))'
```

With relay access, put the names from `.env.example` in a gitignored `.env`, set `KUROKO_ASSET_IN`/`KUROKO_ASSET_OUT` to exact `nep141:` IDs and run `pnpm listen` (listen-only; it records what it would quote and sends nothing). `VAULT_ACCOUNT=kuroko-v-83692eef.testnet pnpm --filter @kuroko/mcp start` serves the MCP tools.

## Layout

```text
packages/contract  Rust near-sdk vault, local NEP-141 test token, sandbox tests
packages/sdk       TypeScript quote math and rule evaluation
packages/solver    Authenticated listen-only relay client
packages/web       Vite + React landing page and app, testnet wallet actions
packages/mcp       Read-only agent tools
scripts/           Testnet deploy, seeding, vote, QA and browser end-to-end runners
docs/              Research, brand, art and film notes
```

## Hackathon disclosures

Built for NEAR HACKATHON 2026 (Nov 1-14).

**Prior work.** The Git history starts on Nov 9, 2026 with `6a91d02` (MIT license and gitignore only); there are no pre-Nov 1 commits. Review the build with `git diff 6a91d02..HEAD`.

**Built in the window.** The NEAR vault, share voting, local NEP-141 test token and tests, quote math and rule checks, listen-only relay client, MCP tools, the web app and Meteor testnet wallet integration (Nov 9-10); the browser QA signer and end-to-end runner (Nov 11); the Wide and Stable vaults, the governance vote and the full UI rebuild (Nov 13). Relay fills, revenue and safe mainnet custody are not completed work.

**Libraries and references.** near-sdk, near-workspaces, near-api-js, NEAR Wallet Selector with Meteor, React, Vite and the MCP server library (see the package and Cargo manifests). The official [AMM solver](https://github.com/defuse-protocol/near-intents-amm-solver) and [Rhea lending solver](https://github.com/rhea-finance/lending-near-intents-solver-golang) informed the protocol research; their code was not vendored.

**AI-assisted code.** Built with AI coding agents (Claude Code, Codex) under human direction; all code reviewed and tested by the team.

**Art.** Generated with ChatGPT; see [docs/ART.md](docs/ART.md).

**Other projects by the same team in this hackathon**

Lead: <TBD by Nick>

**License.** MIT. Copyright (c) 2026 Nivesh Gajengi. See [LICENSE](LICENSE).
