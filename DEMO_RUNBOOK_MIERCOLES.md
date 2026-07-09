# NexeSocial - Runbook Demo Miercoles

## 1) Pre-demo (15-20 min antes)

1. Ejecutar chequeo rapido:
   - PowerShell: `powershell -ExecutionPolicy Bypass -File .\demo-readiness.ps1`
   - PowerShell (todo en uno): `powershell -ExecutionPolicy Bypass -File .\demo-preflight.ps1`
2. Abrir sesion con usuario demo real y dejar abiertas estas pestanas:
   - `public/index.html`
   - `public/home.html`
   - `public/familia-perfil.html`
   - `public/manteniment.html`
   - `public/cites.html`
3. Tener un movil listo para escanear QR (o una ventana privada del navegador).
4. Limpiar cache del navegador solo si hubo cambios de ultima hora.

## 2) Orden recomendado de presentacion (12-18 min)

1. Login y control de acceso
   - Entrar en inicio de sesion.
   - Mostrar home y permisos por rol.
2. Flujo expediente/familia
   - Abrir perfil de familia o expediente.
   - Mostrar datos y accion principal.
3. Firma integrada
   - Lanzar accion Firmar.
   - Elegir opcion movil QR.
   - Escanear, firmar y confirmar retorno de estado.
4. Mantenimiento
   - Abrir documento/parte.
   - Ejecutar firma y mostrar trazabilidad.
5. Citas y recepcion
   - Buscar por localizador.
   - Marcar llegada (arribat).

## 3) Puntos tecnicos a remarcar

- Firma integrada en pagina (sin salir del flujo principal).
- Opcion movil QR funcional para firma remota.
- NexeSing como control y auditoria.
- Endurecimiento de seguridad en sesiones de firma.
- Limpieza de artefactos temporales fuera de hosting.

## 4) Plan B en vivo (si algo falla)

1. Si falla firma movil QR:
   - Cambiar a firma en pantalla (PC/tablet) desde el mismo modal.
2. Si hay latencia en Firestore:
   - Refrescar modulo y repetir una sola vez.
3. Si falla ruta de modulo especial:
   - Continuar con flujo principal (familia + firma + recepcion).
4. Si falla emulador local:
   - No bloquear demo. Usar entorno web ya desplegado.

## 5) Criterio de salida de demo

- Login correcto.
- Un flujo de familia/expediente completado.
- Una firma completada (ideal QR movil).
- Una llegada en recepcion marcada correctamente.
- Cierre con mensaje de estado estable y siguientes pasos.
