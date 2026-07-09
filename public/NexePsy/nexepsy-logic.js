// ============================================================================
// NEXEPSY - LOGIC LAYER (nexepsy-logic.js)
// Frontend Application Logic & UI Control
// ============================================================================

import { 
    IntervencionesDB, SesionesDB, PacientesDB, ReportesDB, 
    AuditoriaNexePsyDB 
} from './nexepsy-db.js';
import { auth } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ============================================================================
// ESTADO GLOBAL & VARIABLES
// ============================================================================
let usuarioActual = null;
let intervencionesCache = [];
let pacientesCache = [];
let sesionesCache = [];

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
export const AdminPsychologyLogic = {

    async init() {
        console.log('🟣 Inicializando NexePsy Logic Layer...');
        
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                usuarioActual = user;
                console.log('✅ Usuario autenticado:', user.email);
                await this.cargarDatosIniciales();
            } else {
                console.log('❌ No hay usuario autenticado');
                window.location.href = '../index.html';
            }
        });
    },

    async cargarDatosIniciales() {
        try {
            intervencionesCache = await IntervencionesDB.listar();
            pacientesCache = await PacientesDB.listar(true);
            console.log(`📊 ${intervencionesCache.length} intervenciones cargadas`);
            console.log(`👥 ${pacientesCache.length} pacientes cargados`);
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
        }
    },

    // ========================================================================
    // GESTIÓN DE INTERVENCIONES
    // ========================================================================

    async crearIntervención(data) {
        try {
            const result = await IntervencionesDB.crear({
                pacienteId: data.pacienteId,
                pacienteNombre: data.pacienteNombre,
                diagnóstico: data.diagnóstico,
                terapeutaId: usuarioActual.uid,
                terapeutaNombre: usuarioActual.displayName || usuarioActual.email,
                descripción: data.descripción,
                sesionesPlaneadas: parseInt(data.sesionesPlaneadas) || 0,
                objetivos: data.objetivos || [],
                notas: data.notas || ''
            });
            const intervenciónId = result?.id || result;
            const numExpedient = result?.numExpedient || '';

            await AuditoriaNexePsyDB.registrar(
                'CREATE_INTERVENCIÓN',
                `Nueva intervención creada: ${numExpedient || intervenciónId}`,
                usuarioActual.uid
            );

            console.log('✅ Intervención creada:', numExpedient || intervenciónId);
            return result;
        } catch (error) {
            console.error('Error creando intervención:', error);
            alert('Error al crear intervención: ' + error.message);
        }
    },

    async actualizarIntervención(intervenciónId, data) {
        try {
            await IntervencionesDB.actualizar(intervenciónId, data);

            await AuditoriaNexePsyDB.registrar(
                'UPDATE_INTERVENCIÓN',
                `Intervención actualizada: ${intervenciónId}`,
                usuarioActual.uid
            );

            console.log('✅ Intervención actualizada:', intervenciónId);
        } catch (error) {
            console.error('Error actualizando intervención:', error);
            alert('Error al actualizar intervención: ' + error.message);
        }
    },

    async eliminarIntervención(intervenciónId) {
        if (!confirm('¿Estás seguro de eliminar esta intervención? Esta acción es irreversible.')) {
            return;
        }

        try {
            await IntervencionesDB.eliminar(intervenciónId);

            await AuditoriaNexePsyDB.registrar(
                'DELETE_INTERVENCIÓN',
                `Intervención eliminada: ${intervenciónId}`,
                usuarioActual.uid
            );

            console.log('✅ Intervención eliminada:', intervenciónId);
            intervencionesCache = intervencionesCache.filter(i => i.id !== intervenciónId);
        } catch (error) {
            console.error('Error eliminando intervención:', error);
            alert('Error al eliminar intervención: ' + error.message);
        }
    },

    async cambiarEstadoIntervención(intervenciónId, nuevoEstado) {
        try {
            await IntervencionesDB.cambiarEstado(intervenciónId, nuevoEstado);

            await AuditoriaNexePsyDB.registrar(
                'ESTADO_INTERVENCIÓN',
                `Estado de intervención cambiado a: ${nuevoEstado}`,
                usuarioActual.uid
            );

            console.log('✅ Estado actualizado:', nuevoEstado);
            const intervención = intervencionesCache.find(i => i.id === intervenciónId);
            if (intervención) intervención.estado = nuevoEstado;
        } catch (error) {
            console.error('Error actualizando estado:', error);
        }
    },

    // ========================================================================
    // GESTIÓN DE SESIONES
    // ========================================================================

    async crearSesión(intervenciónId, data) {
        try {
            const sesiónId = await SesionesDB.crear(intervenciónId, {
                fechaSesión: data.fechaSesión,
                duración: parseInt(data.duración) || 60,
                tema: data.tema,
                notas: data.notas || '',
                terapeutaNombre: usuarioActual.displayName || usuarioActual.email,
                estado: 'completada'
            });

            await AuditoriaNexePsyDB.registrar(
                'CREATE_SESIÓN',
                `Nueva sesión en intervención ${intervenciónId}`,
                usuarioActual.uid
            );

            console.log('✅ Sesión registrada:', sesiónId);
            return sesiónId;
        } catch (error) {
            console.error('Error creando sesión:', error);
            alert('Error al crear sesión: ' + error.message);
        }
    },

    async actualizar Sesión(intervenciónId, sesiónId, data) {
        try {
            await SesionesDB.actualizar(intervenciónId, sesiónId, data);

            await AuditoriaNexePsyDB.registrar(
                'UPDATE_SESIÓN',
                `Sesión actualizada: ${sesiónId}`,
                usuarioActual.uid
            );

            console.log('✅ Sesión actualizada:', sesiónId);
        } catch (error) {
            console.error('Error actualizando sesión:', error);
        }
    },

    async eliminarSesión(intervenciónId, sesiónId) {
        if (!confirm('¿Estás seguro de eliminar esta sesión?')) {
            return;
        }

        try {
            await SesionesDB.eliminar(intervenciónId, sesiónId);

            await AuditoriaNexePsyDB.registrar(
                'DELETE_SESIÓN',
                `Sesión eliminada: ${sesiónId}`,
                usuarioActual.uid
            );

            console.log('✅ Sesión eliminada:', sesiónId);
        } catch (error) {
            console.error('Error eliminando sesión:', error);
        }
    },

    async listarSesionesPorIntervención(intervenciónId) {
        try {
            const sesiones = await SesionesDB.listarPorIntervención(intervenciónId);
            return sesiones;
        } catch (error) {
            console.error('Error listando sesiones:', error);
            return [];
        }
    },

    // ========================================================================
    // GESTIÓN DE PACIENTES
    // ========================================================================

    async crearPaciente(data) {
        try {
            const pacienteId = await PacientesDB.crear({
                nombre: data.nombre,
                apellidos: data.apellidos,
                dni: data.dni,
                fechaNacimiento: data.fechaNacimiento,
                género: data.género,
                teléfono: data.teléfono,
                email: data.email,
                dirección: data.dirección,
                notas: data.notas || ''
            });

            await AuditoriaNexePsyDB.registrar(
                'CREATE_PACIENTE',
                `Nuevo paciente registrado: ${pacienteId}`,
                usuarioActual.uid
            );

            console.log('✅ Paciente creado:', pacienteId);
            return pacienteId;
        } catch (error) {
            console.error('Error creando paciente:', error);
            alert('Error al crear paciente: ' + error.message);
        }
    },

    async actualizarPaciente(pacienteId, data) {
        try {
            await PacientesDB.actualizar(pacienteId, data);

            await AuditoriaNexePsyDB.registrar(
                'UPDATE_PACIENTE',
                `Paciente actualizado: ${pacienteId}`,
                usuarioActual.uid
            );

            console.log('✅ Paciente actualizado:', pacienteId);
        } catch (error) {
            console.error('Error actualizando paciente:', error);
        }
    },

    async eliminarPaciente(pacienteId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este paciente? Esta acción es irreversible.')) {
            return;
        }

        try {
            await PacientesDB.eliminar(pacienteId);

            await AuditoriaNexePsyDB.registrar(
                'DELETE_PACIENTE',
                `Paciente eliminado: ${pacienteId}`,
                usuarioActual.uid
            );

            console.log('✅ Paciente eliminado:', pacienteId);
            pacientesCache = pacientesCache.filter(p => p.id !== pacienteId);
        } catch (error) {
            console.error('Error eliminando paciente:', error);
        }
    },

    async buscarPaciente(término) {
        try {
            return await PacientesDB.buscar(término);
        } catch (error) {
            console.error('Error buscando paciente:', error);
            return [];
        }
    },

    // ========================================================================
    // REPORTES & ESTADÍSTICAS
    // ========================================================================

    async generarReporteEstadístico(startDate, endDate) {
        try {
            const estadísticas = await ReportesDB.obtenerEstadísticas(startDate, endDate);

            const reporteId = await ReportesDB.crearReporte({
                tipo: 'estadístico',
                fechaInicio: startDate,
                fechaFin: endDate,
                datos: estadísticas
            });

            console.log('✅ Reporte generado:', reporteId);
            return estadísticas;
        } catch (error) {
            console.error('Error generando reporte:', error);
            alert('Error al generar reporte: ' + error.message);
        }
    },

    async exportarIntervenciones(formato = 'json') {
        try {
            const datos = await ReportesDB.exportarDatos(formato);
            
            const element = document.createElement('a');
            const file = new Blob([datos], { 
                type: formato === 'csv' ? 'text/csv' : 'application/json' 
            });
            
            element.href = URL.createObjectURL(file);
            element.download = `intervenciones_${new Date().toISOString().split('T')[0]}.${formato}`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            await AuditoriaNexePsyDB.registrar(
                'EXPORT_INTERVENCIONES',
                `Exportación de intervenciones en formato ${formato}`,
                usuarioActual.uid
            );

            console.log('✅ Datos exportados en formato:', formato);
        } catch (error) {
            console.error('Error exportando datos:', error);
            alert('Error al exportar datos: ' + error.message);
        }
    },

    // ========================================================================
    // FUNCIONES UI HELPER
    // ========================================================================

    getIntervencionesEnCache() {
        return intervencionesCache;
    },

    getPacientesEnCache() {
        return pacientesCache;
    },

    obtenerIntervenciónPorId(id) {
        return intervencionesCache.find(i => i.id === id);
    },

    obtenerPacientePorId(id) {
        return pacientesCache.find(p => p.id === id);
    },

    filtrarIntervencionesPorEstado(estado) {
        return intervencionesCache.filter(i => i.estado === estado);
    },

    filtrarIntervencionesPorDiagnóstico(diagnóstico) {
        return intervencionesCache.filter(i => i.diagnóstico === diagnóstico);
    },

    // ========================================================================
    // SINCRONIZACIÓN EN TIEMPO REAL
    // ========================================================================

    async sincronizar() {
        try {
            intervencionesCache = await IntervencionesDB.listar();
            pacientesCache = await PacientesDB.listar(true);
            window.dispatchEvent(new CustomEvent('dataSincronizado', { 
                detail: { intervenciones: intervencionesCache, pacientes: pacientesCache } 
            }));
            console.log('✅ Datos sincronizados');
        } catch (error) {
            console.error('Error sincronizando datos:', error);
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

// Auto-initialize when module loads
export default AdminPsychologyLogic;

// Global access for HTML onclick handlers
window.AdminPsychologyLogic = AdminPsychologyLogic;
