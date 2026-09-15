# JOCKY

**Evidence-led, read-only endpoint investigation.** A Rust forensic agent and language, FastAPI/PostgreSQL backend, and Next.js command center.

JOCKY is a working prototype deployed at [jocky-lab.duckdns.org](https://jocky-lab.duckdns.org), with real Mac-to-AWS and first-Windows-PC scan/evidence/report verification. The required two-Windows-PC acceptance test is still pending. See [verification status](docs/STATUS.md) and the [feature matrix](docs/features.md) for supported behavior and limits. Current cloud target: AWS EC2 Ubuntu; see [AWS setup and Free plan limits](docs/aws-cloud.md). Trusted HTTPS, cloud authentication, scanning, evidence verification and report generation passed on 15 September 2026.

## Open what we built

- Dashboard: http://127.0.0.1:3100
- API health: http://127.0.0.1:58000/health
- Interactive API documentation: http://127.0.0.1:58000/docs
- Credentials: `python3 scripts/login-info.py` (private local terminal output)
- Start platform: `bash scripts/start.sh` or, after configuration, `docker compose up --build -d`
- Stop containers without deleting data: `docker compose stop`

Do not run a second platform instance on the same ports. Development servers and Docker both use 3100/58000.

## First five minutes

1. Sign in using the generated local credentials.
2. Open **Endpoints**. An enrolled Mac appears while the local agent runs.
3. Select it and click **Quick Scan**.
4. Open **Investigations**. Wait for the job to say **completed** and show a positive observation count.
5. Open **Evidence**, click **Verify**. A matching stored SHA-256 yields **verified**.

A green endpoint means it recently sent a heartbeat. A completed job means the backend accepted its result. A verified evidence object means its saved bytes match the original fingerprint. These are separate checks.

**Demo detections intentionally match JOCKY itself. They are not evidence that your Mac is compromised.**

## Local developer setup

Docker Desktop, Node 24+, pnpm 11.19, Python 3.12+, and Rust stable are required for development. Docker-only startup needs Docker and Python for initial secret generation.

```sh
python3 scripts/configure.py
python3 -m venv .venv
.venv/bin/pip install -r apps/api/requirements.lock.txt
pnpm install --frozen-lockfile
node scripts/prepare-editor.mjs
bash scripts/rust.sh build --workspace --locked
docker compose up -d postgres redis minio
PYTHONPATH=apps/api .venv/bin/alembic -c apps/api/alembic.ini upgrade head
PYTHONPATH=apps/api .venv/bin/uvicorn jocky.main:app --host 127.0.0.1 --port 58000
# A second terminal:
pnpm dev
# A third terminal, explicit enrollment/read-only collection of your Mac:
.venv/bin/python scripts/local-agent.py
```

The setup used in this workspace keeps Rust under `.local/cargo` and `.local/rustup`; `scripts/rust.sh` finds it. No shell profile was modified.

## Verification

```sh
bash scripts/verify.sh
# API must be running and the real local agent must be connected:
.venv/bin/python scripts/demo-workflow.py
```

Verification writes local reports under `.local/`. They can contain endpoint data and are excluded from Git. API tests create isolated test organizations; fixture endpoints do not appear in the real workspace. GitHub Actions builds Rust on Windows/Linux/macOS and publishes binaries as build artifacts.

## Documentation

- [Beginner walkthrough](docs/demo.md)
- [Terminology](docs/terminology.md)
- [Architecture](docs/architecture.md)
- [macOS setup](docs/setup-macos.md)
- [Windows agent](docs/setup-windows-agent.md)
- [Linux agent](docs/setup-linux-agent.md)
- [JOCKY language](docs/jocky-language.md)
- [Security model](docs/security-model.md)
- [API](docs/api.md)
- [Database](docs/database.md)
- [Deployment](docs/deployment.md)
- [AWS demo setup](docs/aws-cloud.md)
- [Oracle Cloud assessment](docs/oracle-cloud.md)
- [Feature matrix](docs/features.md)

## Safety

Agents execute only an allowlist of read-only collectors. No arbitrary shell, injection, evasion, driver exploitation, covert transport, security-product changes, or automatic agent updates exist. HTTPS is mandatory except an explicit loopback-only development setting. Command-line collection is off by default. File collection requires an agent-local allowlist.

AI is disabled by default. Configuring a cloud AI provider deliberately transmits selected observation context to it. AI references are validated but factual interpretation still requires review.
