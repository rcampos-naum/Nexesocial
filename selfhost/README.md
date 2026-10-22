# NexeSocial en el servidor de la entidad

Entrega inicial para pruebas de aceptación. Aplicación web y base de datos SQLite en Linux, sin Firebase ni servicios externos de datos. Todo el contenido de fichas e informes se guarda en el volumen local. El frontend de esta entrega tampoco carga bibliotecas o fuentes desde terceros.

El alcance y los criterios de puesta en marcha en el plazo máximo solicitado de 15 días están en [ALCANCE-15-DIAS.md](ALCANCE-15-DIAS.md). La versión actual sigue pendiente de aceptación de navegador, plantillas y servidor.

## Qué permite probar

- Cuentas del equipo: administración, coordinación, educación y consulta. Alta, cambio de perfil, contraseña y desactivación. Las personas atendidas no son cuentas de acceso.
- Personas: alta y edición, identificador automático, contacto y vinculación a una familia. Control de coincidencias por documento o nombre y nacimiento; coincidencias ambiguas bloqueadas para revisión.
- Familias: alta, edición y consulta de integrantes.
- Programas generales y de Centro de Día: alta, edición, desactivación, participantes y fechas de alta/baja. Inscripción directa en programa o mediante un grupo, con histórico de movimientos. Grupos por curso, edición y baja conservando sus registros.
- Módulo Centro de Día con sus participantes, grupos, expedientes e informes. Sus pantallas de asistencia e informes filtran los programas de ese tipo; no sustituyen un futuro control de autorización por profesional o departamento.
- Expedientes individuales o familiares por programa, profesional responsable, apertura/cierre y seguimientos con autoría.
- Asistencia por fecha, grupo y sesión: general, refuerzo, lúdicas o Tribu; presente, ausente, justificada y retraso. Control de ediciones concurrentes y resumen imprimible por periodo.
- Informes: diario individual, observación, primera/segunda/final evaluación, encuesta del niño/a, seguimiento grupal, planificación de actividades, Tribu y resumen de evaluación grupal. Borradores versionados y cierre definitivo; impresión del contenido y guardado como PDF mediante el navegador. Cada informe conserva su definición de campos al actualizar la aplicación.
- Importación **.xlsx** local: selección de hoja/cabeceras, asignación de columnas, validación, previsualización y confirmación. Los `.xls` antiguos requieren guardar primero como `.xlsx` en Excel/LibreOffice. No se evalúan fórmulas ni macros. Máximo 10 MB y 1.000 personas por lote. La asignación familiar e inscripciones se hacen después; no se deducen del apellido.
- Bitácora de operaciones de solo consulta para administración; no duplica texto de informes en el log.

## Requisitos y almacenamiento

Node.js 24 con `node:sqlite`, o Docker Engine y Compose en Linux. La versión Node 24 probada aquí emite aviso de que SQLite sigue siendo experimental en su API. No se han probado otras versiones; fijar y validar la imagen exacta antes de producción.

Cuando haya acceso SSH, ejecutar `sh selfhost/check-server.sh` para identificar sistema, arquitectura y herramientas. Es de solo lectura; no instala Docker ni cambia servicios. Si no hay Docker pero sí Node 24, `nexesocial.service.example` sirve como referencia para el administrador: debe crear el usuario de servicio, preparar `/var/lib/nexesocial`, adaptar la ruta de Node y definir en `/etc/nexesocial.env` el directorio de datos y la URL HTTPS. No copiar el ejemplo sin adaptarlo al servidor.

SQLite usa WAL y claves foráneas. Esta arquitectura está pensada para una entidad, una instancia y un departamento compartido, con escrituras cortas. No montar la base en NFS ni ejecutar réplicas escribiendo sobre el mismo archivo. Dimensionar después de medir vuestro número de personas y sesiones simultáneas; si se requieren varios servidores, migrar a PostgreSQL antes de escalar.

Los perfiles autorizados ven todos los registros del centro de día; no hay todavía aislamiento por profesional o departamento. Coordinación y administración gestionan programas y grupos; educación registra personas, familias, asistencia e informes; consulta no escribe. Solo administración gestiona cuentas. No introducir otros departamentos ni historia clínica sin acordar y validar su aislamiento.

La base almacena los datos en el servidor, sin cifrado de campos propio. Aplicar cifrado del disco/volumen y de las copias, control de acceso al servidor y HTTPS. La base y sus copias no deben publicarse como archivos web. No existe sincronización con Firebase ni migración automática del sistema anterior.

## Prueba local sin Docker

Desde la raíz del repositorio, definir variables en la sesión de terminal, sin guardarlas en Git:

