# Auditoría de la estética aprobada de NexeSocial

Referencia principal indicada por el usuario: https://nexesocial-bc6c4.web.app. Auditoría del 22 de octubre de 2026. La revisión de la web publicada fue de solo lectura, incluida una sesión iniciada por el usuario. No se modificaron datos ni configuración de esa web ni del servidor Linux.

## Resultado

La adaptación Linux anterior **no era fiel a la interfaz aprobada**. Había sustituido la barra superior oscura por una blanca, el menú jerárquico por una lista, la ficha completa por un diálogo con acordeones, los programas por tablas y los indicadores/gráficos por otra presentación.

Se han corregido esas sustituciones y conservado una copia verificable de los estilos originales. **No se certifica una equivalencia visual del 100 % de toda la aplicación**: hay una incidencia previa en la ficha publicada y funciones de la aplicación original que todavía no forman parte del piloto. Las diferencias pendientes se enumeran abajo; no se ocultan como cambios de diseño aprobados.

## Pantallas y componentes revisados

| Elemento | Referencia | Corrección / evidencia |
|---|---|---|
| Acceso | `index.html` | Mismo fondo y logotipo, tarjeta de 380 px de contenido más relleno original, ubicación, tipografía, textos en catalán, campos y botón. Comparación visual directa. Solo cambia la indicación de autenticación porque el piloto no usa Firebase. |
| Estructura común | `sidebar.js`, `style-dashboard.css` de la web publicada | CSS extraído sin ejecutar sus scripts. Barra superior `#1e293b`, altura 60 px, logo de 35 px, menú de 280/70 px, pie de 50 px, Inter y submenús. Eliminada la interpretación del diseño de NexeAdmin usada por error en la adaptación anterior. |
| Menú reducido | `sidebar.js` | Iconos originales diferenciados, submenús flotantes y nombres accesibles. Se omiten entradas de funciones no implementadas; no se simula su disponibilidad. |
| Inicio | `home.html` | Recuperados los componentes originales de KPI, gestión global, accesos y bienvenida. Los indicadores muestran únicamente información realmente disponible. Agenda, reservas y avisos aún no están implementados en este piloto. |
| Expedientes de personas | `expedient-detall.html` | Título, acción verde, buscador, filtro menores/adultos y las ocho columnas originales: expediente, nombre, DNI/NIE, estado, género, situación administrativa, empleo y acciones. Número permanente conservado. |
| Ficha personal | `perfil-usuari.html` | Recuperada la página completa y sus seis pestañas: datos personales, servicios, situación psicosocial, educación/salud, actividades y seguimiento. Edición y guardado comprobados con datos ficticios. Su CSS original está dañado: se reutilizan patrones válidos del perfil familiar y del resto de la aplicación, por lo que esta pantalla sigue sin poder certificarse como réplica exacta de una versión anterior aprobada. |
| Familias | `families-llistat.html`, `familia-perfil.html` | Directorio con icono SVG, tarjetas, contador y acción de gestión; ficha familiar en página completa con miembros y seguimientos. No se muestra una pestaña psicosocial como operativa cuando esa función no está implementada. |
| Programas | `programes-gestio.html` | Recuperadas tarjetas de programa, cabecera de color, indicadores y tarjetas de grupos; eliminada la tabla como presentación principal. El piloto no dispone todavía de todos los niveles jerárquicos y colores configurables del original. |
| Totales | `dades-totals.html` | Recuperados filtros, tres filas de indicadores, edad media, cuatro gráficos circulares y paleta originales. Se emplea Chart.js 4.5.1 local con las opciones del original. Los recuentos se calculan sobre personas únicas y los valores de la ficha. |
| Documentos CD | `centre-dia-docs.html` | Recuperadas las tarjetas, píldoras de filtro, selector de documentos y estilos de formulario/modal. La equivalencia funcional completa de todos los formularios y de las plantillas impresas sigue pendiente de validación. |
| Asistencias | `passar-llista.html` | Reutilizados los estilos de tarjeta, controles y tabla. Se conservan los cuatro estados del piloto; su selector adicional responde a esa ampliación funcional. |
| Importador | `importador-datos.html` | Tarjeta, icono, zona de arrastre/selección, asignación de columnas y estilos originales. Se conservan revisión, coincidencias y confirmación antes de escribir. Solo admite `.xlsx`; el `.xls` antiguo debe convertirse. |
| Equipo y registro | `gestio-usuaris.html` y tablas existentes | Se reutilizan los patrones originales para las operaciones del piloto. No equivalen a la suite completa NexeAdmin/NexeAudit. |

