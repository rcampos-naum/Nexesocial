# NexeAdmin - Módulo de Administración Central
## Documentación y Estructura Implementada

### 📋 Estado del Proyecto
**Fecha:** Abril 2026  
**Estado:** Estructura Base Completa ✅  
**Próximas Fases:** Integración Backend + Testing

---

## 🏗️ Arquitectura del Sistema

### Frontend (HTML/CSS/JavaScript)
```
NexeAdmin/
├── nexeadmin.html                 # Dashboard Principal (Resum Executiu)
├── admin-personal.html             # Gestión de Personal + TimeMoto
├── admin-subvencions.html          # Gestión de Subvenciones (CRÍTICO)
├── admin-documents.html            # Gestión Documental
├── admin-proveidors.html           # Proveedores y Compras
├── nexeadmin-ass.html              # Seguros/Aseguramientos
├── nexeadmin-reportes.html         # Reportes y Analítica (NEW)
├── admin-logic.js                  # Lógica Frontend (NEW)
└── admin-db.js                     # Capa de Base de Datos (NEW)
```

### Backend (Firebase Firestore)
**Colecciones a implementar:**
- `empleados` - Personal, voluntarios, colaboradores
- `subvenciones` - Registro completo de convocatorias
- `documentos` - Gestión documental centralizada
- `proyectos` - Programas y proyectos sociales
- `fichajes` - Datos importados de TimeMoto
- `auditoria_log` - Registro de acciones por usuario
- `permisos_solicitudes` - Vacaciones y permisos

---

## 1️⃣ GESTIÓN DE PERSONAL (admin-personal.html)

### Estructura de Datos de Empleado
```javascript
{
  id: "emp_001",
  nombre: "Marc Vila",
  dni: "12345678A",
  email: "marc@nexesocial.org",
  telefono: "+34 93 123 45 67",
  tipoRelacion: "Laboral|Voluntariado|Colaboración",
  rol: "Administración|Coordinación|Educador|Técnico|Dirección",
  jornada: 40,  // horas semanales
  proyecto: "PQI Formació",
  direccion: "Opcional",
  estado: "Activo|Baja|Vacaciones|Suspensión",
  fechaAlta: Date,
  fechaBaja: Date || null,
  documentacionOk: boolean,
  vencimientoContrato: "Indefinit" || Date
}
```

### Funcionalidades Implementadas
✅ CRUD completo (Crear, Leer, Actualizar, Baja)  
✅ Tabs por estado: Activos, Vacaciones, De Baja, Voluntarios  
✅ Integración TimeMoto (botón de importación CSV)  
✅ Control de documentación obligatoria por empleado  
✅ Modal de formulario con validaciones  
✅ Búsqueda y filtros  

### Próximas Integraciones
- [ ] Cálculo automático de horas desde TimeMoto
- [ ] Control de vacaciones y permisos con aprobación
- [ ] Asignación de empleados a proyectos
- [ ] Gestión de ausencias (enfermedad, permisos, injustificadas)

---

## 2️⃣ GESTIÓN DE SUBVENCIONES (admin-subvencions.html) ⭐ CRÍTICO

### Flujo de Estados Completo
```
Borrador → En preparación → Presentada → Concedida|Denegada
                                            ↓
                                      En ejecución
                                            ↓
                                       Justificada
                                            ↓
                                          Cerrada
```

### Estructura de Datos
```javascript
{
  id: "sub_001",
  nombre: "PQI - Formació Dual 2026",
  organismo: "GENCAT|Ayuntamiento|Consell|IRPF|Fundación",
  año: 2026,
  importeSolicitado: 45000,
  importeConcedido: 44000 || null,
  cobrado: 31500 || null,
  estado: "Borrador|En preparación|Presentada|Concedida|...",
  responsable: "Laia Soler",
  descripcion: "Descripción del proyecto",
  fechaCierre: "2026-04-30",
  fechaJustificacion: "2026-05-20",
  documentosPendientes: ["Memoria", "Facturas", "Informe"],
  diasRestantes: 36,
  fechaCreacion: Date,
  fechaModificacion: Date
}
```

### KPIs Implementados
- **Taxa de Concesión:** % de subvenciones concedidas vs solicitadas
- **Ratio de Importe:** Importe concedido vs solicitado
- **Tiempo Medio Resolución:** Desde presentación hasta resolución
- **Activas por Año:** Subvenciones en ejecución
- **Próximas Justificaciones:** Con alertas automáticas

### Sistema de Alertas (CRÍTICO)
✅ Alerta apertura convocatoria  
✅ Alerta cierre próximo (7 días antes)  
✅ Alerta requerimiento  
✅ Alerta documentación pendiente  
✅ Alerta subvenciones sin cerrar (antigüedad)  

