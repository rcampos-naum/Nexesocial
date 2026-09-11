# NexeSocial 2.0 · base aislada

Primera entrega de la reconstrucción: arranque independiente, navegación común,
autenticación en emulador y autorización por área comprobada con las reglas de
Firestore. El boceto de `public/` queda como referencia; esta entrega no modifica
sus reglas ni repara retrospectivamente todos los hallazgos de su auditoría.

## Incluido

- Interfaz compartida: inicio, áreas/programas y actividades, adaptable a móvil.
- Seis áreas y ocho programas de Naum como catálogo de prueba; cuatro actividades
  claramente ficticias. No se crea información de personas atendidas.
- Cuatro cuentas reales del emulador Auth: administración, coordinación, equipo
  educativo y voluntariado. No es un selector que solo cambia botones.
- Lectura por áreas asignadas. Administración y coordinación pueden crear,
  renombrar, vincular a un programa de la misma área y pausar actividades.
- Autoría inicial, fechas del servidor, esquema cerrado y área inmutable.
- Roles y asignaciones no editables desde el cliente, ni siquiera con perfil
  administrador. Se gestionan mediante el script local de preparación mientras
  no exista un servicio administrativo verificado.
- Rechazo de cuentas inactivas, caducadas y sin asignación. Caché de permisos no
  utilizada para conceder acceso; se espera confirmación del emulador.
- Configuración, clínica, firmas y auditoría cerradas. Su denegación no significa
  que esos módulos estén implementados. La bitácora operativa se añadirá junto
  con un servicio de operaciones verificadas.

## Arranque desde una copia limpia

Requisitos del entorno probado: Node.js 24 y Java 21. Las herramientas de
compilación y Firebase CLI están fijadas en el lockfile del repositorio.

Desde la raíz de Nexesocial:

```sh
npm ci
npm run v2:build
npm run v2:dev
```

En una segunda terminal, con los emuladores ya arrancados:

```sh
npm run v2:seed
```

Abrir `http://127.0.0.1:5002`. El script seed solo crea los documentos ausentes:
repetirlo no borra actividades nuevas ni restablece permisos modificados durante
las pruebas. Los perfiles expiran a los siete días de su creación. Solo acepta
emuladores en loopback y usa exclusivamente `demo-nexesocial-v2`.

| Servicio | Dirección |
|---|---|
| Interfaz | 127.0.0.1:5002 |
| Auth | 127.0.0.1:9092 |
| Firestore | 127.0.0.1:8182 |
| Hub / logging / websocket | 4402 / 4502 / 9152 |

No hay configuración de producción ni fallback al proyecto del boceto. El cliente
rechaza ejecución fuera de localhost/127.0.0.1. Las cuentas y contraseñas que
aparecen en los archivos son exclusivamente fixtures locales.

## Comprobaciones

Con la sesión interactiva detenida para liberar los puertos:

```sh
npm run v2:build
npm run v2:check
npm run v2:test
```

- 4 comprobaciones: modelo/validación, vigencia de acceso, sintaxis de módulos y
  recursos de la página compilada sin heredar el proyecto de producción.
- 38 comprobaciones en Firestore Emulator: lecturas por ámbito, consultas
  acotadas, creación y relectura, edición, autoría, esquema, programas de otra
  área, borrado, revocación y cierre de dominios no implementados.
- `node v2/scripts/smoke.mjs`, con los emuladores y fixtures arrancados: verifica
  inicio de sesión contra Auth y consulta real del ámbito para los cuatro perfiles.
  Resultado de esta entrega: administración 6 áreas; los otros perfiles 1 cada uno.
- Los comandos de auditoría del boceto siguen detectando sus defectos: no deben
  confundirse con los de validación de la 2.0.

En Windows se observó que Firebase CLI podía dejar su proceso Java vivo tras
`emulators:exec`. Si indica que el puerto está ocupado, identificar el proceso y
verificar **project_id demo-nexesocial-v2, puerto 8182 y reglas v2/firestore.rules**
antes de detenerlo. No cerrar procesos Java ajenos ni cambiar puertos al azar.

## Qué probar en la interfaz

1. Entrar como Coordinació: solo Son Roca Activa y sus dos programas.
2. Crear una actividad, recargar y entrar de nuevo: el registro sigue disponible
   mientras continúa en marcha el emulador.
3. Editarla y ponerla en pausa; comprobar el indicador de actividades activas.
4. Salir y entrar como Equip educatiu: solo Centre de dia, sin edición.
5. Entrar como Voluntariat: Son Roca Activa en consulta.
6. Entrar como Administració: catálogo completo de seis áreas.

La sesión de acceso se mantiene en memoria: recargar exige volver a elegir un
perfil. Los datos se guardan en el emulador mientras está en marcha; no hay todavía
exportación automática ni persistencia de los datos al reiniciar los emuladores.
No introducir datos reales. La validación de esta entrega se ha realizado mediante
compilación, pruebas automatizadas y peticiones locales, sin una revisión visual
completa de navegador.

## Siguiente bloque

Personas y familias con un identificador único, seguido de inscripciones, grupos,
sesiones y asistencia. Antes de conectar datos reales: entorno de pruebas de Naum,
servicio administrativo de asignaciones, registro de operaciones, restauración
ensayada y validación de permisos con responsables. El catálogo es de solo lectura
en esta entrega; editar áreas y subprogramas corresponde a ese servicio posterior.
