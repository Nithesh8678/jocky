#!/usr/bin/env bash
set -euo pipefail
systemctl disable --now jocky-agent
rm /etc/systemd/system/jocky-agent.service
systemctl daemon-reload
printf 'Service removed. Binary, identity, configuration, and logs retained for deliberate review.\n'
