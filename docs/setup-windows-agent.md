# Windows agent setup

## Before you start

You need an HTTPS JOCKY server with a publicly trusted certificate, its browser login, and a Windows build artifact. The Mac's `127.0.0.1` URL cannot be used from a Windows PC.

In GitHub open the repository → Actions → latest **successful** Verify JOCKY run → download `jocky-windows-latest`. Extract `jocky-agent.exe`. Build artifacts are unsigned prototype binaries; code signing and installer reputation are not implemented. Do not disable Windows security or add exclusions to run them.

Alternatively install Rust from its official source and the Visual Studio C++ build tools, then run `cargo build --release -p jocky-agent` on Windows.

## Foreground test first

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
