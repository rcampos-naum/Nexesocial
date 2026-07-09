# Módulo de Gestión de Grupos y Asistencia - Documentación

## 📋 Descripción General

Sistema completo para gestionar grupos de beneficiarios y control de asistencia diaria. El módulo permite:

- ✅ Crear y gestionar grupos
- ✅ Asignar beneficiarios a grupos con validación de edad
- ✅ Gestionar excepciones (beneficiarios fuera de rango de edad)
- ✅ Pasar lista diaria de asistencia
- ✅ Control de permisos (responsables y personal sustituto)

---

## 📁 Archivos del Sistema

### Backend (JavaScript)

#### `grupos-db.js`
Capa de base de datos con operaciones CRUD en Firestore.

**Módulos exportados:**
- `DepartamentosDB` - Gestión de departamentos
- `ActividadesDB` - Gestión de actividades (con rangos de edad)
- `GruposDB` - Gestión de grupos
- `BeneficiariosGruposDB` - Asignación de beneficiarios a grupos
- `AsistenciaDB` - Registro de asistencia diaria
- `calcularEdadPersona()` - Calcula edad desde fecha de nacimiento
- `validarRangoEdad()` - Valida si edad está en rango permitido
- `formatearFecha()` - Normaliza formato de fechas

#### `grupos-logic.js`
Lógica del frontend y manejo de eventos.

**Clase exportada:**
- `GruposLogic` - Objeto con métodos para:
  - Gestión de departamentos y actividades
  - CRUD de grupos
  - Gestión de beneficiarios
  - Control de asistencia
  - Notificaciones y modales

### Pantallas (HTML)

#### `grups.html`
**Funcionalidad:** Listado principal de todos los grupos
- Tabla con ID, nombre, responsable, cantidad de beneficiarios
- Botón: "+ Crear Grupo"
- Acciones: Beneficiarios, Asistencia, Editar

#### `crear-grup.html`
**Funcionalidad:** Crear nuevo grupo
- Seleccionar departamento
- Seleccionar actividad (dependiente del departamento)
- Ingresar nombre del grupo
- Seleccionar responsable
- Auto-generación de ID único

#### `gestio-beneficiaris.html`
**Funcionalidad:** Gestionar beneficiarios de un grupo
- Tabla de beneficiarios con edad y estado
- Botón: "+ Agregar Beneficiario"
- Validación de rango de edad (se muestra rango en tiempo real)
- Modal de excepción si está fuera de rango
- Eliminación de beneficiarios

#### `passar-llista.html`
**Funcionalidad:** Pasar lista diaria de asistencia
- Seleccionar fecha (por defecto: hoy)
- Tabla con checkboxes para cada beneficiario
- Botones: Marcar todos / Desmarcar todos
- Estadísticas en tiempo real
- Guardado automático (crea o actualiza registro)

---

## 🗄️ Estructura de Base de Datos (Firestore)

### Colección: `departamentos/`
```json
{
  "id": "auto",
  "nombre": "Centre de dia",
  "descripcion": "Centro de cuidado diurno",
  "estado": "Activo",
  "fechaCreacion": "timestamp"
}
```

### Colección: `actividades/`
```json
{
  "id": "auto",
  "nombre": "Activitats lúdiques",
  "departamentoId": "ref",
  "edadMinima": 4,
  "edadMaxima": 16,
  "descripcion": "Actividades recreativas",
  "estado": "Activo",
  "fechaCreacion": "timestamp"
}
```

### Colección: `grupos/`
```json
{
  "id": "auto",
  "idGrupo": "001",  // Secuencial generado automáticamente
  "nombre": "Refuerzo A",
  "departamentoId": "ref",
  "actividadId": "ref",
  "responsableId": "userId",
  "responsableNombre": "Ana García",
  "beneficiarios": ["userId1", "userId2"],
  "estado": "Activo",
  "fechaCreacion": "timestamp"
}
```

### Colección: `beneficiarios_grupos/`
```json
{
  "id": "auto",
  "grupoId": "ref",
  "beneficiarioId": "userId",
  "nombre": "Juan Pérez",
  "edad": 10,
  "estado": "Correcto" | "Excepción",
  "motivoExcepcion": "Autorización especial",  // Si aplica
  "usuarioExcepcion": "adminId",  // Quién autorizó
  "fechaExcepcion": "timestamp",  // Si aplica
  "fechaAgregado": "timestamp"
}
```

### Colección: `asistencia/`
```json
{
  "id": "auto",
  "grupoId": "ref",
  "beneficiarioId": "userId",
  "fecha": "2026-04-14",
  "asistio": true | false,
  "responsableId": "userId",
  "responsableNombre": "Ana García",
  "fechaRegistro": "timestamp"
}
```

**Índices recomendados:**
- `asistencia(grupoId, beneficiarioId, fecha)` - Búsqueda de registros únicos
- `grupos(departamentoId, actividadId)` - Filtrado por tipos

---

## 🔧 Cómo Usar el Sistema

### 1. Inicializar el Módulo

En cualquier página que use el módulo:

```javascript
import { GruposLogic } from "./grupos-logic.js";

// Inicializar usuario y autenticación
await GruposLogic.initUser();
```

### 2. Cargar Departamentos en un Select

```javascript
GruposLogic.cargarDepartamentos("select-departamento");
// Esto carga automáticamente los departamentos en el select con id "select-departamento"
```

### 3. Cargar Actividades (automático)

