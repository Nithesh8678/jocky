# Removes the service only. Retains credentials and logs so data removal is deliberate.
$ErrorActionPreference = 'Stop'
Stop-Service JockyAgent -ErrorAction SilentlyContinue
& sc.exe delete JockyAgent
if ($LASTEXITCODE -ne 0) { throw 'Service removal failed.' }
Write-Host 'Service removed. JOCKY data remains in ProgramData\Jocky. Disable the endpoint in the dashboard/API.'
