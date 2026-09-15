#!/bin/bash
# EC2 user data for a fresh Ubuntu 24.04 instance. Contains no application secrets.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
. /etc/os-release
if [[ "$ID" != ubuntu || "$VERSION_ID" != 24.04 ]]; then
  echo 'This bootstrap requires Ubuntu 24.04.' >&2
  exit 1
fi
apt-get update
apt-get install -y ca-certificates curl git python3
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
install -d -m 0750 -o ubuntu -g ubuntu /opt/jocky
docker --version
docker compose version
echo 'JOCKY host preparation complete. Application deployment is still required.'
