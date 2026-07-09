param(
    [string]$BaseUrl = 'https://nexesocial-bc6c4.web.app'
)

$ErrorActionPreference = 'Stop'

if (-not $BaseUrl.StartsWith('http')) {
    Write-Host "Invalid BaseUrl: $BaseUrl" -ForegroundColor Red
    exit 1
}

$paths = @(
    '/index.html',
    '/home.html',
    '/families-llistat.html',
    '/familia-perfil.html',
    '/manteniment.html',
    '/cites.html',
    '/check-in.html'
)

Write-Host "NEXESOCIAL - OPERATIONAL START" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host "Opening core daily-work tabs..."

foreach ($p in $paths) {
    $url = ($BaseUrl.TrimEnd('/')) + $p
    Write-Host " -> $url"
    Start-Process $url
}

Write-Host ""
Write-Host "Suggested work order:" -ForegroundColor Yellow
Write-Host "1) index -> 2) home -> 3) families list -> 4) family profile -> 5) maintenance -> 6) cites -> 7) check-in"
Write-Host ""
Write-Host "Use this after running ops:preflight." -ForegroundColor Green
exit 0
