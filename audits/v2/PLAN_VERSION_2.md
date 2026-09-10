# NexeSocial 2.0 · propuesta de reconstrucción

## Decisión de partida

Usar el boceto como catálogo de necesidades, pantallas y vocabulario. Conservar la
identidad de NexeSocial y las referencias útiles; reconstruir los contratos de
datos, autorización y procesos críticos antes de trasladar módulos completos.
No trasladar todos los archivos a un nuevo diseño y llamar a eso versión 2.0.

La entrega anterior de jerarquía sirve como demostración del concepto. Su árbol
de áreas no sustituye el modelo completo de usuarios, inscripciones y permisos.

## Modelo funcional propuesto

| Entidad | Regla de la versión 2.0 |
|---|---|
| Persona | Identificador interno estable; identidad única para una misma persona en varios servicios. DNI/NIE opcional; no fusionar automáticamente por nombre o fecha de nacimiento. |
| Unidad familiar | Entidad independiente, con relaciones persona–familia, parentesco, tutela y vigencia. No copiar personas dentro de cada programa. |
| Área / programa / subprograma | Árbol tipado y editable; actividades en cualquier nivel; identificadores estables; responsables y permisos independientes del nombre visible. |
| Actividad | Oferta concreta con objetivos, ubicación, calendario, responsables y criterios de acceso. No equivale a una sesión ni a un grupo. |
| Edición | Curso, campaña o período concreto de una actividad; permite repetir escuela de verano sin sobrescribir el año anterior. |
| Grupo | Agrupación dentro de una edición, con plazas y asignaciones profesionales. |
| Inscripción | Relación persona–edición/grupo con altas, bajas, lista de espera y motivo. Un documento canónico; cualquier resumen es derivado. |
| Sesión | Ocurrencia programada con fecha, hora y estado. Una actividad puede tener dos sesiones el mismo día. |
| Asistencia | Un registro por sesión e inscripción, con estado explícito y correcciones trazables. No usar únicamente día + persona + grupo como identidad universal. |
| Intervención / seguimiento | Registro de actuación con autor, participantes, fecha, ámbito y clasificación de acceso. Separar contenido clínico del seguimiento educativo y social. |
| Documento / autorización | Archivo con propietario, categoría, acceso y versión; autorización con alcance, fecha y revocación. |
| Usuario profesional | Cuenta de acceso separada de persona atendida; asignaciones con rol, ámbito y vigencia. Un voluntario no hereda por defecto acceso a toda la entidad. |
| Evento de auditoría | Autor verificable, acción, entidad y fecha del servidor; inmutable para los usuarios de la aplicación, incluido el administrador ordinario. |

Los nombres de colecciones y formatos definitivos deben fijarse en un diccionario
versionado. Los alias castellano/catalán actuales solo se aceptan en adaptadores
de migración, no en cada pantalla nueva.

## Estructura inicial acordada

- Centre de dia: Activitats Lúdiques, Reforç Educatiu, Psicomotricitat, Escola d’Estiu.
- Orientació Laboral.
- Son Roca Activa: Son Roca Connecta, Serralta Connecta.
- Formació: PQI, SAIS.
- Espais Familiars.
- Voluntariat.

Esta clasificación procede de la conversación. La distinción operativa entre
programa y subprograma y los nombres visibles podrán ajustarse sin cambiar IDs.
No inventar actividades, personas, grupos ni cifras de participación reales.

## Permisos propuestos para contrastar con Naum

| Perfil | Acceso de partida |
|---|---|
| Administración técnica | Usuarios, configuración y soporte; acceso al contenido sensible separado y explícito. |
| Dirección | Indicadores generales y coordinación; contenido individual según autorización definida. |
| Coordinación | Programas asignados y sus equipos, inscripciones y seguimiento pertinente. |
| Profesional | Grupos/personas asignados durante la vigencia de la asignación. |
| Voluntariado | Listado mínimo y asistencia del grupo asignado; sin acceso clínico ni económico por defecto. |
| Especialista clínico | Casos clínicos asignados y consentimientos pertinentes. |
| Auditoría / consulta | Evidencias e indicadores autorizados; sin capacidad de modificar actividad asistencial. |

Es una propuesta, no la política actual de Naum. Toda autorización debe
comprobarse en el acceso a datos, no solo al ocultar botones. Probar denegación
por otra área, otro grupo, baja del trabajador, vencimiento y acceso directo.

## Arquitectura y transición

1. Mantener el repositorio original como referencia y una rama de auditoría.
2. Crear una aplicación 2.0 aislada con componentes compartidos, navegación única,
   validación de formularios y una capa única de acceso a datos. Separar interfaz,
   casos de uso, modelos y adaptadores; extraer lógica incrustada en HTML.
