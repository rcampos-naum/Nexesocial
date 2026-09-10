# NexeSocial · auditoría del boceto para la versión 2.0

**Fecha:** 11 de septiembre de 2026. **Repositorio:** rcampos-naum/Nexesocial.
**Código revisado:** `724feb9379274bae72a8ed9cab558a77204b8a9b`, que incluye el boceto
original `96bed24e4da675fe1c00bc9c1b434388ad5ca682` y la primera adaptación del árbol
de Naum. Los hallazgos deben contrastarse con lo que esté efectivamente desplegado.

## Dictamen

El repositorio es útil como boceto funcional y catálogo de necesidades, pero no
debe tomarse como una base operativa ya validada para la 2.0. Hay fallos de arranque,
reglas de acceso demasiado amplias, modelos de datos incompatibles y procesos
parciales. Añadir pantallas sobre esta base prolongaría esas inconsistencias.

La propuesta es reconstruir el núcleo de forma progresiva: identidad y permisos,
personas y familias, estructura de programas, inscripciones, sesiones, asistencia
y seguimiento. Mantener los módulos especializados como referencias hasta validar
su proceso y sus restricciones. Ver [plan de la versión 2.0](PLAN_VERSION_2.md).

## Alcance y grado de certeza

- Inventario estático de **130 archivos públicos**, **73 páginas HTML**, **39
  archivos JavaScript/MJS** y **104 bloques de JavaScript incrustados**.
- Revisión manual de autenticación, reglas Firestore/Storage, cifrado, personas y
  familias, grupos y asistencia, estructura de programas, importación, componentes
  administrativos, clínica, firmas, auditoría y configuración de publicación.
- Escaneo de sintaxis y dependencias locales; no es una prueba visual ni demuestra
  que una página que pasa el escaneo funcione de extremo a extremo.
- No se han leído expedientes de producción, ejecutado herramientas de borrado,
  importado Excel ni cambiado reglas o datos reales.
- Las pruebas nuevas de jerarquía de la entrega anterior son parciales: sus 12
  resultados correctos **no certifican el resto de NexeSocial**.
- Se distingue comportamiento observado en emulador, evidencia directa de código
  e hipótesis pendientes. No se concluye que haya ocurrido una filtración ni se
  emite una certificación legal o de seguridad.

## Hallazgos priorizados

### Resultado de pruebas de autorización

Se han ejecutado las reglas del repositorio en **Firestore Emulator 1.22.0**, con
datos sintéticos y SDK de pruebas **10.14.1**. La suite previa devuelve **16 OK / 0
KO**. Las nuevas sondas reproducen **6 comportamientos incompatibles con la
separación y trazabilidad propuestas**; el control anónimo sí es rechazado.

| Sonda | Comportamiento observado | Hallazgo |
|---|---|---|
| R01 | Cuenta lectora obtiene expediente de un área no asignada. | A01 |
| R02 | Monitor modifica expediente de un área no asignada. | A01 |
| R03 | Monitor obtiene registro clínico fuera de su ámbito. | A01 |
| R04 | Cuenta lectora obtiene el secreto de cifrado de la entidad. | A02 |
| R05 | Administrador sobrescribe un evento de auditoría existente. | A07 |
| R06 | Participante añade una firma/decisión atribuida a otro participante. | A06 |
| R07 | Petición anónima de expediente es denegada, como corresponde. | Control |

[Resultados completos](rules-observations.json). Las sondas no son una prueba de
que se hayan producido estos accesos en producción. Las reglas de Storage se han
revisado estáticamente; no se ejecutó su emulador.

**P1:** resolver antes de un piloto con información real. **P2:** resolver en el
bloque funcional correspondiente antes de ampliar el piloto. La prioridad describe
la transición a la 2.0; no presupone que el código revisado esté en producción.

### A01 · P1 · Los permisos no aíslan áreas, profesionales ni información clínica

`firestore.rules:29` permite operaciones a una lista amplia de roles operativos,
sin consultar asignaciones ni vigencia. `expedientes` (264) y `familias` (287)
admiten lectura para cualquier cuenta autenticada. El bloque clínico (390) acepta
la misma autorización operativa general. La UI sí contiene filtros por ámbito
(`public/auth-guard.js:16`), pero no son una barrera de acceso a datos.

**Consecuencia:** ocultar una ficha en pantalla no impide pedirla directamente.
**2.0:** política única por acción, área, grupo/persona y vigencia, impuesta en
servidor/reglas; pruebas negativas de acceso cruzado y de usuarios dados de baja.

### A02 · P1 · El cifrado compartido no proporciona separación entre profesionales

