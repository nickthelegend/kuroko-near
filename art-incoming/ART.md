# Kuroko art set (UI overhaul, Nov 13 2026)

Generated with ChatGPT's image model (chatgpt.com, one fresh chat, one image per message, no reference images).
A calm Scandinavian still life in matte speckled stoneware with forest-green glaze: simple yield vaults in the Morpho
style, shown as a lidded vault canister, yield stacking up in layers, a coin going in and a jar you can open any time.
It keeps Kuroko's off-white and forest-green palette. No face, no metal, no toy look, no text.

## Palette (unchanged, from `packages/web/src/style.css`)
| Role | Hex |
|---|---|
| Page background | `#fafaf8` |
| Stoneware body (objects) | `#f4f3ee` |
| Forest green, the one accent (glaze, CTA) | `#2f6b3a` |
| Sage tint (soft fills, bounce light) | `#eaf2eb` |
| Ink (fine lines, text) | `#151514` |

## Style line (appended to every prompt)
> Calm Scandinavian still-life photograph of real objects: matte unglazed warm off-white stoneware #f4f3ee with a fine
> natural speckle and a soft chalky finish, small details in deep forest-green #2f6b3a glaze (the only colour, and the
> only glossy part), a few thin near-black #151514 lines, soft overcast north-window light, very soft shadows, a faint
> pale sage #eaf2eb bounce light, minimal, quiet and unhurried like a premium ceramics studio catalogue; not toy-like,
> not a 3D cartoon, no plastic, no metal, no chrome, no glass, no face, no people, no hands; no text, no letters, no
> numbers, no logos, no symbols.

Hero and OG prompts add "on a pale off-white #fafaf8 linen-paper surface against a seamless off-white wall".

## Files
| File | Size | Background | Intended use |
|---|---|---|---|
| `kuroko-hero.png` | 1536×1024 | off-white | Landing hero: vault canister with a green handle wheel beside stacked dishes; objects centre-right, headline on the left |
| `kuroko-og.png` | 1536×1024 | off-white | OG / social card: canister beside a stack of three dishes, right half; title on the left |
| `kuroko-icon.png` | 1024×1024 | transparent outside the tile | App icon / logo-mark candidate: stoneware tile with three stacked bars, the top one green (check at 32 px) |
| `kuroko-vault.png` | 1024×1024 | transparent | Feature: the vault (deposit USDC, one vault, simple); position page before connect |
| `kuroko-yield-stack.png` | 1024×1024 | transparent | Feature: yield stacking up (how Kuroko earns); the stacked-yield graphic |
| `kuroko-deposit.png` | 1024×1024 | transparent | Feature: deposit (coin above a money-box slot); deposit panel / confirmation |
| `kuroko-withdraw.png` | 1024×1024 | transparent | Feature: withdraw any time (open jar, lid aside) |
| `kuroko-empty.png` | 1024×1024 | transparent | Empty state: no deposits / no activity / no votes yet (empty dish) |

Transparent objects are trimmed to their bounds and padded to a square with an even margin, then palette-compressed
with pngquant. Hero and OG are the untouched originals; convert them to WebP/JPEG (q 82–88) when wiring them in.

README credit: "Art generated with ChatGPT".
