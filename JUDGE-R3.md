# R3 self-judge — Kuroko (Nov 13, 2026)

Judged against the NEAR HACKATHON procedure (https://nearhackathon.com/HACKATHON.md): a judge or the Claude/Codex
screener must understand the problem, reproduce the README's "do X - see Y" steps, verify the claimed features and
see NEAR doing real work. Scored strictly, 1–10.

| Criterion | Score | Evidence | What holds it back |
| --- | ---: | --- | --- |
| Problem and pitch are clear in seconds | 9 | README line 1 and the landing hero: "Your USDC works backstage" — a USDC yield vault whose solver fills NEAR Intents swaps inside depositor-voted rules | — |
| Reproducible README | 9 | `pnpm install && pnpm dev`, then nine do-X-see-Y steps on live testnet; read-only, no wallet needed | Live data depends on public RPC rate limits; the app retries and fails over |
| Real NEAR usage | 8 | Three vault contracts with NEP-141 `ft_transfer_call` deposits, share math, withdrawals, an open share-weighted vote, a public `check_trade`; NEAR Intents relay probe and 1Click `dry: true` quotes on mainnet | No solver fill: needs a Partner JWT |
| Working product, live | 9 | Every number is read from chain; deposit and withdrawal signed in the app on film; 21 tests on a local nearcore sandbox | APY/earned are empty by design until fills exist |
| UI / UX | 9 | Landing + 8 app screens + designed empty/error/blocked/locked/pending/success states, 390 px phone layouts, ChatGPT art set ([UI-JUDGE.md](UI-JUDGE.md)) | Small text is dense on the vault page at 390 |
| Honesty | 10 | BLOCKED stated in README line 3, on `/relay`, in each vault's allocation and as APY "—"; test accounts labelled; reconciled film takes documented | — |
| Demo film | 9 | 2:18, landing then a live deposit in the first 15 s, many screens, no subtitles ([docs/FILM.md](docs/FILM.md)) | 1440 capture scaled to 1080p |

**Overall: 9/10.** The one real gap is outside the code: NEAR Intents solver access (`PARTNER_JWT`), recorded in
[BLOCKED.md](BLOCKED.md) with the exact steps for Nick.
