# NEAR HACKATHON submission worksheet

Draft only. Official [form](https://nearhackathon.com/#apply) and [rules](https://nearhackathon.com/HACKATHON.md) checked on 2026-11-13. Nick completes the TBD fields and confirms the draft. Deadline: 2026-11-14 23:59 UTC. No application has been sent by this task.

| Field | Draft value / requirement |
| --- | --- |
| projectName | Kuroko (6 characters; allowed: 2-80) |
| leadName | TBD Nick (2-80 characters) |
| email | TBD Nick (valid email; max 160 characters; max 2 submissions per email) |
| size | TBD Nick: one of `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` |
| tracks | Proposed, best fit first: `defi`, `business`, `security`. `defi`: a USDC share vault and market-maker prototype for NEAR Intents. `business`: a prototype for depositor-governed market-making income; fills and revenue are unbuilt. `security`: on-chain pair, trade-size and fee rules with a public check and a loss pause; these do not yet restrict off-chain Intents signatures. |
| nearAddress | TBD Nick: NEAR MAINNET payout account (named or implicit; never use the testnet vault) |
| projectUrl | `https://github.com/nickthelegend/kuroko-near` once Nick makes it public |
| demoUrl | TBD: the public X post URL |
| idea | Every swap on NEAR Intents is filled by a market maker who keeps a small spread, but ordinary USDC holders cannot take part safely. Kuroko is a USDC yield vault on NEAR: you deposit USDC and receive shares, a solver may only quote the pairs, trade sizes and fees the vault's on-chain rules allow, and the spread is meant to stay in the vault so the share price rises for every depositor. Depositors change the rules with a 24-hour share-weighted vote. Three vault contracts (Core, Wide, Stable) are live on NEAR testnet with real NEP-141 USDC deposits, withdrawals, an open rules vote and a public check_trade view. The web app (landing, vaults, vault detail with deposit/withdraw, portfolio, activity, relay, governance) reads everything live from chain, probes the NEAR Intents relay and shows a live dry-run 1Click quote for the market Kuroko would quote into. Swap fills are blocked: the solver needs a NEAR Intents Partner JWT, so there are no fills, no earned spread and no APY yet, and the app says so. |
| consent | Nick ticks after agreeing to the notice below |

Idea character count: **1009** (text in the `idea` row only; allowed: 20-2000).

Consent notice:

> I agree that the organizers may use these details to review our submission and contact us about this hackathon.

The repo must be public and include LICENSE. Nick must fill the README's other-project disclosure before submission. A local-only demo needs a video in the X post. If using the API later, generate `requestId` once and reuse it on retries; it is an API-only field, not a form field. Print the exact final payload and get Nick's explicit confirmation before submitting. Submit this repository once.

## X post draft

The human posts this text and attaches the video:

```text
NEAR Intents market makers earn a spread on every swap. Kuroko lets USDC holders share it: deposit, get vault shares, and the solver quotes only inside rules depositors vote on. 3 vaults on testnet; fills await relay access. Built at NEAR HACKATHON @NEARProtocol #NEARHackathon
```

Post character count: **277** (limit: 280).

attach: `kuroko-near-film-share.mp4` (see docs/FILM.md)
