# 📋 NexeSing - Sistema Unificado de Firmas

## ✅ Versió Estable

**Release:** `v1.0.0-stable`  
**Data:** `2026-04-24`  
**Estat QA:** `24/24 proves superades`

### Changelog v1.0.0-stable

- Integració unificada de firmes operativa en 10 mòduls.
- API central de firmes amb flux ràpid (`openQuickSignFlow`) validada.
- Suite de proves E2E corregida i totalment en català (24 proves).
- Documentació d'usuari traduïda al català i navegació corregida.
- Quadre d'auditoria traduït al català amb filtres i gràfics funcionals.
- Eina de backfill de `funcRole` afegida per sanejar usuaris.
- Desplegament a producció completat a Firebase Hosting.

### URL de Producció

- Plataforma: `https://nexesocial-bc6c4.web.app`
- Suite NexeSing: `https://nexesocial-bc6c4.web.app/NexeSing/nexesing.html`
- Proves E2E: `https://nexesocial-bc6c4.web.app/NexeSing/test-signature-flow.html`
- Auditoria: `https://nexesocial-bc6c4.web.app/NexeSing/audit-dashboard.html`
- Backfill funcRole: `https://nexesocial-bc6c4.web.app/NexeSing/backfill-funcrole.html`

## Descripción General

**NexeSing** es un sistema unificado, seguro y auditable de firmas digitales diseñado para streamlinizar los flujos de aprobación de documentos en toda la plataforma NexeSocial. 

### Características Principales

✅ **Multi-método de firma**: En pantalla, QR móvil o AutoFirma (certificado digital)  
✅ **Auditable**: Firestore blockchain-backed con trail completo de auditoría  
✅ **Cadena de firmas**: Soporta múltiples signatarios en secuencia o paralelo  
✅ **Mobile-friendly**: Sesiones QR de 15 minutos para firmar desde cualquier lugar  
✅ **Integración total**: Funciona sin interrupciones en 10 módulos de la plataforma  
✅ **Base de datos de empleados**: Carga firmantes del registro de empleados  

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Módulos NexeSocial (10)                  │
│  Informe Psicosocial | Convenios | Centre Día | Programes  │
│     NexePsy | Passar Llista | Admin | Audit | Perfil        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ openQuickSignFlow()
                       │ ↓
┌──────────────────────────────────────────────────────────────┐
│              NexeSing Suite - nexesing.html                  │
│  • Dashboard (4-stat cards)                                  │
│  • Request List (filterable)                                 │
│  • New Request Modal (con selección de empleados)            │
│  • Sign Modal (canvas/QR/AutoFirma)                          │
│  • Configuration & Audit Tools                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   Canvas Sign    QR Sign        AutoFirma
   (Desktop)     (Mobile)        (Certificate)
        │              │              │
        └──────────────┼──────────────┘
                       ↓
        ┌──────────────────────────────┐
        │  Firestore Collections       │
        │  • firmas_requests           │
        │  • firmas_sessions (QR)      │
        │  • usuarios (base de datos)  │
        └──────────────────────────────┘
