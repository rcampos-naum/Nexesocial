# Demo Freeze Checklist

## Hard gate (must pass)

1. Run `npm run demo:preflight`
2. Result must be `READY FOR DEMO`
3. If not ready: do not continue to rehearsal

## P0 module checks (Wednesday)

1. Auth
- Login success
- Home renders without console-breaking errors
- Role-restricted areas respond correctly

2. Family/Expedient
- Open one real profile
- Save one safe non-destructive field
- Reload and confirm persisted data

3. Signature flow
- Open integrated signature modal
- Complete one signature via mobile QR or screen signature
- Verify final signed state in originating module

4. Maintenance
- Open maintenance document/record
- Trigger signature action
- Confirm state update and no blocking error

5. Cites/Reception
- Search by localizador
- Mark `arribat`
- Verify success confirmation

## Fast fallback order (if anything fails live)

1. Switch QR signing to screen signature
2. Skip non-critical module and continue with core flow (Auth -> Family -> Signature -> Reception)
3. Keep NexeSing view for audit evidence if needed

## Final 5 minutes before meeting

1. Run `npm run demo:preflight`
2. Keep demo user already authenticated
3. Keep one mobile device ready for QR
4. Keep this path order open in tabs:
- `public/home.html`
- `public/familia-perfil.html`
- `public/manteniment.html`
- `public/cites.html`

## Operator command pack

1. `npm run demo:readiness`
2. `npm run demo:routes`
3. `npm run demo:preflight`
4. `powershell -ExecutionPolicy Bypass -File .\demo-freeze.ps1`
5. `npm run demo:launch`

## Internal work command pack (from Wednesday)

1. `npm run ops:readiness`
2. `npm run ops:routes`
3. `npm run ops:preflight`
4. `npm run ops:start`