### Panel de Control
- **Dashboard KPIs:** Estadísticas principales visibles
- **Sistema de Alertas:** Con animación de pulso
- **Tabla Principal:** Filtrable por estado
- **Resumen por Organismo:** Estadísticas consolidadas
- **Modal Detalles:** Documentación asociada completa

---

## 3️⃣ GESTIÓN DOCUMENTAL (admin-documents.html)

### Tipos de Documentos Soportados
- Contratos laborales
- Nóminas
- Seguros y pólizas
- Actas de reuniones
- Documentación de subvenciones
- Protocolos internos
- Autorizaciones de menores
- Certificados oficiales

### Metadatos Completos
```javascript
{
  id: "doc_001",
  nombre: "Contrato Marc Vila",
  tipo: "Contrato",
  fechaSubida: Date,
  usuarioSubida: "Admin User",
  proyectoAsociado: "PQI Formació",
  responsable: "Laia Soler",
  fechaVencimiento: "2027-12-31" || null,
  confidencialidad: "Público interno|Restringido|Alta confidencialidad",
  versionNumero: 1,
  documentoPadreId: null || "doc_001",
  estado: "Activo|Archivado|Vencido",
  urlArchivo: "gs://...",
  fechaModificacion: Date
}
```

### Funcionalidades
✅ Drag & drop upload  
✅ Clasificación automática por tipo  
✅ Búsqueda avanzada (fecha, proyecto, tipo)  
✅ Versionado de documentos  
✅ Control de acceso por rol  
✅ Alertas automáticas de vencimiento  

---

## 4️⃣ REPORTES Y ANALÍTICA (nexeadmin-reportes.html) NEW

### Tablas de Reportes
1. **Personal e Horas**
   - Horas por empleado (Planificadas vs Reales)
   - Horas por proyecto
   - Tasa de absentismo

2. **Subvenciones**
   - Estado de cada convocatoria
   - % de concepto
   - Importes solicitados vs concedidos

3. **Documentación**
   - Vencimientos próximos
   - Documentación pendiente
   - Confidencialidad

4. **Resumen General**
   - Dashboard con indicadores clave
   - Variaciones mes a mes
   - Cumplimiento de targets

### Exportaciones
- 📊 **Excel (CSV):** Datos estructurados
- 📄 **PDF:** Reportes formales (con encabezado corporativo)
- 📋 **CSV:** Para integraciones externas

---

## 5️⃣ SEGURIDAD Y ROLES (RBAC)

### Roles del Sistema
```javascript
{
  ADMIN_TOTAL: { 
    nombre: "Administrador Total",
    permisos: ["*"]  // Todo
  },
  ADMIN: { 
    nombre: "Administración",
    permisos: ["personal", "documentos", "proyectos"]
  },
  COORDINACION: { 
    nombre: "Coordinación",
    permisos: ["personal.leer", "personal.editar", "proyectos"]
  },
  TECNICO: { 
    nombre: "Técnico",
    permisos: ["personal.leer", "proyectos.leer"]
  },
  DIRECCION: { 
    nombre: "Dirección",
    permisos: ["*.leer"]  // Solo lectura
  }
}
```

### Sistema de Auditoría
```javascript
{
  id: "audit_001",
  usuarioId: "user_123",
  usuarioNombre: "Laia Soler",
  accion: "CREATE|UPDATE|DELETE|VIEW|EXPORT",
  modulo: "personal|subvenciones|documentos|proyectos",
  detalles: { /* datos contextuales */ },
  fechaHora: Date,
  ipAddress: "192.168.1.1"
}
```

Registro completo de:
- ✅ Quién creó/modificó/eliminó
- ✅ Qué cambió exactamente
- ✅ Cuándo y desde dónde
- ✅ Trazabilidad completa

---

## 6️⃣ FUNCIONES PRINCIPALES

### admin-db.js - Capa de Base de Datos
```javascript
// PERSONAL
PersonalDB.crear(datosEmpleado)
PersonalDB.obtenerTodos(estado)
PersonalDB.obtenerPorId(empleadoId)
PersonalDB.actualizar(empleadoId, datos)
PersonalDB.darBaja(empleadoId)

// SUBVENCIONES (CRÍTICO)
SubvencionesDB.crear(datosSubvencion)
SubvencionesDB.obtenerTodas()
SubvencionesDB.obtenerProximas()  // Próximos 30 días
SubvencionesDB.actualizar(id, datos)
SubvencionesDB.calcularKPIs()

// DOCUMENTOS
DocumentosDB.subir(datosDocumento)
DocumentosDB.obtenerTodos(filtros)
DocumentosDB.obtenerVencidos()
DocumentosDB.actualizar(id, datos)
DocumentosDB.crearVersion(docId, nuevoFile)

// AUDITORÍA
AuditoriaDB.registrar(usuarioId, usuarioNombre, accion, modulo, detalles)
AuditoriaDB.obtenerHistorial(filtros)

// ROLES
RolesDB.tienePermiso(rolUsuario, modulo, accion)
```

