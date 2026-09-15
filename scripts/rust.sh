#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -x .local/cargo/bin/cargo ]; then
  export CARGO_HOME="$PWD/.local/cargo" RUSTUP_HOME="$PWD/.local/rustup"
  exec .local/cargo/bin/cargo "$@"
fi
exec cargo "$@"
