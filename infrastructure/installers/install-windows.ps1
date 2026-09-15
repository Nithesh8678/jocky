# Run in an Administrator PowerShell. Installs only JOCKY; never edits endpoint protections.
param(
  [Parameter(Mandatory=$true)][string]$ServerUrl,
  [Parameter(Mandatory=$true)][string]$EnrollmentToken,
  [string]$BinaryPath = '.\jocky-agent.exe',
  [string]$InstallDir = "$env:ProgramData\Jocky"
)
$ErrorActionPreference = 'Stop'
if (-not $ServerUrl.StartsWith('https://')) { throw 'Use an HTTPS backend URL with a trusted certificate.' }
if (Get-Service JockyAgent -ErrorAction SilentlyContinue) { throw 'Service exists. Stop and follow the manual update guide.' }
if (-not (Test-Path $BinaryPath -PathType Leaf)) { throw 'Download or build jocky-agent.exe first.' }
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
# Restrict code and credentials to Administrators, SYSTEM, and LOCAL SERVICE.
& icacls.exe $InstallDir /inheritance:r /grant:r '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-18:(OI)(CI)F' '*S-1-5-19:(OI)(CI)M' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Failed to restrict JOCKY directory permissions.' }
$Exe = Join-Path $InstallDir 'jocky-agent.exe'
Copy-Item $BinaryPath $Exe
$Safe = Join-Path $InstallDir 'Collection'
New-Item -ItemType Directory -Path $Safe -Force | Out-Null
$ConfigPath = Join-Path $InstallDir 'jocky-config.json'
$Config = @{
 JOCKY_SERVER_URL=$ServerUrl
 ENROLLMENT_TOKEN=$EnrollmentToken
 JOCKY_AGENT_STATE=(Join-Path $InstallDir 'agent-state.json')
 JOCKY_SAFE_PATHS=$Safe
}
# UTF-8 without BOM for Rust's JSON parser.
[IO.File]::WriteAllText($ConfigPath,($Config | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
$Command = '"' + $Exe + '" --service --config "' + $ConfigPath + '"'
& sc.exe create JockyAgent binPath= $Command start= auto obj= 'NT AUTHORITY\LocalService' DisplayName= 'JOCKY Read-only Forensic Agent'
if ($LASTEXITCODE -ne 0) { throw 'Service creation failed.' }
& sc.exe description JockyAgent 'Outbound, authenticated read-only forensic collection. No remote shell.'
Start-Service JockyAgent
Get-Service JockyAgent
Write-Host 'Check Dashboard > Endpoints. On success remove ENROLLMENT_TOKEN from jocky-config.json.'
Write-Host 'LocalService intentionally has limited collection permissions; review collector errors in Jobs.'
