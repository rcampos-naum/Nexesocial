# Field Encryption Matrix (collection -> field -> action)

This matrix is designed to preserve current dashboards and filters while enabling field-level encryption.

Action legend:
- `clear`: keep in plaintext (query/filter/join critical)
- `encrypted`: encrypt into `<field>_enc`
- `indexed`: keep/query by blind index only (`<field>_idx`)
- `encrypted_indexed`: encrypt + create blind index

## Root collections

| Collection | Field | Action | Notes |
|---|---|---|---|
| usuarios | id, role, roles, permisos, departamentoId, departamentoIds, ultimaModificacion | clear | Operational auth/authorization fields |
| usuarios | email | encrypted_indexed | keep exact-match search via `email_idx` |
| usuarios | nombre, telefono, departamento | encrypted | PII |
| usuarios | matrixPerms, matrixRoles | clear | Role matrix runtime |
| expedientes | numero_expediente, estado, fecha_apertura, periodId, departamentoId | clear | Query + dashboard keys |
| expedientes | dades_personals.nom, dades_personals.cognoms, dades_personals.dni, dades_personals.telefon, dades_personals.data_naixement | encrypted | High sensitivity PII |
| expedientes | salut.diagnostics, salut.alergies, salut.dependencia, salut.grau | encrypted | Health data |
| familias | estado, fechaRegistro, programasActivos, asignasidoPor | clear | Operational and dashboards |
| familias | apellido, nombreRepresentante, telefono, email, direccion, ciudad, codigoPostal, notas | encrypted | Family PII |
| beneficiarios_grupos | beneficiarioId, grupoId, actividadId, departamentoId, periodId, estado | clear | Join/filter critical |
| beneficiarios_grupos | beneficiarioNombre | encrypted | Optional display PII |
| asistencia | beneficiarioId, grupoId, actividadId, departamentoId, periodId, estado, fecha | clear | Attendance analytics |
| asistencia | observaciones | encrypted | Sensitive notes |
| notificaciones | target, targetUid, targetEmail, createdAt, type, route, activa | clear | Notification routing |
| notificaciones | missatge, title, body | encrypted | Message content |
| empleados | estado, departamentoId, departamentoIds, fechaModificacion | clear | Management workflows |
| empleados | nombre, email, telefono, rol, tipoRelacion | encrypted | Staff PII |
| cpi_familias | curs, estat, compleix, createdAt, updatedAt | clear | Program control |
| cpi_familias | nom, nif, ingressos_anuals, notes | encrypted | Highly sensitive socio-economic data |
| cpi_pressupost | curs, linies.tipus, linies.pressupost, linies.places, linies.import_unitari | clear | Budget reporting requires plaintext |

## Namespaced collections

| Collection | Field | Action | Notes |
|---|---|---|---|
| nexepsy/intervenciones/intervenciones | estado, fechaCreacion, pacienteId, beneficiariId, familiaId, numExpedient | clear | Workflow/query critical |
| nexepsy/intervenciones/intervenciones | diagnostico, observaciones, motivoConsulta | encrypted | Clinical sensitive |
| nexepsy/intervenciones/sesiones (subcollection path uses collectionGroup or explicit path) | estado, fechaSesion, interventionId | clear | Timeline and filters |
| nexepsy/intervenciones/sesiones | observaciones, acuerdos, contenidoSesion | encrypted | Session notes |
| nexepsy/pacientes/pacientes | estado, createdAt, updatedAt | clear | Operational |
| nexepsy/pacientes/pacientes | nombre, apellidos, dni, telefono, direccion, notes | encrypted | Patient PII |
| nexepsy/derivacions/solicituds | estat, data, createdAt | clear | Queue and KPIs |
| nexepsy/derivacions/solicituds | nom, telefon, motiu, comentaris | encrypted | Referral sensitive data |

## Query compatibility rule

Keep these fields `clear` unless consumers are migrated to `_idx`:
- `numero_expediente`
- `beneficiarioId`, `grupoId`, `actividadId`, `departamentoId`, `periodId`
- `estado`, date/timestamp fields
- module routing fields (`type`, `route`, `target*`)

## Backfill strategy

1. Phase A: run backfill in `dry-run` and inspect report.
2. Phase B: run backfill in `apply` with dual-write (keep plaintext).
3. Phase C: migrate readers to prefer `*_enc` and query with `*_idx` where needed.
4. Phase D: run `apply --drop-plaintext` only after validation.
