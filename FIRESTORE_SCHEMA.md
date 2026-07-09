# NEXESOCIAL - FIRESTORE DATA SCHEMA DOCUMENTATION
## Complete Database Architecture & Collection Reference

**Version:** 2.0 | **Last Updated:** 2026-04-14 | **Project:** NexeSocial

---

## TABLE OF CONTENTS

1. [Architecture Overview](#architecture-overview)
2. [Collection Structure](#collection-structure)
3. [Field Definitions](#field-definitions)
4. [Relationships & References](#relationships--references)
5. [Firestore Rules & Security](#firestore-rules--security)
6. [Best Practices](#best-practices)
7. [Query Optimization](#query-optimization)

---

## ARCHITECTURE OVERVIEW

### Storage Organization

```
nexesocial-bc6c4 (Firebase Project)
├── Root Collections (Public Data)
├── NexeAdmin Collections (Administrative)
├── NexePsy Collections (Psychology Services)
└── NexeAudit Collections (Quality Management)
```

### Key Principles

- **RBAC-Based Access:** All collections use role-based access control via `firestore.rules`
- **Audit Logging:** All modifications logged in respective `auditoria` subcollections
- **Data Immutability:** Historical records are immutable; changes create new documents
- **Denormalization:** Some data is duplicated for query performance

---

## COLLECTION STRUCTURE

### ROOT LEVEL COLLECTIONS

#### **1. usuarios (Users & Authentication)**

**Path:** `/usuarios/{userId}`

```json
{
  "id": "uid_from_firebase_auth",
  "email": "user@nexesocial.es",
  "nombre": "Juan",
  "apellidos": "García López",
  "rol": "admin",
  "permisos": ["families.read", "groups.edit", "personnel.edit"],
  "perfilImagenUrl": "gs://bucket/perfiles/uid.jpg",
  "telefonoContacto": "+34912345678",
  "departamento": "Administración",
  "activo": true,
  "fechaCreación": Timestamp,
  "últimaConexión": Timestamp,
  "configuraciones": {
    "idioma": "ca",
    "tema": "claro",
    "notificacionesEmail": true
  }
}
```

**Indexes Required:**
- `activo` (Ascending)
- `rol` (Ascending)
- `correoElectrónico` (Ascending)

**Subcollections:**
- `historialConexiones`: Login history (for audit)

---

#### **2. roles (Role-Based Access Control)**

**Path:** `/roles/{roleName}`

```json
{
  "nombre": "admin",
  "descripción": "Administrator con acceso total",
  "permisos": {
    "families.read": true,
    "families.edit": true,
    "families.delete": true,
    "groups.read": true,
    "groups.edit": true,
    "groups.attendance": true,
    "personnel.read": true,
    "personnel.edit": true,
    "grants.read": true,
    "grants.edit": true,
    "grants.approve": true,
    "insurance.read": true,
    "insurance.edit": true,
    "documents.read": true,
    "documents.edit": true,
    "documents.delete": true,
    "suppliers.read": true,
    "suppliers.edit": true,
    "suppliers.invoices": true,
    "psychology.read": true,
    "psychology.edit": true,
    "psychology.sessions": true,
    "audit.read": true,
    "audit.plans": true,
    "audit.risks": true,
    "reports.generate": true
  },
  "active": true,
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

**Roles Predefinidos:**
- `superadmin`: Acceso total al sistema
- `admin`: Acceso administrativo completo
- `editor`: Puede crear y editar contenido
- `visualitzador`: Solo lectura
- `terapeuta`: Acceso a intervenciones y sesiones
- `auditor`: Acceso a auditoría e informes

---

#### **3. familias (Family Records)**

**Path:** `/familias/{familiaId}`

```json
{
  "apellido": "García López",
  "nombreRepresentante": "Miguel García",
  "teléfono": "+34912345678",
  "email": "familia@example.com",
  "dirección": "Calle Principal 123",
  "ciudad": "Barcelona",
  "codigoPostal": "08002",
  "miembrosTotal": 4,
  "menoresTotal": 1,
  "estado": "activa",
  "programasActivos": ["Apoyo Familiar", "Asesoramiento"],
  "fechaRegistro": Timestamp,
  "asignasidoPor": "uid_trabajador",
  "notas": "Familia vulnerable",
  "indicadores": {
    "riesgoSocial": "medio",
    "necesidadIntervención": true,
    "recursosAsignados": ["vivienda", "alimentación"]
  }
}
```

**Indexes Required:**
- `estado` + `fechaRegistro` (Descending)
- `apellido` (Ascending)
- `ciudad` (Ascending)

**Subcollections:**
- `/familias/{familiaId}/miembros`: Family members
- `/familias/{familiaId}/historico`: Change history (immutable)

---

#### **4. grupos (Group Management)**

**Path:** `/grupos/{grupoId}`

```json
{
  "nombre": "Grupo de Apoyo Matinal",
  "descripción": "Grupo de apoyo para menores",
  "horarioInicio": "09:00",
  "horarioFin": "11:00",
  "diasSemana": ["lunes", "martes", "miércoles"],
  "lugarReunión": "Sala 101",
  "capacidad": 15,
  "miembrosActuales": 12,
  "coordinador": "uid_coordinador",
  "estado": "activo",
  "fechaCreación": Timestamp,
  "objetivos": ["Desarrollar habilidades sociales", "Apoyo emocional"],
  "requisitosParticipación": "Edad 12-16"
}
```

**Subcollections:**
- `/grupos/{grupoId}/asistencia`: Attendance records
- `/grupos/{grupoId}/miembros`: Group members

---

#### **5. programes_gestio (Programs & Initiatives)**

**Path:** `/programes_gestio/{programId}`

```json
{
  "nombre": "Programa de Inserción Laboral",
  "descripción": "Programa para inserción laboral de jóvenes",
  "responsable": "uid_responsable",
  "beneficiarios": ["familia1", "familia2"],
  "estado": "activo",
  "fechaInicio": Timestamp,
  "fechaFin": Timestamp,
  "presupuesto": 50000,
  "gastosRealizados": 15230,
  "indicadoresÉxito": {
    "participantes": 25,
    "exitosInsercción": 18
  },
  "actividades": [
    { "nombre": "Formación", "fecha": Timestamp },
    { "nombre": "Followed-up", "fecha": Timestamp }
  ]
}
```

---

### NEXEADMIN COLLECTIONS (`admin/`)

#### **6. admin/personal (Personnel Management)**

**Path:** `/admin/personal/{empleadoId}`

```json
{
  "nombre": "María",
  "apellidos": "Martínez González",
  "dni": "12345678A",
  "puesto": "Trabajadora Social",
  "departamento": "Servicios Sociales",
  "fechaContrato": Timestamp,
  "contratante": "org_name",
  "salario": 25000,
  "horário": "09:00-17:00",
  "timeMotoId": "TM_12345",
  "estado": "activo",
  "telefonoContacto": "+34912345678",
  "correoEmpresa": "maria@nexesocial.es",
  "supervisorId": "uid_supervisor",
  "permisosEspeciales": [],
  "documentosPersonales": {
    "certificadoNivelEstudios": "gs://bucket/docs/",
    "antecedentesDelictivos": "gs://bucket/docs/"
  },
  "formacionContinua": [
    { "nombre": "Curso GDPR", "fecha": Timestamp, "horas": 20 }
  ]
}
```

**Indexes:**
- `estado` (Ascending)
- `puesto` (Ascending)
- `departamento` (Ascending)

---

####  **7. admin/subvenciones (Grant Management - CRITICAL)**

**Path:** `/admin/subvenciones/{subvencionId}`

```json
{
  "nombre": "Subvención Vivienda 2026",
  "organismo": "Generalitat de Catalunya",
  "montantTotal": 500000,
  "montantAsignado": 0,
  "montantDisponible": 500000,
  "estado": "disponible",
  "criterios": {
    "rentaMaximaFamilia": 25000,
    "edadMaximaBeneficiario": 65,
    "estadosAceptados": ["activa", "acreditada"]
  },
  "plazo": {
    "aperturaConvocatoria": Timestamp,
    "cierreSolicitudes": Timestamp,
    "resoluciónEstimada": Timestamp
  },
  "beneficiarios": ["familia1", "familia2"],
  "distribuciónPrevista": [
    { "familiaId": "familia1", "monto": 5000, "estado": "aprobada" },
    { "familiaId": "familia2", "monto": 3000, "estado": "pendiente" }
  ],
  "documentos": {
    "basesReguladorasUrl": "gs://bucket/subvenciones/",
    "solicitaGedesUrl": "gs://bucket/subvenciones/"
  },
  "responsable": "uid_gestor",
  "notas": "Prioritaria para familias vulnerables",
  "auditoía": [
    { "evento": "creación", "empleado": "uid", "fecha": Timestamp }
  ]
}
```

**Subcollections:**
- `/admin/subvenciones/{subvencionId}/aprobaciones`: Approval workflow

---

#### **8. admin/documentos (Document Management)**

**Path:** `/admin/documentos/{documentoId}`

```json
{
  "nombre": "Escritura de Propiedad",
  "tipo": "legal",
  "familia": "familiaId",
  "descripción": "Documentación de bienes inmuebles",
  "fechaDocumento": Timestamp,
  "fechaVencimiento": Timestamp,
  "estado": "válido",
  "archivoUrl": "gs://bucket/admin/documentos/",
  "tamañoMB": 2.5,
  "formato": "pdf",
  "uploadPor": "uid_usuario",
  "uploadFecha": Timestamp,
  "requiereRenovación": true,
  "diasParaVencimiento": 45,
  "notas": "",
  "etiquetas": ["legal", "propiedad", "2026"]
}
```

**Indexes:**
- `fechaVencimiento` (Ascending)
- `estado` (Ascending)
- `familia` (Ascending)

**Subcollections:**
- `/admin/documentos/{documentoId}/metadata`: File metadata
- `/admin/documentos/{documentoId}/historialVersiones`: Version history

---

#### **9. admin/proveedores (Supplier Management)**

**Path:** `/admin/proveedores/{proveedorId}`

```json
{
  "nombre": "Suministros Industriales SA",
  "cif": "A12345678",
  "persona Contacto": "Juan López",
  "telefonoContacto": "+34912345678",
  "correoElectrónico": "contacto@suministros.es",
  "dirección": "Av. Industria 456",
  "ciudad": "Sabadell",
  "codigoPostal": "08200",
  "estado": "activo",
  "categoriasServicios": ["suministros", "energía"],
  "metodoPago": "transferencia",
  "diasPago": 30,
  "acuerdoPrecio": { "tipo": "negociado", "descuento": 10 },
  "documentosAdjuntos": {
    "cif": "gs://bucket/proveedores/",
    "garantía": "gs://bucket/proveedores/"
  },
  "historialFacturas": {
    "totalFacturas": 25,
    "montantTotal": 45000,
    "ultimafactura": Timestamp
  }
}
```

**Subcollections:**
- `/admin/proveedores/{proveedorId}/facturas`: Invoices with OCR data

---

#### **10. admin/assegurances (Insurance Management)**

**Path:** `/admin/assegurances/{polissaId}`

```json
{
  "referenciaPolissa": "POL-2024-001",
  "empresa_aseguradora": "AXA Seguros",
  "tipoAseguranza": "RC General",
  "numeroAsegurados": 5,
  "cobertura": 1000000,
  "prima_anual": 3500,
  "datInicio": Timestamp,
  "dateVencimiento": Timestamp,
  "diasParaVencimiento": 120,
  "aviso_renovacion": 45,
  "estado": "vigent",
  "documentoPolissaUrl": "gs://bucket/insurance/",
  "contactoSiniestros": "+34912345678",
  "notas": "Cobertura de máximos riesgos",
  "condiciones": {
    "franquicia": 500,
    "limiteTrimestral": 25000,
    "limitesGeograficos": ["España", "Francia"]
  }
}
```

**Indexes:**
- `dateVencimiento` (Ascending)
- `estado` (Ascending)

**Subcollections:**
- `/admin/assegurances/{polissaId}/alertas`: Expiration alerts

---

### NEXEPSY COLLECTIONS (`nexepsy/`)

#### **11. nexepsy/intervenciones (Psychology Interventions)**

**Path:** `/nexepsy/intervenciones/{intervencionId}`

```json
{
  "pacienteId": "familiaId",
  "pacienteNombre": "Carlos García",
  "diagnóstico": "Ansiedad generalizada",
  "terapeutaId": "uid_terapeuta",
  "terapeutaNombre": "Dra. Rosa Martínez",
  "descripción": "Intervención individualizada para manejo de ansiedad",
  "sesionesPlaneadas": 12,
  "sesionesRealizadas": 4,
  "estado": "activa",
  "objetivos": [
    "Reducción de síntomas de ansiedad",
    "Desarrollar técnicas de manejo del estrés"
  ],
  "metodologías": ["TCC", "Mindfulness"],
  "fechaCreación": Timestamp,
  "fechaPróximaSesión": Timestamp,
  "resultado_evaluado": "en_progreso",
  "notas": "Buen avance en técnicas de respiración",
  "documentosProgramaIntervención": "gs://bucket/psy/"
}
```

**Indexes:**
- `estado` (Ascending)
- `diagnóstico` (Ascending)
- `terapeutaId` (Ascending)
- `fechaCreación` (Descending)

**Subcollections:**
- `/nexepsy/intervenciones/{intervencionId}/sesiones`: Session records

---

#### **12. nexepsy/intervenciones/.../sesiones (Psychology Sessions)**

**Path:** `/nexepsy/intervenciones/{intervencionId}/sesiones/{sesionId}`

```json
{
  "fechaSesión": Timestamp,
  "duración": 60,
  "tema": "Técnicas de respiración",
  "contenido": "Se trabajó sobre técnicas de respiración profunda para control de ansiedad",
  "notas": "Paciente mostró buenos resultados",
  "terapeutaNombre": "Dra. Rosa Martínez",
  "estado": "completada",
  "tareasEncargadas": ["Practicar respiración 3 veces al día"],
  "próximaActividadSugerida": "Introducción a mindfulness",
  "evaluación": {
    "asistencia": "presente",
    "participación": "alta",
    "comprensión": "buena",
    "compromiso": "muy alto"
  },
  "ficheSiguimiento": "Paciente progresa adecuadamente",
  "fechaRegistro": Timestamp
}
```

---

#### **13. nexepsy/pacientes (Psychology Patients)**

**Path:** `/nexepsy/pacientes/{pacienteId}`

```json
{
  "nombre": "Carlos",
  "apellidos": "García López",
  "dni": "12345678A",
  "fechaNacimiento": Timestamp,
  "género": "masculino",
  "teléfono": "+34912345678",
  "email": "carlos@example.com",
  "dirección": "Calle Principal 456",
  "antecedentesClinic": "Ninguno reportado",
  "activo": true,
  "intervencionesActivas": 1,
  "intervencionesFinalizadas": 0,
  "fechaRegistro": Timestamp,
  "notas": "Derivado desde servicios sociales"
}
```

---

### NEXEAUDIT COLLECTIONS (`nexeaudit/`)

#### **14. nexeaudit/planesAuditoria (Audit Plans)**

**Path:** `/nexeaudit/planesAuditoria/{planId}`

```json
{
  "nombre": "Auditoría Interna Q1-2026",
  "descripción": "Auditoría de procesos de recursos humanos",
  "áreaAuditada": "RRHH",
  "auditorAsignado": "uid_auditor",
  "estado": "planificado",
  "fechaInicio": Timestamp,
  "fechaFin": Timestamp,
  "objetivos": [
    "Verificar cumplimiento de ISO 9001:2015",
    "Evaluar eficacia de controles"
  ],
  "criterios": [
    "Capítulo 7 de ISO 9001",
    "Legislación laboral española"
  ],
  "alcance": "Total",
  "hallazgosAbiertos": 3,
  "hallazgosCerrados": 0,
  "hallazgosTotal": 3
}
```

**Subcollections:**
- `/nexeaudit/planesAuditoria/{planId}/hallazgos`: Audit findings

---

#### **15. nexeaudit/planesAuditoria/.../hallazgos (Audit Findings)**

**Path:** `/nexeaudit/planesAuditoria/{planId}/hallazgos/{hallazgoId}`

```json
{
  "descripción": "Fichas de personal incompletas",
  "severidad": "media",
  "normaAplicable": "ISO 9001:2015 Cláusula 7.4",
  "accionCorrectiva": "Completar fichas y implementar control mensual",
  "responsable": "uid_gestor_rrhh",
  "fechaVencimiento": Timestamp,
  "estado": "abierto",
  "evidencia": ["Muestreo de 10 expedientes"],
  "plazo_Ejecución": 30,
  "fechaCierre": null
}
```

**Subcollections:**
- `.../hallazgos/{hallazgoId}/evidencias`: Supporting evidence

---

#### **16. nexeaudit/riesgos (Risk Register)**

**Path:** `/nexeaudit/riesgos/{riesgoId}`

```json
{
  "descripción": "Incumplimiento de regulaciones de GDPR",
  "categoría": "Legal",
  "causaRaíz": "Carencia de formación en protección de datos",
  "probabilidad": "media",
  "impacto": "alto",
  "nivel": "alto",
  "propietarioRiesgo": "uid_responsable",
  "estrategiaControl": "mitigación",
  "estadoMitigación": "planificado",
  "medidasMitigación": [
    "Formación GDPR para todo el personal",
    "Auditoría de cumplimiento trimestral"
  ],
  "fechaIdenticación": Timestamp,
  "ultimaEvaluación": Timestamp
}
```

---

#### **17. nexeaudit/controles (ISO 9001 Controls)**

**Path:** `/nexeaudit/controles/{controlId}`

```json
{
  "nombre": "Verificación de Nóminas",
  "descripción": "Control mensual de exactitud de nóminas",
  "tipoControl": "preventivo",
  "frecuenciaVerificación": "mensual",
  "responsable": "uid_gestor",
  "procedimientoVerificación": "Comparar nóminas vs gastos reales",
  "criterioAceptación": "100% de precisión",
  "estado": "activo",
  "fechaImplementación": Timestamp,
  "últimaVerificación": Timestamp,
  "resultadoÚltima": "conforme"
}
```

---

#### **18. nexeaudit/accionesCorrectivas (Corrective Actions)**

**Path:** `/nexeaudit/accionesCorrectivas/{accionId}`

```json
{
  "hallazgoOrigen": "hallazgoId",
  "descripción": "Implementar política de seguridad de datos",
  "causaRaíz": "Falta de marco normativo interno",
  "responsableImplementación": "uid_ciso",
  "fechaApertura": Timestamp,
  "fechaVencimiento": Timestamp,
  "estado": "abierta",
  "porcentajeAvance": 35,
  "recursosNecesarios": ["Personal TI", "Consultoría externa"],
  "fechaCierre": null,
  "evidenciaImplementación": null
}
```

---

### UTLITY COLLECTIONS

#### **19. genogramas (Family Trees)**

**Path:** `/genogramas/{genogramaId}`

```json
{
  "familiaId": "familiaId",
  "nombre": "Árbol genealógico García López",
  "descripción": "Generaciones 1-4",
  "fechaCreación": Timestamp,
  "creadorId": "uid",
  "estado": "guardado",
  "personas": [
    {
      "id": "p1",
      "nombre": "Juan",
      "apellidos": "García García",
      "genre": "masculino",
      "fechaNacimiento": Timestamp,
      "estado": "vivo",
      "x": 100,
      "y": 50
    }
  ],
  "relaciones": [
    {
      "id": "r1",
      "tipo": "matrimonio",
      "persona1Id": "p1",
      "persona2Id": "p2",
      "fechaInicio": Timestamp
    }
  ]
}
```

---

#### **20. reportes (System Reports)**

**Path:** `/reportes/{reporteId}`

```json
{
  "tipo": "estadístico",
  "módulo": "NexePsy",
  "fechaGeneración": Timestamp,
  "período": {
    "inicio": Timestamp,
    "fin": Timestamp
  },
  "datos": {
    "totalIntervenciones": 45,
    "intervencionesActivas": 28,
    "sesionesRealizadas": 134,
    "sessionesPromedio": 3.2
  },
  "generadoPor": "uid_usuario",
  "descargas": 0,
  "última Descarga": null
}
```

---

#### **21. permisos_solicitudes (Permission Requests)**

**Path:** `/permisos_solicitudes/{solicitudId}`

```json
{
  "usuario_id": "uid_solicitante",
  "permiso_solicitado": "families.delete",
  "justificación": "Necesario para limpieza de registros antiguos",
  "fecha_solicitud": Timestamp,
  "estado": "pendiente",
  "evaluadoPor": null,
  "fecha_evaluación": null,
  "comentarioRevisor": null,
  "duracionPermiso": 30
}
```

---

## FIELD DEFINITIONS

### Common/Recurring Fields

| Campo | Tipo | Descripción | Obligatorio |
|-------|------|-------------|------------|
| `id` | String | ID único del documento | Sí (auto) |
| `estado` | String | Estado del recurso | Sí |
| `fechaCreación` | Timestamp | Cuándo se creó | Sí |
| `ultimaActualización` | Timestamp | Última actualización | Sí |
| `creadoPor` | String | UID del creador | Sí |
| `modificadoPor` | String | UID del modificador | No |
| `activo` | Boolean | Si el registro está activo | Sí |
| `notas` | String | Notas adicionales | No |
| `etiquetas` | Array | Tags para búsqueda | No |

### Data Types Mapping

```
Firestore Type → JavaScript Type
==================================
String → string
Number → number (int/float)
Boolean → boolean
Timestamp → Date (JavaScript)
GeoPoint → {latitude, longitude}
Reference → DocumentReference
Array → array
Map → object
```

---

## RELATIONSHIPS & REFERENCES

### Entity Relationships Diagram (ERD)

```
USUARIOS (1) ──┬──── (N) FAMILIAS
               ├──── (N) GRUPOS
               ├──── (N) INTERVENCIONES
               └──── (N) PLANES_AUDITORÍA

FAMILIAS (1) ─────── (N) MIEMBROS
             ├────── (N) SUBVENCIONES
             ├────── (N) DOCUMENTOS
             └────── (1) GENOGRAMAS

GRUPOS (1) ────────── (N) ASISTENCIA
           └────────── (N) MIEMBROS

INTERVENCIONES (1) ─── (N) SESIONES

PLANES (1) ───────────── (N) HALLAZGOS
          ├────────────── (N) RIESGOS
          └────────────── (N) ACCIONES_CORRECTIVAS

HALLAZGOS (1) ───────── (N) EVIDENCIAS
              └───────── (1..N) ACCIONES_CORRECTIVAS
```

---

## FIRESTORE RULES & SECURITY

**Location:** `firestore.rules` in project root

**Key Principles:**
- All access filtered by user `role` field
- Role definitions in `/roles/{roleName}`
- Audit logging for all modifications
- Immutable audit trails in `auditoria` subcollections

**Rule Functions (from firestore.rules):**

```javascript
function isSignedIn() { return request.auth != null; }
function getUserRole() { return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role; }
function isAdmin() { return getUserRole() in ['admin', 'superadmin']; }
function hasPermission(perm) { 
    return get(/databases/$(database)/documents/roles/$(getUserRole())).data.permissions[perm];
}
```

---

##  BEST PRACTICES

### Query Optimization

✅ **DO:**
- Create indexes for frequently queried fields
- Use subcollections for related hierarchical data
- Denormalize frequently accessed data
- Limit query results with `.limit()`
- Use `.startAfter()` for pagination

❌ **DON'T:**
- Query across multiple collections (use references)
- Store entire objects when only IDs needed (use references)
- Create unlimited subcollection depth
- Store binary files (use Cloud Storage instead)
- Query without indexes (Firestore optimization)

### Document Size Limits

- **Max document size:** 1 MB
- **Max nested depth:** Practical limit ~20 levels
- **Max fields per document:** ~20,000

### Array Limits

- **Max array size:** 20,000 elements
- Better to use maps/objects for sparse data

---

##  QUERY OPTIMIZATION

### Recommended Indexes

Create these indexes in Firestore Console for optimal performance:

```
Collection: usuarios
  - Field: rol (Ascending)
  - Field: activo (Ascending)
  - Field: correoElectrónico (Ascending)

Collection: familias
  - Field: estado (Ascending) + fechaRegistro (Descending)
  - Field: ciudad (Ascending)

Collection: admin/subvenciones
  - Field: estado (Ascending)

Collection: nexepsy/intervenciones
  - Field: estado (Ascending)
  - Field: terapeutaId (Ascending)

Collection: nexeaudit/planesAuditoria
  - Field: estado (Ascending)
```

### Common Query Patterns

**Pattern 1: Filter by Status**
```javascript
query(collection(db, 'usuarios'), where('activo', '==', true))
```

**Pattern 2: Sort by Date**
```javascript
query(collection(db, 'familias'), orderBy('fechaRegistro', 'desc'), limit(10))
```

**Pattern 3: Pagination**
```javascript
const next = query(collection(db, 'grupos'), startAfter(lastDoc), limit(20))
```

---

## DEPLOYMENT CHECKLIST

- [ ] Deploy `firestore.rules` to Firebase Console
- [ ] Deploy `storage.rules` for Cloud Storage
- [ ] Create all required indexes
- [ ] Set up Cloud Functions for audit logging
- [ ] Configure Cloud Storage for documents/uploads
- [ ] Test RBAC permissions with all roles
- [ ] Implement data backup strategy
- [ ] Set up monitoring/alerts

---

## CONTACT & SUPPORT

**Documentation Owner:** Development Team
**Last Review:** 2026-04-14
**Next Review:** 2026-07-14

For questions or updates, contact: development@nexesocial.es
