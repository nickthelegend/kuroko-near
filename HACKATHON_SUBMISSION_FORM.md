# NEAR HACKATHON submission worksheet

Draft only. Official [form](https://nearhackathon.com/#apply) and [rules](https://nearhackathon.com/HACKATHON.md) checked on 2026-11-11. Nick completes the TBD fields and confirms the draft. Deadline: 2026-11-14 23:59 UTC. No application has been sent by this task.

| Field | Draft value / requirement |
| --- | --- |
| projectName | Kuroko (6 characters; allowed: 2-80) |
| leadName | TBD Nick (2-80 characters) |
| email | TBD Nick (valid email; max 160 characters; max 2 submissions per email) |
| size | TBD Nick: one of `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` |
| tracks | Proposed, best fit first: `defi`, `business`, `security`. `defi`: a USDC share vault and market-maker prototype for NEAR Intents. `business`: a prototype for depositor-governed market-making income; fills and revenue are unbuilt. `security`: pair, inventory and spread checks plus an operator-reported loss pause; these do not restrict off-chain Intents signatures. |
| nearAddress | TBD Nick: NEAR MAINNET payout account (named or implicit; never use the testnet vault) |
| projectUrl | TBD: public GitHub repo URL after push (Nick publishes; no remote is configured here) |
| demoUrl | TBD: the public X post URL |
| idea | People who want to pool money for swap market making need clear rules for how it can be used. Kuroko is a depositor-governed USDC vault prototype for NEAR Intents. Its NEAR testnet contract accepts NEP-141 USDC, issues shares, handles withdrawals and lets shareholders vote on trading rules. A local dashboard shows live vault state, transaction history and read-only rule checks; MCP tools expose state to agents. The recorded testnet run deposited 0.5 USDC and withdrew 0.2 USDC worth of shares. Quote math and a listen-only relay client are implemented, but relay access is pending. Kuroko has no swap fills or earned fees, and safe mainnet custody is unresolved. The aim is to let depositors share market-making fees within rules they choose. |
| consent | Nick ticks after agreeing to the notice below |

Idea character count: **746** (text in the `idea` row only; allowed: 20-2000).

Consent notice:

> I agree that the organizers may use these details to review our submission and contact us about this hackathon.

The repo must be public and include LICENSE. Nick must fill the README's other-project disclosure before submission. A local-only demo needs a video in the X post. If using the API later, generate `requestId` once and reuse it on retries; it is an API-only field, not a form field. Print the exact final payload and get Nick's explicit confirmation before submitting. Submit this repository once.

## X post draft

The human posts this text and attaches the video:

```text
pooled swap liquidity needs clear rules. built Kuroko at NEAR HACKATHON: a USDC share vault on NEAR testnet, with deposits, withdrawals and depositor votes. swap fills are still unbuilt. @NEARProtocol #NEARHackathon
```

Post character count: **215** (limit: 280).

attach: video TBD
