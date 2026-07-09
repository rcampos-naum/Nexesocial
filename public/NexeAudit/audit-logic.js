// ============================================================================
// NEXEAUDIT - LOGIC LAYER (audit-logic.js)
// ISO 9001 Compliance Management - Frontend Logic & UI Control
// ============================================================================

import {
    PlanesAuditoríaDB, HallazgosDB, EvidenciasDB, RiesgosDB,
    ControlesDB, AccionesCorrectívasDB, AuditoríaDB, ReportesAuditDB
} from './audit-db.js';
import { auth } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ============================================================================
// ESTADO GLOBAL
// ============================================================================
let usuarioActual = null;
let planesCache = [];
let riesgosCache = [];
let accionesCorrectívasCache = [];

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
export const AuditLogic = {

    async init() {
        console.log('🟠 Inicializando NexeAudit Logic Layer...');
        
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                usuarioActual = user;
                console.log('✅ Auditor autenticado:', user.email);
                await this.cargarDatos();
            } else {
                console.log('❌ No hay usuario autenticado');
                window.location.href = '../index.html';
            }
        });
    },

    async cargarDatos() {
        try {
            planesCache = await PlanesAuditoríaDB.listar();
            riesgosCache = await RiesgosDB.listar();
            accionesCorrectívasCache = await AccionesCorrectívasDB.listar();
            
            console.log(`📋 ${planesCache.length} planes de auditoría cargados`);
            console.log(`⚠️ ${riesgosCache.length} riesgos cargados`);
            console.log(`✓ ${accionesCorrectívasCache.filter(a => a.estado === 'abierta').length} acciones correctivas abiertas`);
        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    },

    // ========================================================================
    // PLANES DE AUDITORÍA
    // ========================================================================

    async crearPlanAuditoría(data) {
        try {
            const planId = await PlanesAuditoríaDB.crear({
                nombre: data.nombre,
                descripción: data.descripción,
                áreaAuditada: data.áreaAuditada,
                auditorAsignado: usuarioActual.uid,
                fechaInicio: data.fechaInicio,
                fechaFin: data.fechaFin,
                objetivos: data.objetivos || [],
                criterios: data.criterios || [],
                alcance: data.alcance || 'Total'
            });

            await AuditoríaDB.registrar(
                'CREAR_PLAN_AUDITORÍA',
                `Plan de auditoría creado: ${planId}`,
                usuarioActual.uid
            );

            console.log('✅ Plan de auditoría creado:', planId);
            return planId;
        } catch (error) {
            console.error('Error creando plan:', error);
            alert('Error al crear plan de auditoría: ' + error.message);
        }
    },

    async actualizarPlan(planId, data) {
        try {
            await PlanesAuditoríaDB.actualizar(planId, data);

            await AuditoríaDB.registrar(
                'ACTUALIZAR_PLAN',
                `Plan actualizado: ${planId}`,
                usuarioActual.uid
            );

            console.log('✅ Plan actualizado:', planId);
        } catch (error) {
            console.error('Error actualizando plan:', error);
        }
    },

    async cambiarEstadoPlan(planId, nuevoEstado) {
        try {
            await PlanesAuditoríaDB.actualizar(planId, { estado: nuevoEstado });

            await AuditoríaDB.registrar(
                'ESTADO_PLAN',
                `Estado del plan cambiado a: ${nuevoEstado}`,
                usuarioActual.uid
            );

            console.log('✅ Estado del plan actualizado:', nuevoEstado);
        } catch (error) {
            console.error('Error cambiando estado:', error);
        }
    },

    // ========================================================================
    // HALLAZGOS (Findings)
    // ========================================================================

    async registrarHallazgo(planId, data) {
        try {
            const hallazgoId = await HallazgosDB.crear(planId, {
                descripción: data.descripción,
                severidad: data.severidad,
                normaAplicable: data.normaAplicable || 'ISO 9001:2015',
                accionCorrectiva: data.accionCorrectiva,
                responsable: data.responsable,
                fechaVencimiento: data.fechaVencimiento
            });

            await AuditoríaDB.registrar(
                'REGISTRAR_HALLAZGO',
                `Hallazgo registrado en plan ${planId}: ${hallazgoId}`,
                usuarioActual.uid
            );

            console.log('✅ Hallazgo registrado:', hallazgoId);
            return hallazgoId;
        } catch (error) {
            console.error('Error registrando hallazgo:', error);
            alert('Error al registrar hallazgo: ' + error.message);
        }
    },

    async actualizarHallazgo(planId, hallazgoId, data) {
        try {
            await HallazgosDB.actualizar(planId, hallazgoId, data);

            await AuditoríaDB.registrar(
                'ACTUALIZAR_HALLAZGO',
                `Hallazgo actualizado: ${hallazgoId}`,
                usuarioActual.uid
            );

            console.log('✅ Hallazgo actualizado:', hallazgoId);
        } catch (error) {
            console.error('Error actualizando hallazgo:', error);
        }
    },

    async cerrarHallazgo(planId, hallazgoId) {
        try {
            await HallazgosDB.actualizar(planId, hallazgoId, { 
                estado: 'cerrado',
                fechaCierre: new Date()
            });

            await AuditoríaDB.registrar(
                'CERRAR_HALLAZGO',
                `Hallazgo cerrado: ${hallazgoId}`,
                usuarioActual.uid
            );

            console.log('✅ Hallazgo cerrado:', hallazgoId);
        } catch (error) {
            console.error('Error cerrando hallazgo:', error);
        }
    },

    // ========================================================================
    // EVIDENCIAS
    // ========================================================================

    async adjuntarEvidencia(planId, hallazgoId, data) {
        try {
            const evidenciaId = await EvidenciasDB.crear(planId, hallazgoId, {
                descripción: data.descripción,
                tipo: data.tipo,
                referencia: data.referencia,
                fotoPrueba: data.fotoPrueba || null
            });

            await AuditoríaDB.registrar(
                'ADJUNTAR_EVIDENCIA',
                `Evidencia adjuntada: ${evidenciaId}`,
                usuarioActual.uid
            );

            console.log('✅ Evidencia registrada:', evidenciaId);
            return evidenciaId;
        } catch (error) {
            console.error('Error adjuntando evidencia:', error);
            alert('Error al adjuntar evidencia: ' + error.message);
        }
    },

    // ========================================================================
    // GESTIÓN DE RIESGOS (ISO 31000)
    // ========================================================================

    async identificarRiesgo(data) {
        try {
            const riesgoId = await RiesgosDB.crear({
                descripción: data.descripción,
                categoría: data.categoría || 'Operacional',
                causaRaíz: data.causaRaíz || '',
                probabilidad: data.probabilidad,
                impacto: data.impacto,
                propietarioRiesgo: data.propietarioRiesgo || usuarioActual.uid,
                estrategiaControl: data.estrategiaControl,
                medidasMitigación: data.medidasMitigación || []
            });

            await AuditoríaDB.registrar(
                'IDENTIFICAR_RIESGO',
                `Riesgo identificado: ${riesgoId}`,
                usuarioActual.uid
            );

            console.log('✅ Riesgo identificado:', riesgoId);
            return riesgoId;
        } catch (error) {
            console.error('Error identificando riesgo:', error);
            alert('Error al identificar riesgo: ' + error.message);
        }
    },

    async actualizarRiesgo(riesgoId, data) {
        try {
            await RiesgosDB.actualizar(riesgoId, data);

            await AuditoríaDB.registrar(
                'ACTUALIZAR_RIESGO',
                `Riesgo actualizado: ${riesgoId}`,
                usuarioActual.uid
            );

            console.log('✅ Riesgo actualizado:', riesgoId);
        } catch (error) {
            console.error('Error actualizando riesgo:', error);
        }
    },

    async mitigarRiesgo(riesgoId, medida) {
        try {
            await RiesgosDB.actualizar(riesgoId, { 
                estadoMitigación: 'implementando',
                medidasMitigación: [medida]
            });

            await AuditoríaDB.registrar(
                'MITIGAR_RIESGO',
                `Medida de mitigación implementada: ${riesgoId}`,
                usuarioActual.uid
            );

            console.log('✅ Medida de mitigación registrada');
        } catch (error) {
            console.error('Error mitigando riesgo:', error);
        }
    },

    // ========================================================================
    // CONTROLES ISO 9001
    // ========================================================================

    async registrarControl(data) {
        try {
            const controlId = await ControlesDB.crear({
                nombre: data.nombre,
                descripción: data.descripción,
                tipoControl: data.tipoControl,
                frecuenciaVerificación: data.frecuenciaVerificación,
                responsable: data.responsable || usuarioActual.uid,
                procedimientoVerificación: data.procedimientoVerificación || '',
                criterioAceptación: data.criterioAceptación || ''
            });

            await AuditoríaDB.registrar(
                'REGISTRAR_CONTROL',
                `Control ISO 9001 registrado: ${controlId}`,
                usuarioActual.uid
            );

            console.log('✅ Control registrado:', controlId);
            return controlId;
        } catch (error) {
            console.error('Error registrando control:', error);
        }
    },

    async verificarControl(controlId, resultado) {
        try {
            await ControlesDB.actualizarVerificación(controlId, resultado);

            await AuditoríaDB.registrar(
                'VERIFICAR_CONTROL',
                `Control verificado con resultado: ${resultado}`,
                usuarioActual.uid
            );

            console.log('✅ Verificación de control registrada:', resultado);
        } catch (error) {
            console.error('Error verificando control:', error);
        }
    },

    // ========================================================================
    // ACCIONES CORRECTIVAS
    // ========================================================================

    async crear AcciónCorrectiva(hallazgoId, data) {
        try {
            const acciónId = await AccionesCorrectívasDB.crear({
                hallazgoOrigen: hallazgoId,
                descripción: data.descripción,
                causaRaíz: data.causaRaíz,
                responsableImplementación: data.responsableImplementación || usuarioActual.uid,
                fechaVencimiento: data.fechaVencimiento,
                recursosNecesarios: data.recursosNecesarios || []
            });

            await AuditoríaDB.registrar(
                'CREAR_ACCIÓN_CORRECTIVA',
                `Acción correctiva creada: ${acciónId}`,
                usuarioActual.uid
            );

            console.log('✅ Acción correctiva creada:', acciónId);
            return acciónId;
        } catch (error) {
            console.error('Error creando acción correctiva:', error);
            alert('Error al crear acción correctiva: ' + error.message);
        }
    },

    async cerrarAcciónCorrectiva(acciónId, evidencia) {
        try {
            await AccionesCorrectívasDB.cerrar(acciónId, evidencia);

            await AuditoríaDB.registrar(
                'CERRAR_ACCIÓN_CORRECTIVA',
                `Acción correctiva cerrada: ${acciónId}`,
                usuarioActual.uid
            );

            console.log('✅ Acción correctiva cerrada:', acciónId);
        } catch (error) {
            console.error('Error cerrando acción correctiva:', error);
        }
    },

    // ========================================================================
    // REPORTERIA
    // ========================================================================

    async generarReporteSituación() {
        try {
            const reporte = await ReportesAuditDB.generarReporteSituación();
            
            if (reporte) {
                console.log('✅ Reporte de situación generado:', reporte);
                return reporte;
            }
        } catch (error) {
            console.error('Error generando reporte:', error);
            alert('Error al generar reporte: ' + error.message);
        }
    },

    async exportarSituaciónISO() {
        try {
            const datos = await ReportesAuditDB.exportarSituaciónISO();
            
            const element = document.createElement('a');
            const file = new Blob([datos], { type: 'application/json' });
            
            element.href = URL.createObjectURL(file);
            element.download = `reporte-iso-9001_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            await AuditoríaDB.registrar(
                'EXPORTAR_REPORTE',
                'Reporte ISO 9001 exportado',
                usuarioActual.uid
            );

            console.log('✅ Reporte exportado');
        } catch (error) {
            console.error('Error exportando reporte:', error);
            alert('Error al exportar: ' + error.message);
        }
    },

    // ========================================================================
    // FUNCIONALIDADES DE CACHE Y FILTRADO
    // ========================================================================

    getPlanesEnCache() {
        return planesCache;
    },

    getRiesgosEnCache() {
        return riesgosCache;
    },

    getAccionesCorrectívasAbiertas() {
        return accionesCorrectívasCache.filter(a => a.estado === 'abierta');
    },

    getRiesgosAltos() {
        return riesgosCache.filter(r => r.nivel === 'alto' || r.nivel === 'crítico');
    },

    // ========================================================================
    // SINCRONIZACIÓN EN TIEMPO REAL
    // ========================================================================

    async sincronizar() {
        try {
            await this.cargarDatos();
            window.dispatchEvent(new CustomEvent('dataSincronizadoAudit', {
                detail: { planes: planesCache, riesgos: riesgosCache }
            }));
            console.log('✅ Datos de auditoría sincronizados');
        } catch (error) {
            console.error('Error sincronizando:', error);
        }
    },

    // ========================================================================
    // CERRAR SESIÓN
    // ========================================================================

    async logout() {
        try {
            await auth.signOut();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error cerrando sesión:', error);
        }
    }
};

export default AuditLogic;

// Global access for HTML onclick handlers
window.AuditLogic = AuditLogic;
