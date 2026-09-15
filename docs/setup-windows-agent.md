# Windows agent setup

## Before you start

You need an HTTPS JOCKY server with a publicly trusted certificate, its browser login, and a Windows build artifact. The Mac's `127.0.0.1` URL cannot be used from a Windows PC.

In GitHub open the repository → Actions → latest **successful** Verify JOCKY run → download `jocky-windows-latest`. Extract `jocky-agent.exe`. Build artifacts are unsigned prototype binaries; code signing and installer reputation are not implemented. Do not disable Windows security or add exclusions to run them.

Alternatively install Rust from its official source and the Visual Studio C++ build tools, then run `cargo build --release -p jocky-agent` on Windows.

## Prepared AWS package: first PC

The local handoff ZIP is `.local/releases/jocky-aws-windows.zip`, prepared from successful CI binaries at source commit `321438f`. It contains `jocky-agent.exe`, `jocky.exe`, `START-JOCKY.cmd`, instructions and SHA-256 checksums. It contains no token or password. The pinned launcher source is `infrastructure/installers/start-windows-demo.cmd`; its embedded hash must be updated deliberately when changing the binary.

1. Copy the ZIP to the Windows PC and extract it.
2. Sign in at https://jocky-lab.duckdns.org and open **Endpoints → Enroll endpoint**. Create a separate one-time token for this PC.
3. Double-click `START-JOCKY.cmd`, paste the token into its hidden prompt, and leave the window open.
4. Confirm the PC appears online, then run Quick Scan. Record job/results/evidence before calling the test passed.
5. Press Ctrl+C to stop. Restarting the launcher reuses that PC's identity; do not copy its state file to another PC.

The launcher checks the agent binary hash, configures the AWS URL, restricts `%LOCALAPPDATA%\JockyLab` to the user/SYSTEM/administrators, and limits file collection to its `Collection` subdirectory. Process command lines are disabled. This is a foreground test, not a service installation. The launcher has not yet been executed on a real Windows PC. If Windows blocks the unsigned prototype, record the message; do not disable protections.

## Manual foreground alternative

In Dashboard → Endpoints → Enroll endpoint, create a token. On the Windows PC open PowerShell in the extracted binary directory:

```powershell
$env:JOCKY_SERVER_URL = 'https://YOUR-JOCKY-DOMAIN'
$env:ENROLLMENT_TOKEN = 'ONE-TIME-TOKEN'
$env:JOCKY_AGENT_STATE = "$PWD\agent-state.json"
$env:JOCKY_SAFE_PATHS = "$PWD\Collection"
New-Item -ItemType Directory -Force .\Collection
.\jocky-agent.exe
```

Use a directory accessible only to your account and administrators because the enrollment credential is sensitive. The service installer below configures directory ACLs automatically.

Expected log: `agent_started` with a unique endpoint ID. The dashboard should show the Windows hostname, OS, version, user, and recent last-seen time. Run Quick Scan and inspect the results.

## Install as a service

After foreground validation, stop it and create a fresh enrollment token for a service identity. Run **Administrator PowerShell**:

```powershell
.\infrastructure\installers\install-windows.ps1 `
  -ServerUrl 'https://YOUR-JOCKY-DOMAIN' `
  -EnrollmentToken 'ONE-TIME-TOKEN' `
  -BinaryPath '.\jocky-agent.exe'
Get-Service JockyAgent
```

The service runs as **LocalService**, not LocalSystem, and stores files under `C:\ProgramData\Jocky`. It can have fewer permissions than the interactive user. Collector failures are explicit; do not broaden privileges simply to hide errors. Remove `ENROLLMENT_TOKEN` from the restricted config after enrollment succeeds.

Quick Scan reads system/process/TCP connection information. Persistence inventory reads services, scheduled tasks, and accessible registry Run keys. Drivers use Win32_SystemDriver. Selected System event logs are limited to one hour / 200 events. Event log visibility depends on the service account. Digital signature verification, full installed-software inventory, and startup-folder contents remain incomplete; see features.md.

## Stop, update, uninstall

```powershell
Stop-Service JockyAgent
# Copy a newly verified binary to C:\ProgramData\Jocky\jocky-agent.exe, preserving config/state.
Start-Service JockyAgent
Get-Service JockyAgent
# Remove the service:
.\infrastructure\installers\uninstall-windows.ps1
```

The uninstall script retains identity/config/logs for deliberate review. Disable the endpoint credential through the admin API when retiring the device. No antivirus exclusions or endpoint protection settings are changed.

## Completion check

Windows compilation is not proof of a successful Windows Service installation. Record the actual PC hostname, screenshot of online status, Quick Scan job ID, script result ID, and verified evidence IDs. Repeat for PC 2.

## Enrollment connection errors

`error sending request` is a transport failure, not proof of an invalid token. Check the same PC's browser first, then run:

```powershell
Resolve-DnsName jocky-lab.duckdns.org
Test-NetConnection jocky-lab.duckdns.org -Port 443
curl.exe -I https://jocky-lab.duckdns.org/api/health
```

A successful `HEAD` response may be 200 or 405; either proves that DNS/TCP/TLS reached an HTTP server. A timeout, DNS error or certificate error needs its exact message. Never add `-k` or disable certificate checks. Check Windows date/time if certificate validity fails.

New agent builds include underlying connection-error causes and a token-free check:

```powershell
$env:JOCKY_SERVER_URL = 'https://jocky-lab.duckdns.org'
.\jocky-agent.exe --check-connection
```

This only requests server health; it does not enroll or collect observations. The original `321438f` handoff binary does not support this flag. Browser/curl success alongside an agent certificate failure can indicate a different proxy or certificate-trust configuration; diagnose the cause before changing trust settings.
