$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$targets = @(
    'public/index.html',
    'public/home.html',
    'public/familia-perfil.html',
    'public/familia-historico.html',
    'public/manteniment.html',
    'public/reportar-incidencia.html',
    'public/cites.html',
    'public/check-in.html',
    'public/firma-movil.html',
    'public/NexePsy/nexepsy.html',
    'public/NexeAdmin/nexeadmin.html',
    'public/NexeAudit/nexeadutisuite.html',
    'public/NexeSing/nexesing.html'
)

$ok = 0
$fail = 0

Write-Host "NEXESOCIAL - CRITICAL ROUTES CHECK" -ForegroundColor Cyan
Write-Host "=================================="

foreach ($t in $targets) {
    if (Test-Path $t) {
        Write-Host "[OK]   $t" -ForegroundColor Green
        $ok++
    } else {
        Write-Host "[FAIL] $t" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "Summary"
Write-Host "-------"
Write-Host "Routes OK:   $ok"
Write-Host "Routes FAIL: $fail"

if ($fail -gt 0) {
    exit 1
}

exit 0
