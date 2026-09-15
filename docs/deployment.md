# Cloud deployment

Target: a small Linux server running the Docker stack. The current target is an AWS Ubuntu VM; see the [AWS setup and account limits](aws-cloud.md). An ARM server is also compatible with the multi-architecture base images and source builds. Public HTTPS and a real Mac-to-AWS scan/evidence/report workflow passed on 15 September 2026. Windows acceptance remains pending.

## Prerequisites

A server, an SSH key you retain locally, a DNS hostname pointing to the server, ports 80/443 reachable, and Docker Engine with Compose. SSH (22) should be restricted to the administrator's public IP. Do not expose PostgreSQL, Redis or MinIO publicly.

## Steps on the server

1. Install Docker from its official Linux instructions.
2. Copy/clone the source using an authorized GitHub login. Never embed a repository access token in a clone URL or shell history.
3. Run `python3 scripts/configure.py` to generate **new cloud secrets**. Do not copy the Mac's evidence, `.env`, identity or database as a side effect of deployment.
4. Edit `.env`: `JOCKY_PUBLIC_URL=https://YOUR-DOMAIN` and `JOCKY_DOMAIN=YOUR-DOMAIN`. Keep AI disabled initially.
5. Start `docker compose -f compose.yaml -f infrastructure/deployment/compose.cloud.yaml up --build -d`.
6. Check `docker compose ps`, `curl http://127.0.0.1:58000/health`, and the HTTPS dashboard from the Mac.
7. Sign in, enroll each Windows agent separately, and run the exact acceptance workflow in demo.md.

Caddy terminates trusted TLS and routes `/api/agent/*` and `/ws` to the API. Browser APIs go through Next.js's session-cookie proxy. There is no Windows inbound firewall opening.

## Operations

- Logs: `docker compose logs --tail 100 api dashboard`.
- Stop: `docker compose stop` (retains data).
- Update: transfer reviewed tracked source over SSH (the current `/opt/jocky` is not a Git clone), then rebuild/restart using both Compose files. For a separately configured clone, use `git pull --ff-only`. Back up before schema changes.
- MinIO is pinned to the tested official Quay image because its Docker Hub pull failed during setup. Review vendor maintenance and vulnerability status before any real sensitive production use.
- Plan encrypted backups of database and object store. Test restore; never rely solely on the live free-tier VM.
- Production memory/sustained-load targets are unbenchmarked. Start with on-demand scans on two PCs; measure actual load before adding scheduled jobs or more endpoints.