### admin-logic.js - Lógica Frontend
```javascript
AdminLogic.inicializar()  // Verificar autenticación
AdminLogic.crearEmpleado(datos)
AdminLogic.actualizarEmpleado(id, datos)
AdminLogic.darBajaEmpleado(id)
AdminLogic.crearSubvencion(datos)
AdminLogic.obtenerSubvenciones()
AdminLogic.obtenerKPIsSubvenciones()
AdminLogic.subirDocumento(datos)
AdminLogic.obtenerDocumentos(filtros)
AdminLogic.tienePermiso(modulo, accion)
AdminLogic.exportarAExcel(datos, nombreArchivo)
AdminLogic.mostrarAlerta(titulo, mensaje, tipo)
```

---

## 🔌 INTEGRACIONES NECESARIAS

### 1. Firebase Auth
```javascript
✅ Implementado en admin-logic.js
- Verificación de usuario al cargar
- Control de acceso por rol
- Logout
```

### 2. Firebase Firestore
```javascript
✅ Estructura en admin-db.js
- Colecciones: empleados, subvenciones, documentos, proyectos, auditoria
- Queries optimizadas con índices
```

### 3. TimeMoto (Pendiente)
```javascript
[ ] Importación CSV de fichajes
[ ] Normalización de datos entrada/salida
[ ] Cálculo automático de horas
[ ] Asignación a proyectos
```

### 4. Email Notifications (Pendiente)
```javascript
[ ] Alertas de vencimientos
[ ] Alertas de requerimientos
[ ] Reportes automáticos mensuales
```

### 5. Reportes PDF (Pendiente)
```javascript
[ ] Librería: jsPDF o ReportLab
[ ] Encabezados corporativos
[ ] Tablas con datos dinámicos
```

---

## ⚠️ REQUISITOS PENDIENTES

### Backend/API Necesarios
- [ ] API REST para sincronización en tiempo real
- [ ] Validaciones server-side
- [ ] Rate limiting
- [ ] Gestión de ficheros (almacenamiento)

### Frontend Mejorado
- [ ] Gráficos con Chart.js (KPIs visuales)
- [ ] Filtros avanzados
- [ ] Busqueda por múltiples campos
- [ ] DataTables con paginación

### Testing
- [ ] Unit tests (admin-db.js, admin-logic.js)
- [ ] Integration tests
- [ ] E2E tests para flujos críticos

### DevOps
- [ ] CI/CD pipeline
- [ ] Backups automáticos
- [ ] Monitoreo de errores
- [ ] Analytics y logging

---

## 📝 INSTRUCCIONES DE USO

### Inicialización
1. Importar `admin-logic.js` en cada página HTML
2. Llamar `await AdminLogic.inicializar()` en `<script type="module">`
3. Verificar autenticación del usuario
4. Cargar datos dinámicamente

### Ejemplo CRUD Empleado
```javascript
// Crear
const id = await AdminLogic.crearEmpleado({
  nombre: "Marc Vila",
  dni: "12345678A",
  email: "marc@nexesocial.org",
  tipoRelacion: "Laboral",
  rol: "Tècnic Social",
  jornada: 40,
  proyecto: "PQI Formació"
});

// Leer
const empleados = await AdminLogic.obtenerEmpleados();

// Actualizar
await AdminLogic.actualizarEmpleado(id, {
  proyecto: "Escola Estiu"
});

// Baja
await AdminLogic.darBajaEmpleado(id);
```

### Sistema de Permisos
```javascript
// Verificar antes de operación
if (AdminLogic.tienePermiso("subvenciones", "editar")) {
  // Mostrar botón de edición
}

// O mostra
AdminLogic.verificarAcceso("personal", "eliminar");  // Alerta si no tiene
```

---

## 🎯 Próximas Fases

**Fase 1 (Completar):**  
- [x] Estructura general del sistema
- [x] Páginas HTML principales
- [ ] Integración Firebase completa
- [ ] Testing básico

**Fase 2 (Próxima):**  
- [ ] Integración TimeMoto
- [ ] Sistema de notificaciones
- [ ] Reportes PDF
- [ ] Gráficos interactivos

**Fase 3 (Futuro):**  
- [ ] Dashboard ejecutivo avanzado
- [ ] Exportación a sistemas contables
- [ ] Mobile app
- [ ] API pública para terceros

---

## 📞 Contacto y Soporte

Sistema desarrollado para **NexeSocial**  
Entidad social especializada en inclusión y formación

**Módulo Crítico:** Gestión de Subvenciones  
**Status:** Producción (alpha)  
**Última Actualización:** 14/04/2026
