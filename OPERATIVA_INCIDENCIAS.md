# NexeSocial - Protocolo Operativo de Incidencias

Objetivo: resolver incidencias reales de forma rapida, trazable y sin perder continuidad asistencial.

## 1) Niveles de severidad

1. P0 Critica
- Impacto: sistema caido, bloqueo total de modulo core, riesgo de dato o firma.
- Tiempo objetivo:
- Triage inicial: 15 min
- Mitigacion: 60 min
- Comunicacion: inmediata a responsables.

2. P1 Alta
- Impacto: funcion principal degradada, sin bloqueo total.
- Tiempo objetivo:
- Triage inicial: 30 min
- Mitigacion: 4 h
- Comunicacion: en canal operativo y seguimiento activo.

3. P2 Media
- Impacto: problema con workaround aceptable.
- Tiempo objetivo:
- Triage inicial: 4 h
- Mitigacion: 1-2 dias laborables.

4. P3 Baja
- Impacto: mejora, ajuste visual o bug menor sin impacto funcional diario.
- Tiempo objetivo:
- Triage inicial: 1 dia laborable
- Resolucion: por planificacion.

## 2) Flujo operativo obligatorio

1. Registrar incidencia usando plantilla de este repositorio (puede abrirla cualquier usuario final).
2. Realizar triage por soporte o coordinacion tecnica.
3. Clasificar severidad P0/P1/P2/P3 (no la define el usuario final).
4. Reproducir en 3 intentos maximos y capturar evidencia.
5. Ejecutar validacion base:
- npm run ops:readiness
- npm run ops:routes
6. Definir accion:
- Hotfix, rollback funcional o workaround temporal.
7. Verificar solucion con caso original y un caso colateral.
8. Cerrar incidencia con causa raiz y accion preventiva.

## 3) Reglas de reporte por usuarios finales

1. Cualquier persona usuaria puede notificar una incidencia.
2. Punto de entrada web recomendado: Home -> "Reportar Incidencia" (`public/reportar-incidencia.html`).
3. La severidad oficial siempre la asigna soporte/coordinacion tecnica.
4. Si faltan datos minimos, soporte devuelve el ticket para completar informacion.
5. Ningun ticket pasa a estado En progreso sin triage inicial.

## 4) Datos minimos del ticket

1. Modulo afectado (Auth, Family, Signature, Reception, etc.)
2. Rol/usuario afectado
3. Hora exacta y entorno
4. Pasos de reproduccion
5. Resultado esperado vs actual
6. Evidencia (capturas, consola, id de documento)
7. Severidad y responsable asignado

## 5) Criterio de bloqueo operativo

1. Si hay una P0 abierta: no iniciar nuevas adaptaciones funcionales hasta mitigar.
2. Si hay mas de 2 P1 abiertas del mismo modulo: congelar cambios no criticos de ese modulo.
3. Si falla ops:preflight: no desplegar cambios.

## 6) Cierre y aprendizaje

1. Cierre tecnico: fix validado en flujo original.
2. Cierre funcional: usuario responsable confirma resultado.
3. Post-incidencia: documentar causa raiz en 3 lineas maximo.
4. Prevencion: anadir un check operativo o de ruta si aplica.
