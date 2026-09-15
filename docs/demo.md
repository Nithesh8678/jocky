# Beginner demo: what to click and how to know it worked

## Understand the three pieces

- **Dashboard:** the browser controls and displays an investigation.
- **Backend:** accepts requests and saves jobs, observations, and evidence.
- **Agent:** a small Rust program on each computer that reads permitted system information.

The browser does not inspect a remote PC by itself. That PC must run an enrolled agent.

## Walkthrough and success criteria

| Step | Action | Visible proof |
|---|---|---|
| 1 | Sign in | Command Center loads without an error banner |
| 2 | Open Endpoints | Your device has the right OS/version and a recent last-seen time |
| 3 | Select device → Quick Scan | Investigations shows queued/dispatched/running, then completed |
| 4 | Inspect result | A positive observation count; errors are empty for supported collectors |
| 5 | Open endpoint → process | Real PIDs/names appear; Inspect shows collector, endpoint, job, timestamp, source |
| 6 | Open endpoint → network | Addresses and states appear; no packet contents are collected |
| 7 | Playground → Local demo process → Validate | Compiler output includes `valid: true` |
| 8 | Run on endpoint | A script job completes; Investigations category `finding` contains reports and alerts |
| 9 | Detections | A clearly labelled self-detection for JOCKY appears; this is harmless |
| 10 | Cases → create | New case is listed; attach endpoint, detection, evidence and add a note |
| 11 | Timeline | Observation times and IDs appear; they are not inferred attack start times |
| 12 | Endpoint → Relationship graph | Process-parent and network relationships; click a node for its source |
| 13 | Evidence → Verify | `verified` proves stored bytes match their original SHA-256 |
| 14 | Evidence → Custody | Uploaded, attached, integrity-checked and viewed records in time order |
| 15 | Reports → select case → Generate | Open report contains case details, evidence hashes, timeline, notes |
| 16 | Indicators → filename `jocky-agent.exe` (Windows) | Hunt stored observations generates matches on PCs with that filename |
| 17 | Investigations → All enrolled endpoints → ioc | Each endpoint gets its own target state and result |
| 18 | AI Investigator | Disabled until configured; configured answers cite observation IDs and need review |

## Exact Windows acceptance demo

1. Deploy HTTPS backend, then follow setup-windows-agent.md on **both** PCs with separate enrollment tokens.
2. Confirm both unique hostnames are online. Do not count GitHub build-runner tests as these PCs.
3. Run Quick Scan on PC 1. Inspect Windows process and network records.
4. Run the local demo script (matches `jocky-agent.exe` as well as the macOS name).
5. Attach the returned detection and evidence to a case and verify the evidence.
6. Generate and open the report.
7. Add filename IOC `jocky-agent.exe`, severity low, description `JOCKY DEMO self-match`.
8. Select **all endpoints**, run the IOC collector, verify two distinct Windows result sets.
9. If configured, ask AI to summarize these observations and follow every cited ID.

This workflow is not fully accepted until both real Windows PCs complete it.

## Interpreting failures

- **Offline:** no heartbeat in 30 seconds. Check the agent process/service and server URL.
- **Queued:** endpoint has not polled, or is busy/offline. One-hour job lifetime.
- **Failed:** open Inspect and read target.error and result.summary.errors.
- **Completed with collector errors:** some data succeeded; completeness is reduced. The endpoint shows degraded.
- **Modified evidence:** saved bytes no longer match; preserve the discrepancy and investigate storage access.
- **Missing evidence:** object is gone; a database row alone is not the original artifact.
- **Empty finding report:** script ran but matched no observations. It is not a failed compiler.

## Harmless simulation

`.venv/bin/python scripts/simulate.py --seconds 60` creates a marker beneath `.local/demo`, a benign Python child, and a loopback connection. Run a scan while it is active. It automatically removes its temporary directory and terminates its own child/server. It does not create startup persistence.

## Automated real-Mac demonstration

`.venv/bin/python scripts/demo-workflow.py` prints PASS per step and saves `.local/verification.json` and `.local/demo-report.html`. Run it only when you want another labelled demo case and new collection snapshots.
