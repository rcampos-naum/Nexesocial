$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "NEXESOCIAL - DEMO FREEZE" -ForegroundColor Cyan
Write-Host "========================"

# 1) Preflight hard gate
powershell -ExecutionPolicy Bypass -File .\demo-preflight.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Freeze blocked: preflight failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Git status snapshot" -ForegroundColor Yellow
Write-Host "-------------------"

$inGitRepo = $false
try {
    git rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -eq 0) { $inGitRepo = $true }
} catch { }

if ($inGitRepo) {
    $status = git status --short
    if ($status) {
        Write-Host "Working tree has pending changes:" -ForegroundColor Yellow
        $status | ForEach-Object { Write-Host $_ }
    } else {
        Write-Host "Working tree clean." -ForegroundColor Green
    }
} else {
    Write-Host "Git repo not detected from current path." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Freeze result: READY TO PRESENT" -ForegroundColor Green
exit 0
