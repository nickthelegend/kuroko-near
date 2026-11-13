# Flow QA — Kuroko rebuild (Nov 13, 2026)

Every route captured in headless Chrome (playwright-core, installed Chrome) against the dev server on port 5360,
reading the live NEAR testnet vaults. Desktop 1440×900 at 1×, phone 390×844 at 2×, full page, after 10 s of live
polling. Screenshots are compressed copies in [docs/screens/](docs/screens/).

| Route | Desktop 1440 | Phone 390 | Horizontal overflow | What is live on screen |
| --- | --- | --- | --- | --- |
| `/` landing | [landing-1440](docs/screens/landing-1440.jpg) | [landing-390](docs/screens/landing-390.jpg) | 0 px / 0 px | Core total, share price, last three transfers, ticking block height, total-deposits chart, vault table, relay probe and market quote |
| `/vaults` | [vaults-1440](docs/screens/vaults-1440.jpg) | [vaults-390](docs/screens/vaults-390.jpg) | 0 / 0 | All-vault total and chart, per-vault deposits, sparkline, share price, pairs, fee floor, status (Stable "Locked for a vote") |
| `/vault/core` | [vault-core-1440](docs/screens/vault-core-1440.jpg) | [vault-core-390](docs/screens/vault-core-390.jpg) | 0 / 0 | KPIs, chart, allocation, rules, `check_trade`, activity, deposit card |
| `/vault/wide` | [vault-wide-1440](docs/screens/vault-wide-1440.jpg) | [vault-wide-390](docs/screens/vault-wide-390.jpg) | 0 / 0 | Same anatomy, three pairs; screenshot shows the designed "History unavailable" state during an index rate limit |
| `/portfolio` (no wallet) | [portfolio-1440](docs/screens/portfolio-1440.jpg) | [portfolio-390](docs/screens/portfolio-390.jpg) | 0 / 0 | Empty state with art, connect and example lookup |
| `/portfolio?account=kuroko-lp2-222541d6.testnet` | [portfolio-lookup-1440](docs/screens/portfolio-lookup-1440.jpg) | [portfolio-lookup-390](docs/screens/portfolio-lookup-390.jpg) | 0 / 0 | Positions in three vaults, Earned 0.00, wallet USDC, history |
| `/activity` | [activity-1440](docs/screens/activity-1440.jpg) | [activity-390](docs/screens/activity-390.jpg) | 0 / 0 | KPIs, filters, feed (desktop shot shows the designed error state during a rate limit) |
| `/relay` | [relay-1440](docs/screens/relay-1440.jpg) | [relay-390](docs/screens/relay-390.jpg) | 0 / 0 | Relay probe (ms), live 1Click quote, Kuroko floor comparison, Blocked solver checklist |
| `/governance` | [governance-1440](docs/screens/governance-1440.jpg) | [governance-390](docs/screens/governance-390.jpg) | 0 / 0 | Rules per vault, the open Stable vote with countdown and 58.1% / 41.9% split |

States covered: loading skeletons, empty (no positions, no votes), error (history unavailable, activity could not
load) with the curtain still, blocked (solver, listener), locked-for-vote (Stable vault), pending deposit with a live
seconds counter, confirmed deposit/withdrawal with the explorer link.

## Real browser signing

The repo's QA signer (built only with `--mode qa` and `VITE_QA_SIGNER=1`) signs real testnet transactions in Chrome
through the app's own deposit card. The Nov 13 film take deposited 0.25 USDC into Core and withdrew the minted shares;
hashes are in [docs/FILM.md](docs/FILM.md). Earlier two-width runs (Nov 11) are recorded in
[deployments/qa-browser-2026-11-11.json](deployments/qa-browser-2026-11-11.json). `pnpm test:e2e` now follows the new
pages (vault page, portfolio, deposit card) and counts retried public-RPC rate limits instead of failing on them.
Human approval in Meteor Wallet remains a manual check.

## Accessibility and motion

Focus rings on every control (2 px orange), tap targets of 40–48 px, `prefers-reduced-motion` turns off tweens,
chart drawing, pulses and the feed highlight.
