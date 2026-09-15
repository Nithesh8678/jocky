#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/configure.py
docker compose up --build -d
printf '\nJOCKY: http://127.0.0.1:3100\nCredentials: python3 scripts/login-info.py\nHealth: http://127.0.0.1:58000/health\n'
