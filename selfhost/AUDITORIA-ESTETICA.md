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
