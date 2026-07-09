param(
    [string]$BaseUrl = 'https://nexesocial-bc6c4.web.app'
)

$ErrorActionPreference = 'Stop'

if (-not $BaseUrl.StartsWith('http')) {
    Write-Host "BaseUrl invalida: $BaseUrl" -ForegroundColor Red
    exit 1
}

$paths = @(
    '/index.html',
    '/home.html',
    '/familia-perfil.html',
    '/manteniment.html',
    '/cites.html',
    '/check-in.html'
)

Write-Host "NEXESOCIAL - DEMO LAUNCH" -ForegroundColor Cyan
Write-Host "========================"
Write-Host "Base URL: $BaseUrl"
Write-Host "Abriendo flujo de demo en navegador..."

foreach ($p in $paths) {
    $url = ($BaseUrl.TrimEnd('/')) + $p
    Write-Host " -> $url"
    Start-Process $url
}

Write-Host ""
Write-Host "Tabs abiertas. Orden recomendado:" -ForegroundColor Yellow
Write-Host "1) index  2) home  3) familia-perfil  4) manteniment  5) cites  6) check-in"
Write-Host ""
Write-Host "Consejo: ejecuta antes demo-freeze para validar estado." -ForegroundColor Green
exit 0