## Incidencia previa confirmada en la web publicada

`perfil-usuari.html` carece de la apertura de su bloque de estilos y contiene fragmentos de JavaScript/CSS en la cabecera. Al abrir **Nuevo registro**, sin guardar nada, se confirmó que esos fragmentos aparecen como texto y se pierden estilos y comportamiento de las pestañas. El historial disponible en GitHub tampoco contiene una versión anterior íntegra de esos estilos.

No se han copiado a la aplicación Linux esos fragmentos ni alertas médicas que aparecen activadas por defecto en el original. Para igualar al 100 % la ficha de una versión anterior aprobada hará falta esa versión íntegra, una copia o una referencia visual correspondiente. El defecto de la referencia se distingue de una decisión de rediseño.

## Conservación y control de cambios

- `web/approved/manifest.json`: procedencia y huellas SHA-256 de 15 extracciones de CSS/SVG, además de las fuentes y la librería de gráficos.
- `scripts/sync-approved-ui.mjs`: extracción reproducible a partir de una copia local de los archivos públicos. No ejecuta Firebase ni los scripts originales.
- `selfhost/AGENTS.md`: instrucción persistente para reutilizar la estética aprobada y evitar rediseños, traducciones y sustituciones de componentes por iniciativa propia.
- Los originales de `public/` quedan intactos. El código de adaptación y sus excepciones están separados de los estilos conservados.
- El logo y el fondo coinciden byte a byte con la web publicada: `5105f08dc1eb39dd8c925528581acb304b7282ba90cc45fd69aab16b30dc400b` y `f37a491c267b0b8075ddaa97ff8e097adfb34f30063ebf01805a29438c3fc5f3` respectivamente.
- Pruebas de huellas detectan cambios en los estilos originales. No sustituyen una revisión visual de los adaptadores, las vistas ni las pantallas nuevas.

## Diferencias funcionales que siguen explícitas

La autenticación es local; no debe anunciar Firebase. La exportación del piloto es CSV para Excel y se etiqueta como tal. Los perfiles muestran datos actuales, no fotografías históricas por curso. El indicador de asilo aparece sin cifra cuando no hay un dato específico disponible; no se inventa un cero. No se incluyen como operativos agenda, firmas, NexePsy, NexeAudit o módulos todavía no implementados.

## Comprobación

46 pruebas automáticas pasan: funcionamiento, migración, numeración permanente, importación, permisos, totales, copia previa y conservación de estilos/SVG. Se ha comprobado en navegador con datos ficticios el acceso, el menú desplegado/reducido, la ficha con pestañas y su guardado desde otra pestaña, la ficha familiar y el alta de un documento CD. Las capturas de la adaptación utilizan exclusivamente datos ficticios.

Los cambios se preparan en la rama de pruebas. Esta auditoría no constituye una instalación en Linux ni una nueva aprobación visual por parte de las directoras.

## Revisión específica de Centro de Día — 22/10/2026

Se sustituye el resumen genérico de Centro de Día por la estructura de `grups.html`: tres tarjetas de resumen, filtros, listado de grupos y botones con los colores originales para beneficiarios, asistencia y edición. Los filtros disponibles son departamento/programa y curso. La segunda tarjeta cuenta participantes activos: no se presenta una cifra ficticia de actividades, pues el piloto todavía no tiene el modelo independiente de actividades, responsables y turnos de la referencia. La tabla muestra únicamente datos existentes, sin inventar esos campos. El alta de grupos desde esta pantalla limita los programas al Centro de Día.

Documentos recupera la separación Individuals/Grupals, filtros por familias documentales, iconos SVG originales de `centre-dia-docs.html`, colores por tipo, contadores y selector de plantillas agrupado. Se conservan todas las plantillas existentes y sus campos: las evaluaciones trimestrales/finales y las dos planificaciones siguen siendo opciones diferenciadas, y la encuesta infantil conserva su nombre propio (no se confunde con una evaluación integral). Formularios personalizados, firma y exportación nativa Excel siguen pendientes; no se muestran controles ficticios.

