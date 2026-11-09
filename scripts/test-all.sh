#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/ensure-sandbox.sh
pnpm -r test
(cd packages/contract/fixture-token && cargo near build non-reproducible-wasm --no-abi)
(cd packages/contract && cargo near build non-reproducible-wasm --no-abi)
(cd packages/contract && cargo test --locked --tests)