`public/vault-init.js:37` lee `orgSecret` y `salt` de `config/encryption` y deriva
la clave sin intervención del usuario. `firestore.rules:347` permite esa lectura
a cualquier cuenta autenticada. `public/crypto-utils.js:35` conserva la clave
derivada en sessionStorage; las líneas 88, 104 y 107 escriben contenido en claro o
descifrado en la consola. `public/database.js:51` también contiene una ruta de
escritura de datos personales y de salud en claro; la ficha nueva cifra secciones
completas (`public/perfil-usuari.html:342`). No hay un formato único demostrado.

**Consecuencia:** el cifrado actual no sustituye el control de acceso; las
afirmaciones de cifrado integral de los comentarios no describen todas las rutas.
**2.0:** suprimir registros sensibles en consola, definir clasificación y gestión
de claves y migrar con lectura compatible y recuperación probada. No rotar claves
ni eliminar campos en claro sin inventariar y probar los datos existentes.

### A03 · P1 · El repositorio no ofrece un arranque reproducible

El escaneo detecta **43 referencias locales no resueltas**, de las cuales **28**
apuntan a `public/sidebar.js`, que no existe en el árbol revisado. No equivale a 43
páginas rotas: son referencias, algunas repetidas. En `public/home.html:144` es una
importación de módulo, por lo que ese bloque no puede evaluarse si no se resuelve.
`public/js/components/sidebar.js` es otro componente, no una sustitución probada.

Hay **9 archivos con errores de sintaxis**:

| Archivo | Evidencia del bloqueo |
|---|---|
| `public/genograma_editor.html` | `return` fuera de función en módulo iniciado en línea 451. |
| `public/informe-psicosocial.html` | El mismo problema en módulo iniciado en 636. |
| `public/NexeAdmin/admin-donacions.html` | Paréntesis incorrecto en el array de meses. |
| `public/NexeAudit/audit-logic.js` | Nombre de método con espacio en línea 325. |
| `public/NexePsy/logos_financiadors.html` | Identificador corrompido por codificación. |
| `public/NexePsy/nexepsy-espera.html` | Clave/identificador con codificación inválida. |
| `public/NexePsy/nexepsy-individu.html` | Acceso a propiedad con codificación inválida. |
| `public/NexePsy/nexepsy-logic.js` | Nombre de método con espacio en línea 172. |
| `public/NexePsy/nexepsy.html` | Acceso a propiedad con codificación inválida. |

Además, `public/perfil-usuari.html:6` contiene JavaScript y CSS sueltos dentro del
HTML, antes de los bloques correspondientes; no lo detecta una prueba de sintaxis
que solo extraiga scripts. El impacto visual queda pendiente de prueba de navegador.

**2.0:** arrancar desde clon limpio, navegación compartida y comprobaciones de
sintaxis, imports y rutas como requisito de cada cambio. La existencia de un
archivo o un HTTP 200 no demuestra que sus módulos se ejecuten.

### A04 · P1 · Las reglas generales de Storage anulan restricciones específicas

`storage.rules:70` permite escritura a roles operativos sobre cualquier ruta.
Además, bloques como `admin` usan `allow write`, que incluye borrado. Las reglas
específicas de plantillas, tamaños y borrado exclusivo de administradores no
constituyen una prohibición cuando otra regla coincidente permite la acción.
Es una conclusión estática, no una prueba de borrado de archivos reales.

