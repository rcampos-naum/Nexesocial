# NexeSocial en el servidor de la entidad

Entrega inicial para pruebas de aceptación. Aplicación web y base de datos SQLite en Linux, sin Firebase ni servicios externos de datos. Todo el contenido de fichas e informes se guarda en el volumen local. El frontend de esta entrega tampoco carga bibliotecas o fuentes desde terceros.

## Qué permite probar

- Cuentas del equipo: administración, coordinación, educación y consulta. Alta, cambio de perfil, contraseña y desactivación. Las personas atendidas no son cuentas de acceso.
- Personas: alta y edición, identificador automático, contacto y vinculación a una familia. Control de coincidencias por documento o nombre y nacimiento; coincidencias ambiguas bloqueadas para revisión.
- Familias: alta, edición y consulta de integrantes.
- Programas, grupos por curso e inscripción o baja de personas en grupos. La inscripción en un programa se representa mediante su grupo.
- Expedientes individuales o familiares por programa, profesional responsable, apertura/cierre y seguimientos con autoría.
- Asistencia por fecha, grupo y sesión: general, refuerzo, lúdicas o Tribu; presente, ausente, justificada y retraso. Control de ediciones concurrentes y resumen imprimible por periodo.
- Informes: diario individual, observación, primera/segunda/final evaluación, evaluación general, seguimiento grupal, planificación de actividades, Tribu y evaluación grupal. Borradores versionados y cierre definitivo; impresión del contenido y guardado como PDF mediante el navegador.
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
node --test scripts/test-import-persones.mjs selfhost/test/server.test.mjs
```

28 pruebas pasan: validación y fechas, duplicados, atomicidad e idempotencia, acceso, altas y edición con conflictos, relaciones, seguimientos, asistencia, informes definitivos, importación con rollback, revocación, copia consistente y persistencia tras reabrir la base. Las pruebas de servidor invocan el manejador HTTP real **dentro del proceso, sin sockets**. No demuestran conectividad del proxy, cookies en navegador ni funcionamiento de Docker.

Se comprobó además el lector XLSX con libros sintéticos en memoria: ZIP almacenado/comprimido, cadenas compartidas, texto enriquecido, fechas, identificadores con ceros, fórmulas, hojas ocultas y rechazo de relaciones externas/DTD. Esa comprobación usa un adaptador XML local y tampoco sustituye la prueba de navegador.

La comprobación con conexiones locales quedó bloqueada por el entorno; la solicitud de ejecución fuera del límite fue rechazada automáticamente. Tampoco se completó una revisión visual de navegador. Pendiente: probar lector XLSX en navegadores del equipo con un Excel representativo, ejecutar la instalación Linux, verificar impresión/PDF, carga concurrente, copia/restauración y validación funcional con responsables.

## Límites de esta entrega

- Formularios adaptados del código existente en `public/centre-dia-docs.html`: no se ha demostrado equivalencia de todos los campos ni maquetación idéntica con los nueve originales de `Plantillas CD/`. La planificación Tribu reutiliza por ahora el formulario de actividades; la evaluación general/grupal es una adaptación resumida. Deben validarse antes de uso real.
- No incluye exportación con el diseño original Excel/Word, firma, adjuntos, genogramas, clínica, captación, subvenciones, correo ni integración SinergiaCRM.
- El importador crea personas y su número de ficha, no expedientes por programa, familias ni inscripciones automáticamente. Estas relaciones se completan desde la herramienta; necesitamos las columnas reales para definir una importación relacional segura.
- No hay importación del histórico de asistencias ni de los documentos antiguos. Mantener originales en su repositorio actual hasta definir su migración.
- Sin autosalvado del borrador local. Guardar los informes con frecuencia; los informes cerrados no se reabren ni borran desde la aplicación.
- No hay MFA, restablecimiento de contraseña por correo, paginación de servidor ni auditoría externa inmutable. Administración puede restablecer contraseñas manualmente.

## Aceptación en las dos semanas

Días 1–3: confirmar Excel, modelo de personas/familias y prioridades de las nueve plantillas. Días 4–7: completar equivalencia de formularios y relaciones necesarias de importación. Días 8–10: instalación de pruebas Linux, permisos del equipo y ensayo completo con casos ficticios. Días 11–14: corregir incidencias, probar copias/restauración, formar al equipo y acordar un corte limitado. La fecha depende de acceso al servidor y validación de responsables; este paquete no es una instalación productiva terminada.
