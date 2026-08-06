#!/usr/bin/env bash
# Certificate Studio launcher
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

export NO_SANDBOX=1
unset ELECTRON_RUN_AS_NODE 2>/dev/null || true
export NODE_OPTIONS="${NODE_OPTIONS:---dns-result-order=ipv4first}"

ELECTRON_BIN="$DIR/node_modules/electron/dist/electron"
if [[ ! -x "$ELECTRON_BIN" ]]; then
  ELECTRON_BIN="$DIR/node_modules/.bin/electron"
fi

if [[ ! -f "$DIR/out/main/index.js" || ! -f "$DIR/out/renderer/index.html" ]]; then
  echo "Building Certificate Studio..."
  "$DIR/node_modules/.bin/electron-vite" build
fi

exec "$ELECTRON_BIN" --no-sandbox --disable-gpu-sandbox "$DIR"
