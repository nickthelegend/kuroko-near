# Kuroko (黒子)

Kuroko is a testnet USDC share vault and a listen-only NEAR Intents solver observatory. The proposed business is to share market-making spread with depositors. The **business has not earned revenue or filled a trade**: relay access, safe mainnet custody, and inventory are missing.

## Problem and current result

NEAR Intents solvers fill users' swaps, but a small depositor cannot safely delegate inventory to an unrestricted off-chain solver key. Kuroko demonstrates the accounting and policy side on NEAR testnet, and prepares an authenticated relay listener. It displays only verifiable chain state and real relay events, with explicit setup errors when unavailable. See [research](docs/RESEARCH.md) for why a NEAR function-call key cannot constrain off-chain Intents signatures.

| Component | What works now | Verification |
| --- | --- | --- |
| `packages/contract` | NEP-141 deposits mint shares at recorded cash NAV; withdrawals send real tokens with failure restoration; share voting changes policy; pair, cap, spread and daily-loss checks | 3 contract unit tests and 3 real local-chain sandbox tests, including actual token transfers |
| `packages/sdk` | Integer constant-product quote math and constitution screening | 5 local tests |
| `packages/solver` | Authenticated WebSocket listen mode, real `intents.near` inventory read, request tape and `/stats`; sends no quote | 1 setup test; live capture **BLOCKED** by `PARTNER_JWT` |
| `packages/web` | Landing page, testnet vault state, quote tape, wallet deposit/withdraw and native share-vote actions | TypeScript and production build; browser visual check pending |
| `packages/mcp` | Read-only `get_vault_state` and `get_listen_stats` tools | 1 test |

## Reproduce

Requires Node 20.18+, pnpm 10.29.2, Rust 1.95 and cargo-near 0.22.0. The first sandbox run downloads a NEAR sandbox binary if `NEAR_SANDBOX_BIN` is not set. Keep all dependencies in this folder on the external SSD.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

`pnpm test` builds the contract and a real NEP-141 token fixture, runs 7 TypeScript tests and 6 Rust tests, and starts and stops local nearcore sandbox instances. For a local cached sandbox binary, set `NEAR_SANDBOX_BIN=/path/to/near-sandbox` before `pnpm test`. See [TESTING.md](TESTING.md) for exact results.

### Testnet vault demo

A vault is deployed at [`kuroko-f836334a.qday-bob-mw8rcsal.testnet`](https://testnet.nearblocks.io/address/kuroko-f836334a.qday-bob-mw8rcsal.testnet). Run:

```sh
VITE_VAULT_ACCOUNT=kuroko-f836334a.qday-bob-mw8rcsal.testnet VITE_USDC_ACCOUNT=usdc.testnet pnpm dev
```

Open the Vite URL. **Do:** inspect the NAV and constitution panels. **See:** the `state` view from NEAR testnet and its source link. NAV currently has zero deposits. Connect a NEAR **testnet** wallet with `usdc.testnet` tokens to exercise deposit/withdraw and share voting. No funding is claimed to be supplied. The browser signer asks the wallet to approve each transaction.

For a read-only agent:

```sh
VAULT_ACCOUNT=kuroko-f836334a.qday-bob-mw8rcsal.testnet pnpm --filter @kuroko/mcp start
```

### Relay listen demo (requires partner access)

Create a gitignored `.env` from `.env.example` and set `PARTNER_JWT`, the two `KUROKO_ASSET_*` identifiers, and policy fields. Set `NEAR_MAINNET_ACCOUNT` to include actual `intents.near` inventory; without it the listener still records real requests but shows an inventory setup reason. Load it into the process environment, then run `pnpm listen`. The local `http://127.0.0.1:3100/stats` endpoint returns live counts. Run at least 30 minutes and preserve the dated `packages/solver/data/` capture. Without the JWT, the process exits with `Setup required: PARTNER_JWT`; no quote tape is fabricated. Listen mode **never** sends `quote_response`.

## Deployment and evidence

| Network | Account / action | Transaction | Independent check |
| --- | --- | --- | --- |
| NEAR testnet | Vault deploy and `new` on `kuroko-f836334a.qday-bob-mw8rcsal.testnet` | [`FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2`](https://testnet.nearblocks.io/txns/FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2) | [Recorded state and WASM hash](deployments/testnet-2026-11-09.json); re-queried through `https://test.rpc.fastnear.com` |
| NEAR mainnet | Relay quotes, fills, spread, rebalance | **BLOCKED; no transaction** | [Exact requirements](BLOCKED.md) |

## NEAR features and limits

The prototype uses a NEAR Rust contract, NEP-141 `ft_transfer_call`, cross-contract withdrawal and callback, testnet account creation, and native weighted share voting. The intended Intents integration is mainnet-only. Function-call access keys and Sputnik DAO are **not integrated**. Kuroko currently does not sign relay quotes, use Pyth, rebalance with 1Click, or claim settlement on `intents.near`. The vault cannot enforce arbitrary off-chain Intents signatures. Keep depositor assets out of an unrestricted solver account until that custody problem is solved.

## Project structure

- `packages/contract`: vault and real local-chain fixture tests
- `packages/sdk`: quote math and policy screening
- `packages/solver`: authenticated read-only relay listener
- `packages/web`: responsive landing page and dashboard
- `packages/mcp`: read-only agent tools
- `docs/RESEARCH.md`: protocol references and custody boundary

## Team and other projects

Lead: <TBD by Nick>

Other project by the lead: <TBD by Nick>. One person may enter at most two independent projects under hackathon Q-015; Nick must disclose the other project if applicable.

## Submission

Primary track proposed: `business`; secondary: `defi`. Nick confirms the tracks and remaining human fields in [HACKATHON_SUBMISSION_FORM.md](HACKATHON_SUBMISSION_FORM.md). The local repository has no remote; Nick publishes it before **2026-11-14 23:59 UTC**. License: [MIT](LICENSE).
