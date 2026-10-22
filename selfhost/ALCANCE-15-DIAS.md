# Entrega de Nexesocial en un máximo de 15 días

Alcance confirmado el 21 de octubre de 2026. Fecha objetivo máxima: 5 de noviembre de 2026. Una sola aplicación, una sola base de datos y almacenamiento en el servidor Linux de la entidad. Esta fecha es el objetivo solicitado; el código actual es una entrega de pruebas, no una instalación aceptada.

## Qué debe estar operativo

| Bloque | Criterio para darlo por entregado |
|---|---|
| Personas atendidas | Alta, consulta y edición de fichas; importación del Excel habitual con previsualización, errores y control de coincidencias; conservación del identificador y los vínculos |
| Cuentas del equipo | Cuentas nominativas, perfiles, cambio de contraseña y desactivación inmediata; validación de los accesos con la entidad |
| Familias | Crear y editar la unidad familiar, vincular y desvincular integrantes y consultar los expedientes familiares |
| Programas | Alta y edición, estado activo/inactivo, participantes, fechas de alta/baja, grupos y conservación del histórico |
| Expedientes | Asociar persona o familia a un programa, asignar responsable, registrar seguimientos, cerrar y consultar el histórico |
| Módulo Centro de Día | Acceso propio con sus participantes y grupos; lista de asistencia por fecha y tipo de sesión; consulta y resumen de asistencias; diarios, observaciones, evaluaciones, seguimiento grupal y planificación basados en las plantillas |
| Instalación | Acceso HTTPS en el Linux de la entidad, datos persistentes, prueba de reinicio, copia/restauración comprobada, instrucciones y ensayo del equipo |

La herramienta no se considera entregada solo por tener pantallas o superar pruebas automáticas. Debe completarse el recorrido real de una persona: importar → vincular familia → alta en programa → grupo → expediente → asistencia → seguimiento → informe → consulta posterior, con los permisos de cada perfil.

## Estado verificable de este bloque

- Implementadas las operaciones básicas anteriores en una rama aislada y un paquete sin Firebase. El módulo Centro de Día diferencia programas y grupos de otros programas; este filtro no equivale todavía a un aislamiento de autorización por trabajador o departamento.
- Programas y grupos ya se pueden editar y desactivar. Las bajas de programa finalizan las inscripciones en sus grupos y conservan asistencias y movimientos de alta/baja.
- Importación `.xlsx` de personas disponible con asignación de columnas y confirmación. La importación automática de relaciones familiares/programa/grupo necesita el Excel real y reglas aceptadas para interpretar sus columnas.
- Revisado el texto de ocho de las nueve plantillas originales. El archivo Word antiguo de Tribu (`.doc`) sigue pendiente de lectura y contraste. No se ha verificado todavía la composición visual de las plantillas ni de los informes impresos.
- Corregida la distinción entre la encuesta de los niños y el resumen grupal: no son valoraciones clínicas. Las etiquetas de respuesta de la encuesta son una adaptación textual y deben validarse con el equipo.
- Añadidos campos de identificación en evaluaciones y diario, asistencia mensual en el diario y objetivos, evolución, fortalezas, mejoras, estrategias y descripción de evidencias en seguimiento grupal. La matriz anual y la planificación por cada semana/sesión todavía requieren completar su equivalencia y presentación.
- Los informes guardan su definición de formulario para conservar la interpretación del contenido al actualizar plantillas. Una actualización desde el primer paquete mantiene las fichas, vinculaciones y formularios anteriores.
- 44 pruebas automáticas pasan. Se revisaron localmente el acceso, las familias, la ficha ampliada, los totales y el menú reducido en navegador con datos ficticios. Sigue pendiente la aceptación en el servidor Linux.

## Orden de ejecución y comprobación

| Tramo | Trabajo y evidencia esperada |
|---|---|
| Días 1–4 | Cerrar fichas, familias, programas y expedientes; contrastar Excel real; completar las operaciones y sus permisos; recorrido completo con personas ficticias |
| Días 5–9 | Completar las plantillas prioritarias del centro de día, sus listados y resúmenes; prueba de asistencia y seguimiento con profesionales; instalar en un espacio de pruebas de Linux |
| Días 10–12 | Ensayar importación representativa, concurrencia, permisos, impresión, reinicio y copia/restauración; corregir las incidencias detectadas |
| Días 13–15 | Validación conjunta de los cinco bloques, formación breve, carga inicial acordada y puesta en marcha controlada |

Para sostener el plazo, el acceso al servidor y un Excel representativo deben estar disponibles durante la primera semana. El usuario ha indicado que no está ahora en el equipo; no se ha intentado conectar a su infraestructura. No se deben inferir direcciones, credenciales o configuración del Linux a partir de otros proyectos.

## Decisiones que siguen abiertas

Confirmar las columnas del Excel; si contiene varias personas por familia y códigos de programa/grupo; quién puede consultar qué expedientes; los formularios que se usan realmente a diario; el dominio de pruebas y los componentes disponibles en Linux. Se pueden seguir completando funciones y pruebas locales mientras llegan estos datos; no se da por autorizada una migración de datos reales ni un cambio en servicios productivos existentes.

## Fuera de esta primera entrega

SinergiaCRM, captación, contabilidad, gestión de otros departamentos especializados, clínica, firma avanzada, genogramas y rediseño general del resto del repositorio. Los adjuntos y exportaciones con maquetación idéntica a Excel/Word deben decidirse según lo imprescindible para la operativa del centro; por ahora se conservan los originales y se ofrece impresión del informe adaptado.

## Añadido al alcance el 22 de octubre

Incluidos los campos de la ficha original, la pantalla Totales, iconos diferenciados para el menú reducido y numeración de expediente única y permanente por persona. La numeración existente se conserva al actualizar. Archivo/reactivación sustituye a la eliminación de personas. Los totales se basan en perfiles actuales y personas únicas, con filtros por programa/curso/grupo y resumen CSV. Se han completado 44 pruebas automáticas y una revisión local en navegador con datos ficticios; sigue pendiente la actualización y aceptación en Linux.
