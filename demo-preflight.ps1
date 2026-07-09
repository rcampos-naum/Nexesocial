$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "NEXESOCIAL - DEMO PREFLIGHT" -ForegroundColor Cyan
Write-Host "==========================="
Write-Host ""

$checks = @(
    @{ Name = 'Readiness checks'; Cmd = 'powershell -ExecutionPolicy Bypass -File .\demo-readiness.ps1' },
    @{ Name = 'Critical routes';  Cmd = 'powershell -ExecutionPolicy Bypass -File .\demo-routes-check.ps1' }
)

$failed = @()

foreach ($c in $checks) {
    Write-Host ("Running: " + $c.Name) -ForegroundColor Yellow
    try {
        Invoke-Expression $c.Cmd
        if ($LASTEXITCODE -ne 0) {
            $failed += $c.Name
            Write-Host ("[FAIL] " + $c.Name) -ForegroundColor Red
        } else {
            Write-Host ("[OK]   " + $c.Name) -ForegroundColor Green
        }
    }
    catch {
        $failed += $c.Name
        Write-Host ("[FAIL] " + $c.Name + " -> " + $_.Exception.Message) -ForegroundColor Red
    }
    Write-Host ""
}

if ($failed.Count -gt 0) {
    Write-Host "PREFLIGHT RESULT: NOT READY" -ForegroundColor Red
    Write-Host ("Failed blocks: " + ($failed -join ', ')) -ForegroundColor Red
    exit 1
}

Write-Host "PREFLIGHT RESULT: READY FOR DEMO" -ForegroundColor Green
exit 0
