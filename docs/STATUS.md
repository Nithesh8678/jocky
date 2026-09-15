# JOCKY verification status

Checked 15 September 2026. **Working prototype deployed on AWS with trusted HTTPS and a real Mac-to-AWS workflow verified. The two-real-Windows-PC acceptance test is pending.** The full project brief has additional unfinished requirements; see [features.md](features.md).

## Boundaries

- Read-only, bounded forensic collectors. No remote shell, evasion, injection, or security-product changes.
- Synthetic fixtures are labelled demo, never counted as real endpoint verification.
- Host observations, evidence, credentials, databases and build artifacts are excluded from Git.
- AI stays disabled unless a provider is explicitly configured.

## Verified in this workspace

- `scripts/verify.sh`: 8 Rust tests, CLI checks of all example scripts, 10 backend integration tests, TypeScript and the Next.js production build passed. Two dependency deprecation warnings remain in the Python tests.
- Backend tests exercise authentication, role/organization isolation, refresh rotation, signed/leased jobs, evidence tamper detection, custody hashes, append-only audit enforcement, IOC idempotency, compiler checks, disabled AI, single-use WebSocket tickets and empty-result success/failure handling.
- All five Docker services run. PostgreSQL, Redis, evidence storage and compiler health checks return healthy/ready.
- Real Mac enrollment, heartbeat, quick scan, script execution, detections, case attachments/notes, SHA-256 verification, timeline, graph, IOC hunt and HTML report generation passed via `scripts/demo-workflow.py`.
- Computer UI checks: live endpoint data; a Quick Scan returned 860 observations; production local Monaco validation; evidence Verify changed Unchecked to Verified; Compiler Lab returned structural equivalence. These counts describe individual snapshots, not a fixed expected count.
- GitHub Actions builds/tests passed on Windows, Linux and macOS, plus backend and dashboard checks. Current commit status is visible in [Actions](https://github.com/Nithesh8678/jocky/actions). A build-runner success is not a Windows service installation test.
- Private repository: [Nithesh8678/jocky](https://github.com/Nithesh8678/jocky). Credentials, endpoint telemetry and artifacts remain outside Git.

## Verified AWS deployment

- Public dashboard: https://jocky-lab.duckdns.org. All six cloud containers run; TLS is publicly trusted.
- Fresh cloud secrets were generated separately from the local lab.
- `scripts/verify-cloud.py`: 11 checks passed for HTTPS/HSTS, backing-service health, anonymous denial, protected login cookies, authenticated resource reads, origin rejection and logout.
- A separately enrolled real Mac completed a Quick Scan with 846 observations and no collector errors. A harmless self-detection script completed with one observation and one detection.
- Case `98442b5d-ed38-43be-af6b-ddb760076f9f` contains two SHA-256-verified evidence objects. Timeline, relationship graph, IOC hunt and HTML report generation passed. Counts describe this snapshot only.
- Cloud-neutral sign-in/sidebar wording passes the production Docker build locally. Upload/restart is pending because SSH reconnection timed out after the Mac public egress IP changed; the live site still shows the earlier local-lab wording. The initial deployed source is `9730096`.
- Windows ZIP prepared from CI source commit `321438f`; archive integrity checked. One real PC is available, but its launcher, enrollment, collectors and service behavior are not yet verified.

## Local proof and output

- Local dashboard: http://127.0.0.1:3100
- `.local/aws/verification.json`: public HTTPS/authentication checks.
- `.local/aws/demo-verification.json` and `.local/aws/demo-report.html`: real Mac-to-AWS workflow and case report.
- `.local/releases/jocky-aws-windows.zip`: first-PC handoff package; no enrollment token included.
- `.local/final-verification.log`: final local test/build output.
- `.local/demo-workflow.log` and `.local/verification.json`: real-agent workflow results.
- `.local/demo-report.html`: generated case report, containing local endpoint information.
- `.local/agent.log`: agent operational log; `.local/agent-state.json` contains its private credential.
- `.local/build-artifacts/`: downloaded CI binaries. Check the source commit in the artifact handoff before installing.

These local files are intentionally ignored by Git. Use [the beginner walkthrough](demo.md) to repeat the checks yourself.

## Remaining acceptance and limitations

1. Track the AWS Free plan and export data before access expires. The console showed $100 credit and 29 days remaining before launch on 15 September 2026; this is a dated observation, not a live balance. See [AWS operations](aws-cloud.md).
2. Install/enroll agents on the owner's two real Windows PCs. Verify service restart/reconnect, supported collectors and the two-PC case/IOC workflow.
3. AI is disabled. A configured provider and its responses have not been live-tested. Optional YARA is also not enabled or live-tested.
4. Production signing, backups/restore, sustained load and the additional feature gaps in features.md remain unfinished. Compiler Lab currently compares AST representations; it does not produce native binaries.

The macOS network PID parser was corrected for the current `netstat` column layout. Older stored snapshots preserve the earlier collector output; use a new scan for current process/network associations. Evidence is preserved rather than rewritten.