```sh
export SITE_ORIGIN=http://127.0.0.1:4080
export DATA_DIR="$PWD/selfhost/data"
export ADMIN_EMAIL='administracion@example.org'
read -rs -p 'Contraseña inicial: ' ADMIN_PASSWORD
export ADMIN_PASSWORD
node selfhost/server.mjs
```

Abrir `http://127.0.0.1:4080`. La contraseña debe tener al menos 12 caracteres. Solo se usa para crear la primera cuenta si aún no hay usuarios. No hay contraseña por defecto. Para cambiar contraseñas después se usa la administración de cuentas.

## Instalación en un subdominio de pruebas Linux

No se ha ejecutado esta instalación en vuestro servidor. El ejemplo no modifica producción.

### Piloto previo en la red local

Para `srv-naum` se ha confirmado Ubuntu 26.04.1, Docker 29.1.3 y Compose 2.40.3; Node no está instalado en el host y no hace falta para la variante Docker. `install-lan.sh` prepara un piloto con el archivo `compose.pruebas.yaml`, proyecto `nexesocial-pruebas`, volumen `pilot-data` y directorio `~/nexesocial-pruebas`, separados de otras aplicaciones. Requiere un SHA completo de la versión revisada y comprueba que la IP indicada pertenece al servidor. No instala paquetes, cambia el firewall ni modifica nginx.

Ejecutar el instalador desde un archivo descargado y verificado, indicando el SHA publicado:

```sh
bash install-lan.sh SHA_COMPLETO_PUBLICADO 10.0.0.85
```

Si Docker necesita `sudo`, la contraseña se introduce exclusivamente en la terminal. En la primera instalación pide correo y contraseña de una cuenta de pruebas; no los imprime ni los escribe en archivos del repositorio. Conserva los datos en el volumen al repetir el instalador. La cuenta inicial permanece en la configuración interna del contenedor durante esta fase; antes de uso real se debe retirar esa contraseña del entorno y recrear el servicio con la configuración HTTPS.

La dirección inicial es `http://10.0.0.85:4080`, solo para datos ficticios. El instalador no abre el firewall: si el contenedor está saludable pero otro ordenador no conecta, diagnosticar la red antes de cambiar reglas. La instalación no se da por completada hasta recibir la salida del instalador y comprobar el acceso desde navegador. Para el uso real seguir después la configuración HTTPS de este documento; no mezclar el volumen de pruebas con datos reales sin acordar su transición.

1. Copiar el repositorio o el paquete de entrega conservando `selfhost/` y `public/import-persones-core.mjs`.
2. Crear un subdominio dedicado y su certificado HTTPS; no sustituir ninguna web existente.
3. Copiar `selfhost/.env.example` a `selfhost/.env`; ajustar el dominio exacto en `SITE_ORIGIN` (sin barra final), correo y contraseña inicial. Restringir el archivo: `chmod 600 selfhost/.env`.
4. Desde `selfhost/`, ejecutar `docker compose up -d --build`. El puerto 4080 solo se publica en loopback.
5. Configurar el proxy HTTPS siguiendo `nginx.conf.example`, adaptándolo al servidor existente. El navegador debe abrir la misma URL exacta declarada en `SITE_ORIGIN`.
6. Entrar con la cuenta inicial y crear las cuentas nominativas del equipo. Retirar `ADMIN_PASSWORD` del archivo de entorno tras la primera instalación y recrear el contenedor; las cuentas persisten en el volumen.
7. Completar las pruebas de aceptación de abajo. No cargar datos reales antes de cerrar permisos, copia/restauración y revisión de formularios.

El contenedor usa un volumen persistente `nexesocial-data`. No ejecutar `docker compose down -v`: elimina ese volumen. Reiniciar/recrear el contenedor conservando el volumen mantiene los registros.

## Copias y restauración

Sin Docker, `DATA_DIR` debe apuntar al directorio de datos:

```sh
node selfhost/backup.mjs /ruta/absoluta/copias
```

Usa la API de backup de SQLite para una copia consistente incluso con WAL. Las fichas, seguimientos e informes están incluidos en la base; no hay almacén de adjuntos en esta entrega. Con Docker, montar además una ruta de copias escribible y ejecutar el mismo script dentro del contenedor; el ejemplo Compose no publica esa ruta por defecto. Automatizar una copia diaria y otra antes de cada actualización, con retención y destino externo acordados.

Restaurar primero en una instalación de pruebas: detener la aplicación, conservar una copia del volumen actual, restaurar el archivo elegido como `nexesocial.sqlite` en un directorio de datos vacío con permisos del usuario del servicio, y arrancar. No copiar un archivo principal antiguo encima de un WAL activo. Comprobar integridad (`PRAGMA integrity_check`), acceso, conteos e informes antes de considerar válida la copia. La restauración debe hacerla el administrador del servidor en una ventana acordada.

