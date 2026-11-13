# UI judge — Kuroko rebuild (Nov 13, 2026)

Strict pass, scored 1–10 per screen against the category leaders captured for reference (Morpho Earn and vault page,
Yearn v3 vault list and portfolio, Spark Savings app and landing). A screen under 8 is fixed before filming.
Screens were checked at 1440×900 and 390×844 in headless Chrome against the live testnet vaults; every route had 0 px
horizontal overflow. Console noise during the check came only from public RPC rate limits (HTTP 429 without CORS
headers), which the app retries and fails over.

## Round 1 → fixes

| Screen | Score | What was wrong | Fix |
|---|---:|---|---|
| Landing hero | 6 | Live card covered the art; art slot empty until the stills arrived | Recomposed: vault still on the right, live Core card beside it on the floor, copy narrowed |
| Landing bento | 6 | Four cards left an empty grid slot | Last card spans two columns with its art beside the copy |
| Landing facts | — | Said "one audited wasm" — false | Now "one shared wasm"; the page says "not audited" |
| Vault page (phone) | 4 | Chart's initial 720 px width pushed the grid wider than the phone | `minmax(0,1fr)` columns; chart SVG capped to its box |
| Vault page KPI | 7 | "1.000000 USDC" overflowed its cell | Unit moved into the label ("Share price, USDC") |
| Vault page | 7 | A transient RPC error showed an error card over good data | Errors show only when there is no value yet |
| Governance | 7 | "Closes in23h" | Non-breaking space |
| Relay | 7 | Listener card alone in a half row | Spans the full row |
| All | 6 | Error/empty art was the old green ceramic kit | Nine stage-black / orange spotlight stills from ChatGPT; errors use the closed curtain |
| All | 6 | FastNEAR rate limits left skeletons and "history unavailable" | RPC cool-down and failover across three endpoints; index requests queued with back-off; feed renders with any vault in |

## Round 2 scores

| Screen | Leader it follows | Score | Notes |
|---|---|---:|---|
| Landing (`/`) | Spark / Morpho landing | 9 | Dark stage hero with generated art and the live Core card (tweened total, share price, last three transfers), live band with ticking block height and total-deposits chart, three-move explainer with art, live vault table, bento with art, honest live/not-live section, dark FAQ, orange footer |
| Vault list (`/vaults`) | Yearn v3 list + Spark savings card | 9 | Dark summary card with all-vault total, chart and vault still; Morpho-style rows with status pulse, sparkline, pairs, fee floor, APY "—"; live feed and relay status beside |
| Vault detail (`/vault/:slug`) | Morpho vault page | 8.5 | Header, KPI row, Deposits / Share price chart with hover readout, "Where the money is" (Blocked solver row), rules + live `check_trade`, activity, sticky deposit card |
| Deposit / withdraw flow | Morpho deposit card | 9 | Balance + Max, share preview, pending state with a live seconds counter, success card with the coins still, new vault total and explorer link; locked-for-vote and paused states |
| Portfolio (`/portfolio`) | Yearn portfolio | 8 | Read-only account lookup, three KPIs (Earned 0.00 stated plainly), positions table with share-of-vault bars, history; designed empty state with art |
| Activity (`/activity`) | Morpho activity tab | 8.5 | KPIs, type and vault filters, feed rows slide in and glow when new, test accounts labelled |
| Relay (`/relay`) | — (Kuroko's own; status-page anatomy) | 9 | Pipeline vault → solver (Blocked) → relay (live ms) → market (live quote) with animated links; curtain still with the setup checklist; live 1Click market card with Kuroko's floor comparison; latency bars |
| Governance (`/governance`) | Morpho/Spark governance tables | 8.5 | Per-vault rules cards, live vote card with countdown, changed fields highlighted, yes/no bar with 50% marker, propose form with reasons, trade check |
| Phone (all routes) | Native app tab bar | 8.5 | Bottom tab bar, deposit card moves above the fold on vault pages, no overflow |

No screen scores under 8. Remaining limits are data, not design: APY and Earned stay empty until real fills exist.