Asistencia recupera las cuatro tarjetas coloreadas de `passar-llista.html`, con los estados visibles P/F/FJ y el estado adicional R. Se conserva la codificación interna A/J y el guardado explícito del piloto; no se anuncia guardado automático. Los contadores se actualizan al cambiar selecciones, sin considerar presentes los registros sin marcar. El acceso Asistencia de cada grupo abre directamente su lista.

Se revisaron en navegador local con datos ficticios: listado de grupos, acceso directo a asistencia con tres personas, pantalla de documentos, filtro grupal sin resultados, selector de plantillas y colores corregidos mediante clases CSS compatibles con la política de seguridad local. Se contrastó con el HTML/CSS público conservado en la auditoría anterior. La web aprobada está actualmente en el acceso y no se volvió a iniciar sesión ni se modificó. Las 46 pruebas automáticas pasan tras estos cambios. Esta revisión no certifica equivalencia funcional completa ni instalación en el servidor.

## Interior de los documentos — 22/10/2026

Se contrastó el formulario de observación publicado, abriendo Nou Document sin guardar ni introducir datos. La referencia quedó de nuevo en Inicio. Se recuperan las secciones con iconos originales, la identificación en tres columnas, los campos dentro de contenedores `.ff`, las tablas `.rtable` y los selectores `.rsel`, las observaciones junto a cada indicador y el pie fijo con Cancel·lar / Guardar esborrany / Guardar definitiu. El encabezado tiene icono del tipo, tamaño original y cierre compacto. La observación tiene un área de texto de 200 px. La vista de consulta reutiliza la distribución del formulario, deshabilita edición y permite imprimir.

La distribución de diario, evaluaciones, seguimiento grupal, planificaciones y encuesta se organiza por secciones sin cambiar claves ni validación de los campos. Los campos históricos desconocidos se mantienen en Información adicional; no desaparecen al editar documentos anteriores. El estado se toma del botón de guardado pulsado; los documentos definitivos conservan el bloqueo del servidor.

Comprobación visual local con datos ficticios: observación guardada, guardado como borrador y posterior consulta de su contenido, apertura de evaluación individual, identificación, tablas y pie fijo mientras se desplaza el contenido. Dos pruebas nuevas verifican que todos los campos de cada esquema actual e histórico aparecen exactamente una vez y que los desconocidos permanecen disponibles.

Diferencias pendientes explícitas: el diario del piloto sigue siendo un documento por mes; la cuadrícula anual multimes de la referencia requiere adaptar el modelo de datos, no solamente CSS. La planificación mantiene el campo de actividades existente, sin añadir filas estructuradas ficticias. No se añaden campos que no se almacenan ni se copia la evaluación general integral sobre la encuesta infantil. La disposición responsive se adapta para evitar el desbordamiento visto en la referencia con la ventana estrecha. La impresión sigue siendo la versión imprimible del piloto; no se certifica equivalencia con las exportaciones originales.

## Excepción autorizada: modernización del acceso — 27/10/2026

El usuario pide expresamente modernizar la pantalla de acceso mostrada en su captura y corregir el pie desplazado. Esta autorización sustituye la conservación estricta del aspecto anterior solamente en el acceso. Los módulos interiores y los archivos congelados de `web/approved/` quedan intactos.

Se añade `web/login.css`, cargado después de los estilos originales, con todas las reglas limitadas a `.login-body`. Presentación en dos columnas (marca y formulario), identidad azul/turquesa, logo original y fondo existente integrado con contraste suave. En móvil se apilan las columnas y se simplifica la presentación. Campos y botón de acceso tienen altura consistente y se incorpora mostrar/ocultar contraseña con etiqueta accesible, estado y botón de tipo `button`. El envío identifica expresamente el botón `submit`, evitando confundirlo con mostrar contraseña. Las fuentes Inter se cargan localmente también en el acceso.

Causa del pie: heredaba `left: var(--sidebar-width)` y el ancho reservado al menú de la hoja global. En el acceso se restablecen los desplazamientos, ancho 100 %, altura automática, separación de textos y posición estática. El contenedor del acceso crece hasta ocupar la pantalla y el pie queda al final sin tapar campos en ventanas bajas o móviles.

48 pruebas superadas y revisión de sintaxis correcta. La hoja nueva se incluye en la comprobación de rutas estáticas. La revisión visual está pendiente: el navegador denegó acceso a la vista local http://127.0.0.1:4088 porque no se concedió autorización de acceso. No se intentó abrir por otra vía. Cambios guardados en la rama local `fix/acceso-moderno`, basada en fd5d661, para no incluir el diario anual todavía pendiente de revisión. No se publica ni se instala hasta completar la revisión visual indicada en AGENTS.md.