## Verificación realizada y pendientes

Desde la raíz:

```sh
node --test scripts/test-import-persones.mjs selfhost/test/*.test.mjs
```

33 pruebas pasan: validación y fechas, duplicados, atomicidad e idempotencia, acceso, altas y edición con conflictos, relaciones, programas, bajas con histórico, coherencia del módulo Centro de Día, seguimientos, asistencia, informes definitivos, importación con rollback, revocación, copia consistente, actualización desde el primer paquete y persistencia tras reabrir la base. Las pruebas de servidor invocan el manejador HTTP real **dentro del proceso, sin sockets**. No demuestran conectividad del proxy, cookies en navegador ni funcionamiento de Docker.

Se comprobó además el lector XLSX con libros sintéticos en memoria: ZIP almacenado/comprimido, cadenas compartidas, texto enriquecido, fechas, identificadores con ceros, fórmulas, hojas ocultas y rechazo de relaciones externas/DTD. Esa comprobación usa un adaptador XML local y tampoco sustituye la prueba de navegador.

La comprobación con conexiones locales quedó bloqueada por el entorno; la solicitud de ejecución fuera del límite fue rechazada automáticamente. Tampoco se completó una revisión visual de navegador. Pendiente: probar lector XLSX en navegadores del equipo con un Excel representativo, ejecutar la instalación Linux, verificar impresión/PDF, carga concurrente, copia/restauración y validación funcional con responsables.

## Límites de esta entrega

### Recuperar el primer arranque con error de permisos

El primer intento en `srv-naum` construyó la imagen pero falló con `EACCES` al abrir `/app/selfhost/server.mjs`. La extracción con permisos privados dejaba el código propiedad de root dentro de la imagen. El Dockerfile corregido usa `COPY --chown=node:node` en las dos copias de código y conserva `USER node` y el sistema de archivos de solo lectura.

Repetir el instalador de la versión corregida conserva el volumen `nexesocial-pruebas_pilot-data`. Una comprobación de solo lectura diferencia entre base inicializada, volumen vacío y base ilegible. Si todavía no hay cuentas, vuelve a pedir las credenciales iniciales; si hay cuentas, las conserva; si no puede comprobar la base, se detiene sin modificarla. No borrar el volumen ni ejecutar el servicio como root.

Pasan cuatro pruebas adicionales sobre estos permisos y estados de recuperación: **37 pruebas en total**. El reintento de Docker en Linux y su comprobación desde navegador siguen pendientes de la salida real del servidor.

- Formularios contrastados con el texto de ocho originales de `Plantillas CD/`: no se ha demostrado equivalencia de todos los campos ni maquetación idéntica. La planificación Tribu reutiliza por ahora el formulario de actividades y su `.doc` antiguo sigue pendiente de revisión. La encuesta del niño/a y el resumen grupal ya se distinguen; sus escalas y presentación deben validarse. El diario funciona por registro mensual, no como la matriz anual del Excel.
- No incluye exportación con el diseño original Excel/Word, firma, adjuntos, genogramas, clínica, captación, subvenciones, correo ni integración SinergiaCRM.
- El importador crea personas y su número de ficha, no expedientes por programa, familias ni inscripciones automáticamente. Estas relaciones se completan desde la herramienta; necesitamos las columnas reales para definir una importación relacional segura.
- No hay importación del histórico de asistencias ni de los documentos antiguos. Mantener originales en su repositorio actual hasta definir su migración.
- Sin autosalvado del borrador local. Guardar los informes con frecuencia; los informes cerrados no se reabren ni borran desde la aplicación.
- No hay MFA, restablecimiento de contraseña por correo, paginación de servidor ni auditoría externa inmutable. Administración puede restablecer contraseñas manualmente.

## Aceptación en un máximo de 15 días

Seguir el alcance y los hitos de `ALCANCE-15-DIAS.md`: núcleo general, módulo Centro de Día, instalación de pruebas, aceptación del equipo y puesta en marcha controlada. La fecha depende de acceso al servidor, Excel representativo y validación de responsables; este paquete no es una instalación productiva terminada.

## Actualizar desde el primer paquete de pruebas

Hacer una copia consistente antes de actualizar. Mantener el mismo directorio de datos o volumen. La aplicación añade columnas y tablas para programas, participación y definiciones de informes sin borrar registros. Los programas existentes quedan de tipo General; administración o coordinación deben marcar el programa correspondiente como Centro de Día para que aparezca en su módulo. No se adivina el tipo a partir del nombre.