3. Usar emuladores y datos sintéticos durante la reconstrucción; conectar a un
   proyecto de pruebas independiente antes del piloto. El proyecto de producción
   actual no será el destino predeterminado de los desarrollos 2.0.
4. Firebase puede evaluarse como infraestructura reutilizable. La auditoría no
   demuestra que sea necesario cambiar de proveedor. La decisión final depende
   de volumen, consultas, informes, coste y capacidades de soporte, aún desconocidos.
5. Canalizar operaciones de privilegio, firmas y auditoría a un componente de
   servidor con validación de autor e idempotencia; imponer reglas restrictivas
   también sobre las operaciones que sigan siendo directas.
6. Evitar cifrado compartido presentado como barrera entre profesionales. Definir
   primero quién puede leer cada clase de dato y cómo se gestionan las claves;
   probar recuperación y revocación antes de migrar campos cifrados.

No fijar aquí versiones de frameworks ni cambiar bases de datos sin una prueba
de un recorrido completo y sus consultas. La elección visual no resuelve los
problemas de autorización o integridad encontrados.

## Orden de trabajo y criterios de salida

| Bloque | Entrega | Se considera terminado cuando… |
|---|---|---|
| 0. Base verificable | Entorno aislado, navegación, arranque y comprobaciones automáticas | Clon limpio arranca; cero errores de sintaxis y dependencias locales faltantes; pruebas sin producción. |
| 1. Identidad y permisos | Inicio de sesión, asignaciones, reglas y trazabilidad | Acceso no autorizado rechazado en servidor; pruebas de otra área, bajas y revocación pasan. |
| 2. Núcleo de personas | Personas, familias, búsqueda y expediente mínimo | Alta/edición se conserva tras recargar; una persona participa en dos programas sin duplicarse; historial verificable. |
| 3. Organización y participación | Árbol, ediciones, actividades, grupos e inscripciones | Ambos Connecta tienen actividades independientes; alta/baja y lista de espera coherentes; escrituras simultáneas no pierden datos. |
| 4. Operativa diaria | Sesiones, asistencia, sustituciones y seguimiento | Dos usuarios no duplican asistencia; corrección deja historial; fallo de red tiene estado visible y reintento seguro. |
| 5. Importación y piloto | Importador validado, comparación y restauración | Simulación muestra errores/duplicados; repetir importación no duplica; se reconcilian totales y se demuestra restauración. |
| 6. Servicios especializados | Laboral, formación, familiar y voluntariado | Cada equipo valida sus campos, documentos e informes con ejemplos reales anonimizados. |
| 7. Módulos complementarios | Administración, calidad, firmas y clínica | Se trasladan solo con autorización específica, cobertura de permisos y proceso validado; firma no permite atribuir acciones a otra cuenta. |

La primera entrega útil de la 2.0 es el recorrido **persona → inscripción → grupo
→ sesión → asistencia**, con el árbol de Naum y permisos reales. Administración
avanzada, clínica, calidad y firma no deben retrasar ni debilitar ese núcleo.
No se da una fecha de finalización sin conocer usuarios, datos y disponibilidad
para validar los procesos.

## Migración desde Excel y el boceto

1. Recibir copias anonimizadas: pestañas, columnas, listas y fórmulas que realmente
   usan los equipos; inventariar quién mantiene cada archivo.
2. Definir correspondencias al modelo; conservar origen, fila y lote de importación.
3. Ejecutar una simulación sin escritura: fechas, campos obligatorios, relaciones,
   candidatos a duplicado y valores desconocidos. Los conflictos se revisan.
4. Importar de forma idempotente y por lotes controlados en pruebas; asociar IDs
   antiguos con IDs nuevos. Mantener un registro de decisiones de fusión.
5. Reconciliar personas únicas, familias, inscripciones y asistencia por separado.
6. Ensayar exportación y restauración antes del cambio; no borrar el origen.
7. Piloto con un programa elegido por Naum; después ampliar por áreas. Evitar
   dos fuentes de escritura indefinidas: acordar el corte de cada conjunto de datos.

## Información aún necesaria

Se puede completar la base y las pruebas sin los Excel. Para cerrar la migración
y el piloto faltan: muestras de datos, responsables de validación de cada área,
roles y ámbitos reales, número de usuarios simultáneos, informes exigidos,
necesidades de acceso móvil y disponibilidad del entorno de pruebas. La auditoría
no sustituye las decisiones de Naum sobre acceso, conservación o autorizaciones.
