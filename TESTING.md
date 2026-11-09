# Testing — 2026-11-09

Command run from the repository root:

```sh
NEAR_SANDBOX_BIN=/Volumes/Extreme\ SSD/Projects/near-qday-recovery/.tools/near-sandbox-2.14.0-rc.4/near-sandbox pnpm test
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

`pnpm test` completed with exit code 0. The test suite does not claim relay signing, a mainnet fill, Sputnik DAO, Pyth, or 1Click execution. Those require the conditions in [BLOCKED.md](BLOCKED.md). Visual inspection at 375px remains unverified because the browser access host was unavailable; CSS contains a mobile breakpoint but that is not visual proof.

A separate NEAR testnet deployment was independently re-queried by RPC: transaction [`FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2`](https://testnet.nearblocks.io/txns/FAAVdRMb8kf344BAUxuAjFuXmBnP9L71DjfsMAbbEsJ2) returned success and the vault's `state` returned the constitution in [deployment evidence](deployments/testnet-2026-11-09.json).