## Formularios completos de Firebase — 27/10/2026 (pendiente de comprobación local)

La revisión del código y de los siete formularios en la web autenticada confirma que la adaptación anterior no era equivalente: diario mensual simplificado, planificación sin filas estructuradas, evaluación grupal sin tabla individual y confusión entre evaluación integral y encuesta infantil.

Se recuperan directamente los siete constructores de formulario de `https://nexesocial-bc6c4.web.app/centre-dia-docs.html`: Diari Individual, Observació Individual, Avaluació Individual, Avaluació General, Seguiment Grupal, Planificació Activitats y Avaluació Grupal. La referencia se descargó como código público y los siete formularios se abrieron sin introducir ni guardar datos. No se copia la autenticación ni Firestore.

- `web/firebase-original.mjs`: constructores puros y SVG originales. Diario octubre–junio, tablas, textos, opciones y secciones originales.
- `web/reference-forms.css`: 46 declaraciones inline originales convertidas a clases para conservar la política de seguridad del piloto; sin permitir scripts/estilos inline.
- `web/firebase-adapter.mjs`: catálogo de campos derivado de los controles originales y serialización de valores mensuales/valoraciones.
- `web/firebase-dom.mjs`: filas de actividades y evidencias, y valoraciones individuales de participantes guardadas con ID estable. Consulta usa el snapshot guardado, sin incorporar participantes nuevos al abrir informes antiguos.
- `web/firebase-legacy.mjs`: presentación de documentos anteriores con el formulario de referencia y adaptación transaccional al guardar un borrador. Se preservan todos los valores anteriores, el esquema completo y su tipo de origen. Los valores sin correspondencia o fuera del rango de la referencia permanecen visibles en Dades originals abans de l’adaptació. No se altera un definitivo.
- Se mantiene la encuesta infantil separada de Avaluació General. No son instrumentos equivalentes.
- `scripts/sync-firebase-forms.mjs` y `firebase-forms-reference.json`: extracción reproducible y huellas. El generador rechaza constructores distintos del bloque previamente auditado antes de importarlo. No se ejecutan scripts de autenticación ni de Firebase.

54 pruebas superadas: las siete estructuras completas de formulario coinciden con el constructor publicado, permitiendo solamente las clases de seguridad, nombres de controles y listeners locales; persistencia de cada control; valores cero; todos los meses; contenido escapado; filas estructuradas; participantes duplicados/no inscritos; datos antiguos conservados; actualización atómica; rechazos de versión antigua y bloqueo de definitivos. Se añade comprobación de todas las rutas nuevas.

Límites pendientes: no se ha podido abrir la adaptación local en el navegador. El control de acceso rechaza http://127.0.0.1:4088 por un permiso guardado o política de acceso. No se intentó abrirla por otro navegador, puerto, aplicación ni mecanismo alternativo después del rechazo. La verificación de código/estructura y la inspección de la referencia no sustituyen la comparación visual de la adaptación ni las pruebas de los controles dinámicos en navegador. No se certifica igualdad visual total ni exportaciones idénticas. Los controles dinámicos se adaptan a almacenamiento local y los selectores contienen los registros locales; no se recuperan de Firebase datos personales.

La rama local `fix/formularios-firebase` queda sin publicar ni instalar. Según `selfhost/AGENTS.md`, «Antes de publicar cambios en la interfaz, revisa las pantallas afectadas en navegador con datos ficticios, compara con la referencia y registra las diferencias o limitaciones». Queda pendiente habilitar la vista local para cerrar esa revisión.

### Captura local aportada por el usuario

Se recibe una captura del navegador local mostrando Nou Document — Diari Individual, las tablas de asistencia e indicadores mensuales de octubre–junio, las observaciones y el pie de guardado. Confirma la carga de los nuevos constructores y estilos en el navegador del usuario. El desbordamiento horizontal de la tabla de calificaciones está previsto también en el HTML de Firebase (`overflow-x:auto`, selectores de anchura fija); no se cambian dimensiones para ocultarlo. Se elimina únicamente el margen superior y el display:block que heredaban los controles mensuales de los estilos generales del piloto, restaurando su comportamiento inline nativo. La captura no verifica los otros seis formularios ni las acciones de sus controles dinámicos. Sigue pendiente completar la comparación visual local.
