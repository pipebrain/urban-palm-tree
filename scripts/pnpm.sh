#!/bin/sh
# Use installed tools when available, or this Mac's existing Codex runtime.
# Does not download a runtime or modify the user's shell configuration.
set -eu
hvacr_runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
if ! command -v node >/dev/null 2>&1; then
  if [ ! -x "$hvacr_runtime/node/bin/node" ]; then
    echo "Node 24.19.x is required; install it and pnpm 11.25.0, then retry." >&2
    exit 1
  fi
  PATH="$hvacr_runtime/node/bin:$PATH"
  export PATH
fi
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm "$@"
elif [ -x "$hvacr_runtime/bin/fallback/pnpm" ]; then
  exec "$hvacr_runtime/bin/fallback/pnpm" "$@"
else
  echo "pnpm 11.25.0 is required; no package manager was installed automatically." >&2
  exit 1
fi
