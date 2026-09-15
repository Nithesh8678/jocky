# JOCKY verification status

Checked 15 September 2026. **Working prototype, with a real Mac agent and production Docker UI verified. Public deployment and the two-real-Windows-PC acceptance test are pending.** The full project brief has additional unfinished requirements; see [features.md](features.md).

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

## Local proof and output

- Dashboard: http://127.0.0.1:3100
- `.local/final-verification.log`: final local test/build output.
- `.local/demo-workflow.log` and `.local/verification.json`: real-agent workflow results.
- `.local/demo-report.html`: generated case report, containing local endpoint information.
- `.local/agent.log`: agent operational log; `.local/agent-state.json` contains its private credential.
- `.local/build-artifacts/`: downloaded CI binaries. Check the source commit in the artifact handoff before installing.

These local files are intentionally ignored by Git. Use [the beginner walkthrough](demo.md) to repeat the checks yourself.

## Remaining acceptance and limitations

1. Obtain an Oracle account, available Always Free A1 VM, and DNS hostname; deploy fresh cloud secrets and verify trusted HTTPS. The [Oracle assessment](oracle-cloud.md) is an estimate supported by local measurements, not a completed deployment.
2. Install/enroll agents on the owner's two real Windows PCs. Verify service restart/reconnect, supported collectors and the two-PC case/IOC workflow.
3. AI is disabled. A configured provider and its responses have not been live-tested. Optional YARA is also not enabled or live-tested.
4. Production signing, backups/restore, sustained load and the additional feature gaps in features.md remain unfinished. Compiler Lab currently compares AST representations; it does not produce native binaries.

The macOS network PID parser was corrected for the current `netstat` column layout. Older stored snapshots preserve the earlier collector output; use a new scan for current process/network associations. Evidence is preserved rather than rewritten.