Las actividades se cargan automáticamente cuando se selecciona un departamento gracias al evento:

```javascript
document.getElementById("select-departamento").addEventListener("change", () => {
    GruposLogic.cargarActividades();
});
```

### 4. Crear un Grupo

```javascript
const resultado = await GruposLogic.crearGrupo(
    "Nombre del grupo",
    "departamentoId",
    "actividadId",
    "responsableId",
    "nombre del responsable"
);
// Devuelve: { id: "firebaseId", idGrupo: "001" }
```

### 5. Cargar Grupos en Tabla

```javascript
GruposLogic.cargarGrupos("tabla-grupos");
// Renderiza la tabla con todos los grupos
```

### 6. Agregar Beneficiario (con validación de edad)

```javascript
await GruposLogic.agregarBeneficiario(
    "grupoId",
    "beneficiarioId",
    "nombre",
    "2015-05-20"  // fecha de nacimiento
);
// Valida automáticamente el rango de edad
// Si está fuera de rango, muestra modal de excepción
```

### 7. Cargar Lista de Asistencia

```javascript
await GruposLogic.cargarListaAsistencia(
    "grupoId",
    "2026-04-14",  // fecha en formato YYYY-MM-DD
    "tabla-asistencia-items"
);
// Renderiza tabla con checkboxes
// Carga registros anteriores si existen
```

### 8. Guardar Asistencia

```javascript
await GruposLogic.guardarAsistencia("grupoId", "2026-04-14");
// Guarda todos los checkboxes marcados
// Crea o actualiza registros
```

---

## 🔐 Seguridad y Permisos

### Reglas Firestore Recomendadas

```javascript
// Solo admin puede crear departamentos y actividades
match /departamentos/{document=**} {
  allow create, update, delete: if request.auth != null && request.auth.token.admin == true;
  allow read: if request.auth != null;
}

// Todo usuario autenticado puede leer grupos
match /grupos/{document=**} {
  allow read: if request.auth != null;
  allow create, update, delete: if request.auth != null && request.auth.token.admin == true;
}

// Responsables pueden crear registros de asistencia
match /asistencia/{document=**} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null;
  allow delete: if request.auth != null && request.auth.token.admin == true;
}
```

---

## 💡 Funcionalidades Especiales

### Validación de Edad

Cuando se agrega un beneficiario:

1. **En rango:** Se agrega directamente con estado "Correcto"
2. **Fuera de rango:** Se muestra modal solicitando motivo
   - El motivo es OBLIGATORIO
   - Se registra quién solicitó la excepción
   - Estado queda como "Excepción" (pendiente de validación)

### Pasar Lista

- **Cargar automáticamente:** Si existe asistencia previa, se marcan los checkboxes
- **Nueva fecha:** Todos los checkboxes inician desmarcados
- **Estadísticas en tiempo real:** Se actualiza al marcar/desmarcar
- **Registro único:** Solo un registro por grupo + beneficiario + fecha

### Sustituciones

Cualquier miembro del personal puede pasar lista de cualquier grupo, no solo su grupo asignado.

---

## 📊 Flujo de Uso Típico

```
1. Admin crea Departamentos (via BD manual o futuro CRUD)
2. Admin crea Actividades dentro de cada Departamento
   ↓
3. Responsable de Programa crea Grupo
   - Selecciona Departamento → Actividad
   - Asigna Responsable (ej: Ana García)
   ↓
4. Responsable del grupo agrega Beneficiarios
   - Selecciona beneficiario
   - Sistema valida edad vs rango de actividad
   - Si cumple: Agrega directamente
   - Si NO cumple: Requiere motivo y queda como "Excepción"
   ↓
5. Diariamente: Pasar Lista
   - Responsable (u otro personal) abre "Pasar Lista"
   - Selecciona fecha
   - Marca asistentes
   - Guarda
   ↓
6. Sistema registra asistencia (grupo, beneficiario, fecha, asistencia)
```

---

## 🐛 Troubleshooting

### Problema: No aparecen actividades al seleccionar departamento

**Causa:** No hay actividades creadas para ese departamento

**Solución:** Crear actividades en Firestore para el departamento

### Problema: Modal de excepción se cierra sin guardar

**Causa:** El motivo está vacío

**Solución:** Ingresar un motivo obligatoriamente

### Problema: No se guarda la asistencia

**Causa:** Usuario no autenticado o sin permisos

**Solución:** 
- Verificar usuario en `GruposLogic.usuarioActual`
- Revisar reglas de Firestore

---

## 📝 Notas de Desarrollo

### Convenciones Usadas

- **Nombres de archivos:** snake-case (grupos-db.js)
- **IDs de grupo:** Secuencial de 3 dígitos (001, 002, etc.)
- **Fechas:** Formato ISO (YYYY-MM-DD)
- **Estado:** "Activo" / "Inactivo" (borrado lógico)

### Extensiones Futuras

- Generar reportes de asistencia
- Asociar observaciones a faltas
- Justificantes en papel
- Exportar a PDF/Excel
- Histórico de cambios en beneficiarios
- Alertas de inasistencia frecuente

### Dependencias

- Firebase (10.12.0)
- style-dashboard.css (estilos globales)

---

## 📞 Contacto y Soporte

Para dudas o sugerencias sobre el módulo de grupos y asistencia, contactar con el equipo de desarrollo.

**Versión:** 1.0  
**Última actualización:** Abril 2026  
**Desarrollado en:** NexeSocial