```

---

## 📁 Estructura de Archivos

### Suite Principal
- **nexesing.html** - Página principal del dashboard
- **sidebar-nexesing.js** - Navegación dedicada de la suite
- **signature-flow.js** - API central de orquestación de firmas

### Herramientas de Administración
- **test-signature-flow.html** - Suite de 24 test cases
- **config-center.html** - Centro de configuración con 5 tabs
- **audit-dashboard.html** - Dashboard de auditoría con métricas y gráficos
- **user-documentation.html** - Documentación completa para usuarios
- **backfill-funcrole.html** - Eina per completar `funcRole` als usuaris

### Imágenes de Marca
- **img/nexesing.svg** - Logo principal (fondo transparente, gradiente verde)
- **img/nexesing-icon.svg** - Icono de suite

---

## 🔐 Colecciones Firestore

### `firmas_requests`
Documento principal que rastrea todo pedido de firma:
```json
{
  "id": "req_123",
  "documentTitle": "Informe Psicosocial - Maria García",
  "documentText": "...",
  "sourceModule": "informe-psicosocial",
  "metadata": {
    "familiaId": "fam_456",
    "familiaName": "García López"
  },
  "signers": ["uid_director", "uid_tech"],
  "signatures": [
    {
      "signerUid": "uid_tech",
      "signerName": "Joan Xuclà",
      "method": "canvas",
      "signatureDataUrl": "data:image/png;base64...",
      "timestamp": "2024-01-15T14:32:00Z"
    }
  ],
  "decisions": [
    {
      "signerUid": "uid_director",
      "decision": "pending",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ],
  "status": "pending",
  "createdByUid": "uid_admin",
  "createdByName": "Admin User",
  "createdAtISO": "2024-01-15T10:00:00Z"
}
```

### `firmas_sessions`
Sesiones QR de corta duración (15 minutos):
```json
{
  "id": "session_789",
  "requestId": "req_123",
  "url": "https://nexesing.com/firma-movil.html?flow=unified&sessionId=session_789",
  "expiresAt": serverTimestamp() + 15 minutos,
  "completed": false
}
```

### `usuarios`
Base de datos de empleados (surtidores de firmas):
```json
{
  "uid": "uid_director",
  "email": "director@nexesocial.com",
  "nombre": "Dr. Xavier Nexe",
  "funcRole": "Director",
  "departament": "Direcció",
  "telefon": "+34 93 XXX XXXX",
  "dataAlta": "2020-01-15"
}
```

---

## 🚀 Inicio Rápido

### Para Usuarios Finales

1. **Accede a un módulo** (Informe Psicosocial, Convenios, etc.)
2. **Busca el botón verde** "Enviar a Firmar"
3. **Selecciona signatarios** de la lista de empleados
4. **Elige método de firma**:
   - En pantalla (dibuja con ratón/touchscreen)
   - QR (escanea con móvil)
   - AutoFirma (certificado digital)
5. **Completa la firma** ✓

### Para Administradores

1. **Accede a NexeSing** desde sidebar
2. **Visita Configurar Flux** (configuració.html) para:
   - Habilitar/deshabilitar módulos
   - Configurar roles de firma
   - Personalizar notificaciones
   - Establecer timeouts
3. **Monitorea Audit Dashboard** para:
   - Métricas de firma
   - Rendimiento de signatarios
   - Timeline de actividad
   - Reportes de incidencias

---

## 📚 Guías por Módulo

### 🔹 Fase 1: Documentos Críticos

#### Informe Psicosocial
- **Botón**: "Enviar a Firmar" en barra de acciones
- **Signatarios**: Técnico responsable, Director
- **Flujo típico**: Crear → Enviar Director → Director firma → Informe completado

#### NexePsy - Informe de Seguimiento
- **Botón**: "Enviar a Firmar" en formulario de supervisión
- **Signatarios**: Psicólogo supervisor, Director clínico
- **Flujo típico**: Completar seguimiento → Enviar psicólogo → Psicólogo revisa y firma

#### Convenios (Acuerdos Legales)
- **Botón**: "Enviar a Firmar" en modal del editor
- **Signatarios**: Director, Responsable legal
- **Flujo típico**: Redactar → Ambas partes firman → Acuerdo activo

### 🔹 Fase 2: Documentación Importante

#### Centre Día - Documentos
- **Botón**: "Enviar a Firmar" en lista de documentos
- **Signatarios**: Coordinador, Director de centro
- **Contenido**: Reportes de actividades, seguimientos

#### Programes Gestió
- **Botón**: "Enviar a Firmar" en modal de actividad
- **Signatarios**: Coordinador de programa, Manager
- **Contenido**: Actualizaciones de actividades

#### NexePsy - Expediente Clínico
- **Botón**: "Enviar a Firmar" junto a "Baixar PDF"
- **Signatarios**: Psicólogo responsable, Supervisor

#### Perfil de Usuario
- **Botón**: "Enviar a Firmar" en barra de acciones
- **Signatarios**: Admin, Director
- **Contenido**: Actualizaciones de perfil de usuario

### 🔹 Fase 3: Documentación Complementaria

#### Passar Llista (Asistencia)
- **Botón**: "Enviar a Firmar" en acciones
- **Signatarios**: Educador del grupo, Director
- **Frecuencia**: Una firma por día de asistencia

#### Documentos Admin
- **Botón**: "Enviar a Firmar" en modal
- **Signatarios**: Admin, Director
- **Contenido**: Contratos, políticas, regulaciones

#### Reportes de Auditoría
- **Botón**: "Enviar a Firmar" en barra de acciones
- **Signatarios**: Responsable de calidad, Director
- **Contenido**: Auditorías ISO 9001, compliance

---

## ✍️ Métodos de Firma

### Método 1: Firma en Pantalla
```
Mejor para: Aprobaciones rápidas en oficina
Pasos:
1. Click "Firmar en pantalla"
2. Dibuja tu firma en el canvas
3. Click "Guardar"
Requisitos: Ratón, touchscreen o similar
```

### Método 2: QR Móvil
```
Mejor para: Aprobaciones remotas, flujos móviles
Pasos:
1. Click "Firmar amb QR"
2. Escanea QR con tu móvil
3. Dibuja firma en pantalla móvil
4. Sesión se completa automáticamente
Duración: 15 minutos máximo
```

### Método 3: AutoFirma (Certificado)
```
Mejor para: Documentos legales oficiales
Pasos:
1. Click "Firmar amb AutoFirma"
2. Se abre aplicación AutoFirma
3. Selecciona tu certificado
4. Introduce contraseña
Requisito: AutoFirma instalado + certificado válido
Validez: Legalmente vinculante
```

---

## 🧪 Suite de Testing

Accede a `NexeSing/test-signature-flow.html` para ejecutar 24 test cases:

### Categorías de Tests
- **Module Integration (4)**: Presencia de botones en módulos
- **Signature API (4)**: Métodos de la API central
- **Employee Database (4)**: Acceso y integridad de usuarios
- **Mobile Signing (4)**: Generación QR, expiración, flujo móvil
- **Firestore Integrity (4)**: Colecciones, transacciones, trails
- **UI/UX Flow (4)**: Responsividad, pre-fill, notificaciones

### Uso
1. Abre test-signature-flow.html
2. Click "Iniciar Pruebas"
3. Verifica que pasen 24/24 tests
4. Exporta resultados en JSON

---

## ⚙️ Centro de Configuración

Accede a `NexeSing/config-center.html` para:

### General
- Nombre de organización
- Rol de firma por defecto
- Timeout de sesión
- Toggle AutoFirma
- Mensaje de bienvenida

### Módulos
- Habilitar/deshabilitar cada uno de los 10 módulos
- Configuración específica por módulo

### Firmas
- Toggle firmas en pantalla
- Toggle firma QR
- Modo cadena (paralelo/secuencial/mixto)
- Requisito de timestamp
- Reglas de validación personalizadas (JSON)

### Notificaciones
- Email en solicitud/completación/rechazo
- Notificaciones in-app
- Selección de idioma
- Plantillas personalizadas

### Permisos
- Control de acceso basado en roles
- Permisos granulares (crear, firmar, rechazar, ver, configurar)
- Roles: Director, Técnico, Coordinador, Admin

---

## 📊 Dashboard de Auditoría

Accede a `NexeSing/audit-dashboard.html` para:

### Métricas (4 tarjetas)
- Documentos firmados (total)
- Firmas pendientes (número actual)
- Firmas rechazadas (total)
- Tiempo promedio de firma

### Gráficos (4)
- **Firmas por Módulo**: Doughnut chart
- **Actividad Diaria**: Line chart (7 días)
- **Distribución de Estado**: Pie chart
- **Rendimiento de Signatarios**: Bar chart horizontal

### Tabla de Datos
- 50 solicitudes más recientes
- Columnas: Título, módulo, solicitante, estado, progreso, fecha, acciones
- Paginación y filtros

### Timeline de Actividad
- Últimas 24 horas
- Eventos con timestamp y estado (éxito/error/pendiente)
- Descripciones contextuales

---

## 🐛 Troubleshooting

### "El botón no funciona"
**Causa**: Módulo no integrado o JavaScript deshabilitado
- Verifica que JavaScript esté habilitado
- Recarga la página (Ctrl+F5)
- Limpia caché del navegador (Ctrl+Shift+Delete)
- Intenta otro navegador (Chrome, Firefox, Safari)

### "No puedo seleccionar signatarios"
**Causa**: Base de datos de empleados no carga
- Verifica conexión a internet
- Comprueba que tienes permiso de acceso
- Contacta admin si la lista está vacía

### "El código QR expira muy rápido"
**Causa**: Timeout por defecto es 15 minutos
- Genera un nuevo código QR si expira
- Contacta admin para aumentar timeout
- Intenta firma en pantalla o AutoFirma

### "AutoFirma no se abre"
**Causa**: AutoFirma no instalado o no configurado
- Descarga AutoFirma desde sitio oficial
- Verifica que tu certificado esté instalado
- Reinicia navegador después de instalar
- Usa firma en pantalla o QR como alternativa

### "La firma no se guardó"
**Causa**: Error de conexión o servidor
- Verifica conexión a internet
- Intenta firmar nuevamente
- Verifica en dashboard si se guardó
- Contacta soporte si persiste

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo firmar en nombre de otro?**  
R: No. Por seguridad y compliance, cada persona firma con sus propias credenciales.

**P: ¿Puedo revocar una firma?**  
R: No. Las firmas son inmutables para garantizar la integridad del audit trail. Puedes solicitar una nueva firma de una versión corregida.

**P: ¿Dónde se guardan los documentos firmados?**  
R: En Firestore con backups encriptados. Accesibles desde dashboard o reportes de auditoría.

**P: ¿Qué pasa si rechazo un documento?**  
R: El solicitante recibe notificación con tu feedback y puede hacer correcciones antes de reenviar.

**P: ¿Es legalmente vinculante?**  
R: AutoFirma-based tiene validez legal. Firmas en pantalla son válidas internamente pero no legales para contratos oficiales.

**P: ¿Cómo sigo firmas pendientes?**  
R: Desde el dashboard de NexeSing o el audit dashboard, filtra por estado "pendiente".

---

## 🔗 Enlaces Rápidos

- **Bustia de Firmes**: `/NexeSing/nexesing.html`
- **Suite de Tests**: `/NexeSing/test-signature-flow.html`
- **Centro de Configuración**: `/configuracio.html`
- **Audit Dashboard**: `/NexeSing/audit-dashboard.html`
- **Documentación**: `/NexeSing/user-documentation.html` (esta página)

---

## 📞 Soporte

Para reportar problemas o sugerencias:
1. Verifica troubleshooting arriba
2. Consulta FAQ
3. Ejecuta test suite
4. Contacta a tu administrador del sistema
5. Si el problema persiste, contacta soporte técnico

---

## 📝 Información Técnica

**Tecnologías**:
- Firebase Firestore 10.x
- Firebase Auth
- ES6 JavaScript modules
- HTML5 Canvas + SignaturePad 4.0.0
- QRCode.js (sesiones móviles)
- Chart.js 3.9.1 (auditoría)

**Colecciones Firestore**:
- `firmas_requests` - Pedidos de firma
- `firmas_sessions` - Sesiones QR (15 min TTL)
- `usuarios` - Base de datos de empleados

**API Central**:
- `getCurrentUserMeta()` - Metadatos del usuario actual
- `requestSignature()` - Crear nuevo pedido
- `signRequest()` - Completar firma
- `rejectRequest()` - Rechazar con comentario
- `createMobileSession()` - Generar sesión QR
- `openQuickSignFlow()` - Redireccionar con pre-fill
- `openSignatureCenter()` - Abrir suite principal
- `listRequestsForCurrentUser()` - Listar pedidos pendientes

---

**Última actualización**: Enero 2024  
**Versión**: 1.0 Suite Unificada  
**Desarrollador**: NexeSocial Engineering Team
