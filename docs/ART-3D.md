# Kuroko 3D object kit

A small, calm set of single objects for the vault page's explainer, empty states, error and setup notes, and
deposit or withdrawal confirmations. Kuroko is a minimal fintech page, so the kit is used sparingly: never in the
numbers row, the chart, the deposit panel's form or the tables.

- **Material:** matte white ceramic: a warm off-white unglazed porcelain body with a soft chalky satin finish,
  with details in glossy forest-green enamel (handles, rims, inlays). Only the enamel carries reflections. No
  metal, no chrome, no glass.
- **Palette (from `packages/web/src/style.css`):** body off-white `#f4f3ee` (a shade under the page `--bg`
  `#fafaf8`), enamel forest green `#2f6b3a` (`--accent`, the app's one accent), fine lines and the caution mark in
  near-black `#151514` (`--ink`), rim light pale sage `#eaf2eb` (`--accent-soft`).
- **Face:** none. Kuroko holds people's money, so every object is the object alone.
- **Background:** transparent (no ground shadow) for every object; they sit on the off-white page.
- **Subjects:** USDC vault safe with a green handle wheel, swap arrows (one white, one green), rules shield with
  three inlaid rule lines, ballot box with a slip, coin stack, empty coin tray (empty state), check seal (success),
  caution plaque (warning).

Style line used in every prompt:

> Matte white ceramic 3D render: a warm off-white #f4f3ee unglazed porcelain body with a soft chalky satin finish,
> details in glossy forest-green #2f6b3a enamel, a few thin near-black #151514 lines, a soft pale sage #eaf2eb rim
> light, soft diffuse studio lighting, gentle reflections only on the green enamel, rounded bevelled edges, calm
> minimal sculptural proportions like a premium desk object, no face, centred, transparent background (no
> background, no ground shadow), square 1024x1024, no text, no letters, no numbers, no logos.

Files: `packages/web/public/art/3d/kuroko-3d-<subject>.webp` (trimmed to the object, 640 px square, transparent,
about 30 KB each). 3D art generated with ChatGPT.

## Where each object is used

| Object | File | Used in |
|---|---|---|
| Swap arrows | `kuroko-3d-swap.webp` | "How Kuroko earns", item 1 (market makers fill swaps), 72 px |
| Coin stack | `kuroko-3d-coins.webp` | "How Kuroko earns", item 2 (fees kept for shareholders), 72 px |
| Rules shield | `kuroko-3d-shield.webp` | "How Kuroko earns", item 3 (what is live today), 72 px |
| Vault safe | `kuroko-3d-vault.webp` | Position page before a wallet connects, 96 px with a 4 px float |
| Empty tray | `kuroko-3d-empty.webp` | Activity "No deposits yet", position "No deposits from this account" (56 px), and the swap-fills setup line (40 px) |
| Ballot box | `kuroko-3d-ballot.webp` | Votes "No votes yet", 56 px |
| Success seal | `kuroko-3d-success.webp` | Deposit and withdrawal confirmations in the panel, 40 px |
| Caution plaque | `kuroko-3d-warning.webp` | Vault, history, votes, position and wallet errors, and the fills line when the solver fails, 36-44 px |

Nothing goes in the header, the four numbers, the chart, the deposit form or the tables. Every image has a fixed
width and height and alt text; the only motion is the position page's 4 px float, which stops under
`prefers-reduced-motion`. The components are `Art` and `Note` in `packages/web/src/ui.tsx`.
