# NEAR HACKATHON submission worksheet

This is a worksheet, **not a submitted application**. The live [HACKATHON.md](https://nearhackathon.com/HACKATHON.md) was re-read on 2026-11-09. Nick supplies and confirms every field under “What the human decides.” The repository remains local; Nick publishes it.

| Application field | Value to confirm |
| --- | --- |
| Project name (`projectName`, 2–80 characters) | TBD by Nick (working name: Kuroko) |
| Team lead's name (`leadName`, 2–80 characters) | TBD by Nick |
| Contact email (`email`, max 160 characters) | TBD by Nick |
| Team size (`size`: `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+`) | TBD by Nick |
| Tracks (`tracks`) | `business`, `defi` — confirm with Nick |
| NEAR mainnet payout account (`nearAddress`) | TBD by Nick; Nick creates it, the agent does not |
| Public repository URL (`projectUrl`) | TBD by Nick; local repository has no remote |
| Public demo post URL (`demoUrl`) | TBD by Nick |
| What they built (`idea`, 20–2000 characters) | TBD by Nick; draft below for review |
| Consent (`consent`) | TBD by Nick after reading the notice below |
| Idempotency UUID (`requestId`) | Generate once only when the final payload is approved; reuse it for retries |

## Description draft for Nick's review

Kuroko is a depositor-governed market-maker prototype for NEAR Intents. It tests a USDC share vault on NEAR testnet, constitution checks for pairs, inventory, spread and loss limits, and a read-only solver that can listen to the authenticated mainnet quote relay. Depositors would share spread from verified fills. The current build has no fills or revenue because partner relay access, mainnet inventory, and a safe restricted signer are not in place. The dashboard and MCP tools expose live testnet state and explicit setup status.

## Consent notice to read verbatim

> I agree that the organizers may use these details to review our submission and contact us about this hackathon.

The final submission requires the public repository and a human-authored public X post with @NEARProtocol and #NEARHackathon and a demo video or screenshots. Print the complete JSON payload and obtain Nick's explicit confirmation before making the **one** POST to `https://nearhackathon.com/api/applications`. Do not submit the same repository twice. Deadline: 2026-11-14 23:59 UTC.
