$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "NEXESOCIAL - OPERATIVE PREFLIGHT" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$checks = @(
    @{ Name = 'Security and readiness checks'; Cmd = 'powershell -ExecutionPolicy Bypass -File .\\ops-readiness.ps1' },
    @{ Name = 'Critical work routes';         Cmd = 'powershell -ExecutionPolicy Bypass -File .\\demo-routes-check.ps1' }
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
    Write-Host "OPERATIVE RESULT: NOT READY" -ForegroundColor Red
    Write-Host ("Failed blocks: " + ($failed -join ', ')) -ForegroundColor Red
    exit 1
}

Write-Host "OPERATIVE RESULT: READY FOR INTERNAL WORK" -ForegroundColor Green
exit 0
