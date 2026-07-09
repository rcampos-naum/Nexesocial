$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$pass = 0
$fail = 0

function Ok([string]$msg) {
    Write-Host "[OK]   $msg" -ForegroundColor Green
    $script:pass++
}

function Ko([string]$msg) {
    Write-Host "[FAIL] $msg" -ForegroundColor Red
    $script:fail++
}

function Check-File([string]$path) {
    if (Test-Path $path) { Ok "Exists: $path" } else { Ko "Missing: $path" }
}

function Check-Contains([string]$path, [string]$pattern, [string]$label) {
    if (-not (Test-Path $path)) { Ko "$label (file missing: $path)"; return }
    $txt = Get-Content -Path $path -Raw
    if ($txt -match $pattern) { Ok $label } else { Ko $label }
}

function Check-NotContains([string]$path, [string]$pattern, [string]$label) {
    if (-not (Test-Path $path)) { Ko "$label (file missing: $path)"; return }
    $txt = Get-Content -Path $path -Raw
    if ($txt -match $pattern) { Ko $label } else { Ok $label }
}

Write-Host "NEXESOCIAL - OPERATIONAL READINESS CHECK" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

Write-Host "1) Core files" -ForegroundColor Yellow
Check-File "public/index.html"
Check-File "public/home.html"
Check-File "public/sidebar.js"
Check-File "public/auth-manager.js"
Check-File "public/firma-movil.html"
Check-File "public/check-in.html"
Check-File "public/reportar-incidencia.html"
Check-File "firestore.rules"
Check-File "firebase.json"

Write-Host ""
Write-Host "2) Security and access guards" -ForegroundColor Yellow
Check-Contains "firestore.rules" "match /rmt_firmes/\{sid\}" "Rule block rmt_firmes exists"
Check-Contains "firestore.rules" "allow read, write: if isSignedIn\(\);" "rmt_firmes requires signed-in"
Check-Contains "firestore.rules" "canCreateCorrectiveTicketAsReporter\(" "web incident create rule helper exists"
Check-Contains "firestore.rules" "allow create: if canEditOperationalData\(\) \|\| canCreateCorrectiveTicketAsReporter\(\);" "rmt_correctiu allows safe end-user create"
Check-NotContains "public/firma-movil.html" "auth-guard\.js" "firma-movil is not blocked by internal auth guard"
Check-NotContains "public/check-in.html" "auth-guard\.js" "check-in is not blocked by internal auth guard"
Check-Contains "public/home.html" "reportar-incidencia\.html" "home includes web incident report entry"
Check-Contains "public/firma-movil.html" "signInAnonymously\(auth\)" "firma-movil uses anonymous auth"
Check-Contains "public/check-in.html" "signInAnonymously\(auth\)" "check-in uses anonymous auth"

Write-Host ""
Write-Host "3) Hosting hygiene" -ForegroundColor Yellow
Check-Contains "firebase.json" "temp_cpi\.js" "Hosting ignore includes temp_cpi.js"
Check-Contains "firebase.json" "temp_cpi_check\.js" "Hosting ignore includes temp_cpi_check.js"
Check-Contains "firebase.json" "test-auth-system\.js" "Hosting ignore includes test-auth-system.js"

Write-Host ""
Write-Host "4) Minimum live operation flow for Wednesday" -ForegroundColor Yellow
Write-Host "- Login: public/index.html -> public/home.html"
Write-Host "- Family/Expedient: open one profile and save a safe non-destructive change"
Write-Host "- Signature: complete one full sign flow (mobile QR or on-screen)"
Write-Host "- Maintenance: update one record and confirm no blocking error"
Write-Host "- Cites/Reception: find appointment by localizador and mark 'arribat'"
Write-Host "- Role gates: validate NexePsy/NexeAdmin/NexeAudit with real internal users"

Write-Host ""
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "-------"
Write-Host "Checks OK:   $pass"
Write-Host "Checks FAIL: $fail"

if ($fail -gt 0) {
    Write-Host "Status: NOT READY FOR INTERNAL WORK - fix failures above" -ForegroundColor Red
    exit 1
}

Write-Host "Status: READY FOR INTERNAL WORK" -ForegroundColor Green
exit 0
