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
