#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
scripts/rust.sh test --workspace --locked
scripts/rust.sh build --workspace --locked
for script in examples/*.jky; do target/debug/jocky check "$script"; done
target/debug/jocky run examples/word-powershell.jky --fixtures examples/fixtures.json
PYTHONPATH=apps/api .venv/bin/pytest tests/test_api.py -q --tb=short
node scripts/prepare-editor.mjs
pnpm typecheck
pnpm build
