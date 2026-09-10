# Estructura de Naum

La pantalla `public/programes-gestio.html` permite organizar áreas, programas y
subprogramas, filtrar sus actividades y consultar recuentos. Las actividades
pueden depender directamente de cualquiera de esos niveles. Se conservan los
departamentos operativos, los documentos de actividades y los vínculos de grupos.

## Puesta en marcha

1. Acceder con un usuario cuyo documento `usuarios/{uid}` tenga `role` o `rol`
   igual a `admin` o `superadmin`.
2. Abrir **Gestió de programes** y pulsar **Crear estructura inicial de Naum**.
   Este botón solo aparece mientras la estructura está vacía. No se escribe nada
   al cargar la pantalla.
3. Revisar las seis áreas y los ocho programas. **Nou element** permite ampliar
   la estructura; **Editar** permite renombrar o cambiar la ubicación cuando
   sigue siendo válida. Los identificadores se mantienen al editar.
4. Editar cada actividad y elegir su área, programa o subprograma. También se
   puede hacer desde la pantalla de su departamento. Los registros anteriores
   se muestran como **Sense classificar** hasta que se asignen explícitamente.

No se crean participantes, grupos ni actividades ficticias. No se asignan
automáticamente los departamentos antiguos a las nuevas áreas, porque los nombres
y responsabilidades existentes aún no se han contrastado con los Excel.

## Datos y compatibilidad

- `config/program_structure`: `nodes`, `revision`, `updatedAt`, `updatedBy`.
- Cada nodo: `id`, `name`, `type` (`area`, `program`, `subprogram`), `parentId`.
- `actividades/{id}.structureNodeId`: clasificación opcional. Los grupos y la
  asistencia heredan la ubicación mediante su actividad; no se duplican.
- Las reglas existentes de `config` permiten lectura autenticada y escritura
  administrativa. No hay cambios de reglas ni migraciones destructivas.
- La escritura de estructura usa una transacción y una revisión para rechazar
  sobrescrituras entre dos editores. No se ofrece borrado de nodos.
- Los recuentos unen identificadores de inscripciones directas y participantes
  registrados en grupos vinculados. No fusionan expedientes duplicados ni
  representan asistencia efectiva. Se aplican a las actividades y grupos que
  entrega la pantalla según sus filtros de acceso existentes.
- Si falla la lectura del selector, se conserva la clasificación anterior.
  Si falla el guardado de una actividad, el formulario sigue abierto y se muestra
  el error. Las inscripciones se añaden con `arrayUnion` sin reescribir el resto
  de la actividad.

## Validación

`npm run test:structure` comprueba jerarquía, niveles opcionales, validación,
compatibilidad de actividades anteriores, recuentos sin duplicados por ID,
errores de guardado y conflictos de revisión, usando dobles de Firestore.
Estas pruebas no son una validación de las reglas en el emulador ni de Firebase
en producción. Antes del despliegue operativo, comprobar con una sesión de prueba:

- administrador configura la estructura y un lector no puede modificarla;
- crear/editar una actividad en ambas pantallas conserva su clasificación;
- filtro Son Roca Activa incluye ambos Connecta y sus actividades;
- editar desde una segunda sesión detecta una revisión desactualizada;
- grupos, inscripciones y asistencia existentes siguen accesibles.

Esta entrega adapta la organización del boceto. La importación de Excel y la
revisión integral de permisos por área quedan para cuando se conozcan los datos
y responsabilidades reales. No se han cambiado datos de producción.
