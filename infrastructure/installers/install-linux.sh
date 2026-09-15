#!/usr/bin/env bash
set -euo pipefail
if [ "$EUID" -ne 0 ]; then echo 'Run with sudo on the Linux endpoint.'; exit 1; fi
if [ "$#" -ne 2 ]; then echo 'Usage: sudo install-linux.sh ./jocky-agent ./config.json'; exit 1; fi
id jocky >/dev/null 2>&1 || useradd --system --home /var/lib/jocky --shell /usr/sbin/nologin jocky
install -d -m 0750 -o jocky -g jocky /var/lib/jocky /var/lib/jocky/collection
install -d -m 0750 -o root -g jocky /etc/jocky
install -m 0755 "$1" /usr/local/bin/jocky-agent
install -m 0640 -o root -g jocky "$2" /etc/jocky/config.json
install -m 0644 "$(dirname "$0")/jocky-agent.service" /etc/systemd/system/jocky-agent.service
systemctl daemon-reload
systemctl enable --now jocky-agent
systemctl status --no-pager jocky-agent