**2.0:** eliminar permisos generales superpuestos; autorizar cada categoría y
operación y probar tipo, tamaño, lectura, modificación y borrado. Firebase evalúa
permisos coincidentes de forma acumulativa: basta una concesión. [Referencia oficial](https://firebase.google.com/docs/rules/rules-behavior).

### A05 · P1 · HTML de registros y Excel se inserta sin escape

`public/families-llistat.html:72` coloca `cognoms_referencia` y `estat` directamente
en `innerHTML`. `public/importador-datos.html:194` hace lo mismo con cabeceras y
celdas. No se ha ejecutado una carga maliciosa en el navegador; el punto de
inserción sin escape sí está identificado.

**Consecuencia:** datos tratados como HTML pueden alterar la página y crear una
vía de ejecución de código al renderizarse. **2.0:** texto mediante `textContent`
o plantillas con escape por defecto; HTML enriquecido solo con sanitización y
pruebas específicas. Especialmente relevante mientras la clave reside en sesión.

### A06 · P1 · Las firmas validan campos editables, no autoría de cada firma

`firestore.rules:119` restringe nombres de campos de la solicitud, pero permite a
un participante modificar las listas `signatures` y `decisions` y el `status`.
El bloque de actualización (175) no demuestra que cada firma nueva corresponda
a `request.auth.uid`, ni preserva individualmente las firmas anteriores.

**2.0:** firma/decisión individual con autor verificado, documento y versión
vinculados, transición de estado validada y registro inmutable. No inferir valor
jurídico de una imagen de firma ni confundir una pantalla de firma con esa garantía.

### A07 · P1 · El registro de auditoría no es inmutable frente al administrador

`firestore.rules:312` declara prohibidas las modificaciones/borrados del log, pero
el comodín de la línea 445 vuelve a permitir escritura al administrador. Las
concesiones se suman. Además, la creación del log acepta usuarios autenticados sin
validar un autor ni un esquema concreto en ese bloque.

**2.0:** producir eventos desde operaciones verificadas, sin capacidad ordinaria
de sobrescribirlos; separar administración de aplicaciones y gestión de evidencias.

### A08 · P2 · Varias representaciones de la misma familia y del expediente

La lista de familias usa `createdAt` y `cognoms_referencia`
(`public/families-llistat.html:108`); NexePsy usa `fechaRegistro` y
`apellido/apellidos/nom` (`public/NexePsy/nexepsy.html:252`). Hay lectores de
`dades_personals.nom` sin descifrado mientras otras rutas cifran el objeto completo.
La documentación también describe variantes que no coinciden con las pantallas.

**Consecuencia:** la misma colección no tiene un contrato de lectura compartido;
una ficha puede quedar fuera de una consulta o mostrarse incompleta. No se ha
cuantificado cuántos registros reales están afectados.
**2.0:** modelo canónico, validación, versión de esquema, adaptadores de migración
y reconciliación de identificadores. No corregir nombres mediante reemplazos
globales sin inspeccionar su semántica.

### A09 · P2 · Inscripciones duplicadas y actualizaciones parciales

`public/grupos-db.js:233` crea un documento con ID aleatorio en
`beneficiarios_grupos`, después lee/modifica el array de `grupos.beneficiarios`
(257–266). El borrado realiza también operaciones separadas. La pantalla de
programas mantiene a su vez `actividades.participantIds`.

**Consecuencia:** fallos intermedios y escrituras simultáneas pueden dejar fuentes
distintas de inscripción. **2.0:** una inscripción canónica e idempotente; evitar
arrays paralelos como fuente de verdad. Usar transacciones para cambios que deban
ser atómicos. [Referencia oficial](https://firebase.google.com/docs/firestore/manage-data/transactions).

### A10 · P2 · Asistencia y numeración no protegen frente a concurrencia

`public/grupos-db.js:21` incrementa un contador mediante lectura y actualización
separadas; cualquier error lleva a escribir 1. `guardar` (330) y
`guardarAsistenciaConEstado` (389) consultan si existe asistencia y crean un ID
aleatorio si no existe. Dos clientes pueden leer vacío y crear dos registros.

**2.0:** IDs/operaciones idempotentes y transacciones; asistencia por sesión e
inscripción, numeración central y manejo de errores que no reinicie el contador.
Reproducir concurrencia con pruebas, no solo con un usuario pasando lista.

### A11 · P2 · El importador de Excel es una maqueta

`public/importador-datos.html:213` solo muestra una alerta y escribe el contenido
en consola. No aplica el mapeo seleccionado ni guarda en la base. La línea 187
accede al primer registro sin contemplar una hoja vacía.

**2.0:** simulación, validación de filas, revisión de duplicados, relaciones,
origen/lote y escritura idempotente. Conservar los archivos originales y demostrar
restauración antes del corte. No anunciar importación terminada por mostrar la
primera fila de Excel.

### A12 · P2 · Identidad y roles tienen varias fuentes y vocabularios

`public/auth-manager.js:157` admite usuario por UID y por email; `setDefaultRole`
(280) asigna privilegios de interfaz a emails concretos. La matriz usa `tecnic` o
`directora`; las reglas operativas usan otras variantes. `public/database.js:117`
conserva una función antigua que consulta el campo `pass`.

**Matiz:** no se ha demostrado que el login antiguo siga siendo invocado ni que
el fallback de interfaz conceda privilegios de servidor. Las reglas de usuarios
ya rechazan campos de contraseña en nuevas escrituras. El problema confirmado
es código incompatible coexistiendo y autorización visual no equivalente.
**2.0:** cuenta por UID, roles canónicos, sin elevación por email ni por caché.

### A13 · P2 · Errores de consulta se convierten en cifras cero

`public/entity-dashboard.js:13` retorna `[]` ante cualquier fallo de lectura;
otras capas, como `public/NexeAdmin/admin-db.js:43`, hacen lo mismo. Un error de
permisos, índice o conexión puede aparecer como ausencia de personas o actividad.

**2.0:** distinguir cargando, vacío, error y datos desactualizados; propagar el
error y no calcular indicadores oficiales con colecciones que no se han leído.

### A14 · P2 · Cobertura, despliegue y mantenimiento insuficientes para la 2.0

`demo-routes-check.ps1` comprueba que los archivos existen; no ejecuta sus módulos.
El manifiesto contiene pruebas de reglas pero no fija `firebase-tools` como
dependencia. La aplicación carga el SDK desde CDN (dos versiones encontradas),
mientras que las pruebas usan la versión del lockfile. Hay 48 archivos con
localStorage, 73 con innerHTML y 63 que mencionan Firestore; estos recuentos son
indicadores de dispersión, **no recuentos de vulnerabilidades**.

`.firebaserc` y `public/firebase-config.js` apuntan al proyecto actual. No se ha
encontrado en esta revisión un proceso versionado de restauración probado ni una
configuración de entornos separada suficiente para la 2.0. Eso no demuestra que
no existan copias o procesos fuera del repositorio.

**2.0:** dependencias reproducibles, emuladores, entorno de pruebas independiente,
pruebas de los recorridos principales y restauración ensayada. Retirar del paquete
operativo herramientas de reset/demo; no se han ejecutado durante esta auditoría.

## Decisión por módulo

| Bloque | Qué aprovechar | Qué revisar o reconstruir |
|---|---|---|
| Acceso y usuarios | Firebase Auth y necesidades de roles | Autorización única y asignaciones; quitar rutas antiguas y fallbacks de privilegios. |
| Personas y familias | Campos, pantallas de referencia, genograma | Modelo único, relaciones, escape, formatos cifrados y cabecera dañada de ficha. |
| Áreas y programas | Árbol inicial de Naum y pruebas de la adaptación | Integrarlo en el modelo y permisos 2.0; no duplicar departamentos sin necesidad. |
| Grupos e inscripciones | Flujo de alta y listas | Una fuente de inscripción, vigencia, lista de espera y concurrencia. |
| Asistencia | Estados y operativa de pasar lista | Sesiones, idempotencia, corrección trazable y errores visibles. |
| Seguimiento e informes | Tipos de seguimiento y plantillas | Validar con equipos; coherencia de fuentes y protección del contenido. |
| NexePsy | Expediente, derivación y sesiones como necesidades | Acceso clínico separado; reparar sintaxis y modelo antes de reutilizar módulos. |
| NexeAdmin | Personal, documentos, subvenciones, proveedores | Validar cada circuito; reglas de archivos, errores y dependencias. No se certifica toda su operativa. |
| NexeSing | Solicitud y participantes como flujo | Autoría, integridad, versión y evidencias verificadas. |
| NexeAudit | Planes, hallazgos y acciones como catálogo | Error de sintaxis; autorización y trazabilidad. No implica cumplimiento de normas de calidad. |
| Agenda / recepción / mantenimiento | Recorridos y campos existentes | Permisos por acción, navegación, cambios de estado y separación de utilidades demo. |
| Excel e indicadores | Mapeo visual y conceptos de cuadros de mando | Importación real, reconciliación, datos únicos y estado de error. |

La existencia de un módulo en esta tabla significa que se inventarió y se revisó
su evidencia principal, no que todas sus funciones se hayan probado en navegador.

## Evidencias reproducibles

- [Inventario y diagnósticos completos](static-inventory.json): referencias con
  archivo/línea, errores de sintaxis y métricas.
- `node scripts/audit-static.mjs`: regenera el inventario sin datos reales.
- `scripts/audit-rules.cjs`: sondas de autorización con usuarios y datos sintéticos;
  exige emulador en loopback y no contiene acceso a producción.
- Ejecución de autorización: `firebase emulators:exec --only firestore --project
  demo-nexesocial-audit "node scripts/test-firestore-rules.js && node scripts/audit-rules.cjs"`.
  La CLI debe estar instalada. El script de observación termina correctamente si
  logra medir los casos; para exigir la política propuesta usar `--check`, que
  devuelve error mientras siga habiendo concesiones indebidas.
- `npm run test:structure`: pruebas limitadas a la adaptación del árbol.
- Las reglas concretas desplegadas, configuración de cuentas, datos, backups,
  experiencia móvil y recorridos completos requieren una siguiente validación
  controlada; no se deducen de este diagnóstico estático.

El siguiente entregable debe ser el bloque 0 del [plan](PLAN_VERSION_2.md), seguido
de permisos y el recorrido mínimo de participación. La auditoría no exige esperar
a los Excel para empezar esa base; sí impide dar por cerrada la migración sin ellos.
