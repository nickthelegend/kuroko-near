# Kuroko report — updated 2026-11-13 (rebuild after Nick's 3/10)

- **Pitch:** a USDC yield vault on NEAR whose solver fills NEAR Intents swaps inside depositor-voted rules.
- **UI:** rebuilt in the Morpho / Yearn / Spark structure with a new brand (stage black, bone, Kuroko orange; Gantari +
  Fira Mono): landing, vault list, vault detail with deposit/withdraw, portfolio, activity, relay, governance, plus
  designed empty/error/blocked/locked/pending/success states and phone layouts. Live: tweened numbers, block heartbeat,
  feed, relay probe, 1Click market quote, vote countdown. See UI-JUDGE.md and FLOW-QA.md.
- **Testnet:** two more vaults (Wide, Stable) deployed with the same wasm, two more test depositors, an open rules vote
  on Stable (closes Nov 14 ~15:40 UTC). Hashes in deployments/testnet-vaults.json and README.
- **Art:** the art agent's set used the old forest-green palette (and would sit next to Otzar's jade), so a new
  stage-black/orange set of nine stills was generated in ChatGPT; the green set stays untracked in art-incoming/.
- **Film:** videos/kuroko-near/kuroko-near-film.mp4 (v4, 2:18), JUDGE-v4 9/10; see docs/FILM.md.
- **Blocked:** swap fills (PARTNER_JWT). See BLOCKED.md.
- **Decisions without asking:** pushed each commit to the private origin per claude-agent-common.md (the older brief
  said "never push"); used the Claude co-author trailer per the same file.
