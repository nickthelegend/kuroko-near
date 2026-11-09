#!/usr/bin/env bash
set -euo pipefail
if [[ -n "${NEAR_SANDBOX_BIN:-}" ]]; then
  [[ -x "$NEAR_SANDBOX_BIN" ]] || { echo "NEAR_SANDBOX_BIN is not executable" >&2; exit 1; }
  export NEAR_SANDBOX_BIN
  return 0
fi
version=2.14.0-rc.4
bin="$PWD/.tools/near-sandbox-$version/near-sandbox"
if [[ ! -x "$bin" ]]; then
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64) platform=Darwin-arm64 ;;
    Linux-x86_64) platform=Linux-x86_64 ;;
    Linux-aarch64) platform=Linux-aarch64 ;;
    *) echo "Set NEAR_SANDBOX_BIN for this platform" >&2; exit 1 ;;
  esac
  mkdir -p "$(dirname "$bin")"
  curl -fsSL "https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore/$platform/$version/near-sandbox.tar.gz" | tar -xz -C "$(dirname "$bin")" --strip-components=1
  [[ -x "$bin" ]] || { echo "sandbox download failed" >&2; exit 1; }
fi
export NEAR_SANDBOX_BIN="$bin"
