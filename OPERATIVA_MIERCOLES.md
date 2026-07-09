# NexeSocial - Arranque Operativo Miercoles

Este documento no es de demo. Sirve para iniciar uso real interno con seguridad y trazabilidad desde el miercoles.

## 1) Arranque tecnico (obligatorio)

1. Ejecutar chequeo integral:
   - `npm run ops:preflight`
2. Resultado esperado:
   - `OPERATIVE RESULT: READY FOR INTERNAL WORK`
3. Si no pasa:
   - No iniciar trabajo operativo hasta resolver el bloque fallido.

## 2) Apertura de entorno de trabajo

1. Abrir flujo base de trabajo:
   - `npm run ops:start`
2. Iniciar sesion con usuario real por rol (no usuario de prueba).
3. Verificar que cada rol solo ve lo que le corresponde.

## 3) Flujo minimo de validacion funcional (primer dia)

1. Family/Expedient
   - Abrir una familia real autorizada.
   - Guardar un cambio seguro no destructivo.
   - Recargar y validar persistencia.
2. Firma
   - Ejecutar una firma completa (QR movil o firma en pantalla).
   - Verificar estado final firmado en el modulo origen.
3. Recepcion/Citas
   - Buscar por localizador.
   - Marcar `arribat` y confirmar.

## 4) Reglas operativas para trabajar desde ya

1. No editar reglas de seguridad sin doble validacion.
2. No desplegar archivos temporales de pruebas.
3. Registrar incidencias reales con modulo, rol, hora y pasos de reproduccion.
4. Priorizar adaptaciones funcionales con impacto diario:
   - formularios, trazabilidad de firma, recepcion y permisos por rol.

## 5) Comandos oficiales desde miercoles

1. `npm run ops:readiness`
2. `npm run ops:routes`
3. `npm run ops:preflight`
4. `npm run ops:start`

## 6) Objetivo de esta fase

Usar esta base para trabajo interno real y cerrar ajustes de adaptacion sobre funcionamiento de la entidad durante la siguiente iteracion.

## 7) Gestion de incidencias (obligatorio desde el dia 1)

1. Protocolo oficial:
   - `OPERATIVA_INCIDENCIAS.md`
2. Resumen rapido (1 pagina):
   - `OPERATIVA_INCIDENCIAS_1_PAGINA.md`
3. Plantilla unica de reporte:
   - `INCIDENCIA_PLANTILLA.md`
4. Regla operativa:
   - Ninguna incidencia se considera cerrada sin validacion final y causa raiz documentada.
