# Interfaz aprobada de NexeSocial

El usuario exige conservar la estética aprobada por las directoras. La referencia principal es https://nexesocial-bc6c4.web.app y los archivos originales de `public/`.

- Reutiliza sus estilos, estructura, tipografía, colores, dimensiones, iconos y textos. No introduzcas rediseños ni traducciones por iniciativa propia.
- `web/approved/` contiene CSS/SVG extraídos de la web pública y un manifiesto de procedencia y huellas. No edites esos estilos a mano. Una actualización debe partir de la referencia aprobada y documentar las diferencias.
- Los módulos nuevos reutilizan los componentes existentes. No reemplaces pestañas por acordeones, tarjetas por tablas ni gráficos por otra presentación para simplificar la implementación.
- Mantén separado el cambio de almacenamiento/autenticación de la presentación. No restaures conexiones Firebase ni controles de funciones todavía no implementadas para aparentar equivalencia.
- Antes de publicar cambios en la interfaz, revisa las pantallas afectadas en navegador con datos ficticios, compara con la referencia y registra las diferencias o limitaciones. Las pruebas automáticas por sí solas no confirman fidelidad visual total.
- Cuando la referencia esté incompleta, documenta la laguna; no declares una equivalencia del 100 % sin evidencia.
