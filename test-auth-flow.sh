#!/usr/bin/env bash
# test-auth-flow.sh - Wednesday operational readiness quick check

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR" || exit 1

PASS=0
FAIL=0

ok() {
    echo "[OK]   $1"
    PASS=$((PASS + 1))
}

ko() {
    echo "[FAIL] $1"
    FAIL=$((FAIL + 1))
}

check_file() {
    if [ -f "$1" ]; then
        ok "Exists: $1"
    else
        ko "Missing: $1"
    fi
}

check_contains() {
    local file="$1"
    local pattern="$2"
    local label="$3"
    if grep -qE "$pattern" "$file"; then
        ok "$label"
    else
        ko "$label"
    fi
}

check_not_contains() {
    local file="$1"
    local pattern="$2"
    local label="$3"
    if grep -qE "$pattern" "$file"; then
        ko "$label"
    else
        ok "$label"
    fi
}

echo "NEXESOCIAL - OPERATIONAL READINESS CHECK"
echo "========================================"

echo
echo "1) Core files"
check_file "public/index.html"
check_file "public/home.html"
check_file "public/sidebar.js"
check_file "public/auth-manager.js"
check_file "public/firma-movil.html"
check_file "public/check-in.html"
check_file "firestore.rules"
check_file "firebase.json"

echo
echo "2) Security and flow guards"
check_contains "firestore.rules" "match /rmt_firmes/\\{sid\\}" "Rule block rmt_firmes exists"
check_contains "firestore.rules" "allow read, write: if isSignedIn\\(\\);" "rmt_firmes requires signed-in"
check_not_contains "public/firma-movil.html" "auth-guard\\.js" "firma-movil is not blocked by internal auth guard"
check_not_contains "public/check-in.html" "auth-guard\\.js" "check-in is not blocked by internal auth guard"
check_contains "public/firma-movil.html" "signInAnonymously\\(auth\\)" "firma-movil uses anonymous auth"
check_contains "public/check-in.html" "signInAnonymously\\(auth\\)" "check-in uses anonymous auth"

echo
echo "3) Hosting hygiene"
check_contains "firebase.json" "temp_cpi\\.js" "Hosting ignore includes temp_cpi.js"
check_contains "firebase.json" "temp_cpi_check\\.js" "Hosting ignore includes temp_cpi_check.js"
check_contains "firebase.json" "test-auth-system\\.js" "Hosting ignore includes test-auth-system.js"

echo
echo "4) Manual operational flow for Wednesday"
cat <<'EOF'
- Login: public/index.html -> public/home.html
- Expediente: open one profile and save a small change
- Family report: open report and launch sign flow
- Mobile signature: open QR link in a private browser/device and complete signature
- Maintenance: create a basic item and validate signature state update
- Cites/Reception: find appointment by localizador and mark "arribat"
- Role gates: click NexePsy/NexeAdmin/NexeAudit with your real internal user
EOF

echo
echo "Summary"
echo "-------"
echo "Checks OK:   $PASS"
echo "Checks FAIL: $FAIL"

if [ "$FAIL" -gt 0 ]; then
    echo "Status: NOT READY FOR INTERNAL WORK - fix failures above"
    exit 1
fi

echo "Status: READY FOR INTERNAL WORK"
exit 0
