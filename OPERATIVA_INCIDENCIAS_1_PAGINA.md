# NexeSocial - Incidencias (1 pagina)

Uso: guia rapida para abrir, priorizar y cerrar incidencias sin bloquear la operativa diaria.

## 1) Severidad

1. P0 Critica
- Sistema caido, bloqueo total o riesgo de dato/firma.
- Objetivo: triage 15 min, mitigacion 60 min.

2. P1 Alta
- Funcion principal degradada, sin caida total.
- Objetivo: triage 30 min, mitigacion 4 h.

3. P2 Media
- Problema con workaround valido.
- Objetivo: triage 4 h, resolucion 1-2 dias.

4. P3 Baja
- Mejora o bug menor sin impacto diario.
- Objetivo: triage 1 dia, planificar resolucion.

## 2) Flujo express (obligatorio)

1. Abrir ticket desde la web: Home -> "Reportar Incidencia" (`public/reportar-incidencia.html`) o usar `INCIDENCIA_PLANTILLA.md`.
2. Cualquier usuario final puede reportar.
3. Soporte/coordinacion realiza triage y asigna severidad (P0/P1/P2/P3).
4. Si faltan datos minimos, devolver ticket para completar.
5. Reproducir maximo 3 intentos y guardar evidencia.
6. Ejecutar:
- `npm run ops:readiness`
- `npm run ops:routes`
7. Aplicar accion:
- Hotfix, rollback o workaround.
8. Validar caso original + 1 caso colateral.
9. Cerrar con causa raiz (max 3 lineas).

## 3) Datos minimos del ticket

1. Modulo afectado
2. Rol/usuario afectado
3. Hora y entorno
4. Pasos de reproduccion
5. Esperado vs actual
6. Evidencia (captura/log/id)
7. Responsable tecnico

## 4) Reglas de bloqueo

1. P0 abierta: parar nuevas adaptaciones hasta mitigacion.
2. >2 P1 del mismo modulo: congelar cambios no criticos en ese modulo.
3. Si falla `npm run ops:preflight`: no desplegar.

## 5) Cierre valido

1. Fix tecnico validado.
2. Validacion funcional por usuario responsable.
3. Causa raiz documentada.
4. Accion preventiva definida.
