// ============================================================================
// NEXEAUDIT - DATABASE LAYER (audit-db.js)
// Quality Management & ISO 9001 Compliance - Data Access Layer
// ============================================================================

import { db, auth } from '../firebase-config.js';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc,
    query, where, orderBy, limit, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ============================================================================
// PLANES DE AUDITORÍA (Audit Plans)
// ============================================================================
export const PlanesAuditoríaDB = {

    async crear(plan) {
        const docRef = await addDoc(collection(db, 'nexeaudit/planesAuditoria/planes'), {
            ...plan,
            fechaCreación: Timestamp.now(),
            estado: 'planificado',
            auditorAsignado: plan.auditorAsignado || null,
            fechaInicio: plan.fechaInicio ? Timestamp.fromDate(new Date(plan.fechaInicio)) : null,
            fechaFin: plan.fechaFin ? Timestamp.fromDate(new Date(plan.fechaFin)) : null,
            áreaAuditada: plan.áreaAuditada || 'General',
            objetivos: plan.objetivos || [],
            criterios: plan.criterios || []
        });
        return docRef.id;
    },

    async obtener(planId) {
        const docRef = doc(db, 'nexeaudit/planesAuditoria/planes', planId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async actualizar(planId, data) {
        const docRef = doc(db, 'nexeaudit/planesAuditoria/planes', planId);
        await updateDoc(docRef, {
            ...data,
            ultimaActualización: Timestamp.now()
        });
    },

    async eliminar(planId) {
        const docRef = doc(db, 'nexeaudit/planesAuditoria/planes', planId);
        await deleteDoc(docRef);
    },

    async listar(estado = null) {
        let q;
        if (estado) {
            q = query(
                collection(db, 'nexeaudit/planesAuditoria/planes'),
                where('estado', '==', estado),
                orderBy('fechaInicio', 'desc')
            );
        } else {
            q = query(
                collection(db, 'nexeaudit/planesAuditoria/planes'),
                orderBy('fechaInicio', 'desc')
            );
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async obtenerPorAuditoria(auditorId) {
        const q = query(
            collection(db, 'nexeaudit/planesAuditoria/planes'),
            where('auditorAsignado', '==', auditorId),
            orderBy('fechaInicio', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// ============================================================================
// HALLAZGOS (Audit Findings)
// ============================================================================
export const HallazgosDB = {

    async crear(planId, hallazgo) {
        const docRef = await addDoc(
            collection(db, `nexeaudit/planesAuditoria/${planId}/hallazgos`),
            {
                ...hallazgo,
                fechaRegistro: Timestamp.now(),
                estado: 'abierto',
                severidad: hallazgo.severidad || 'média',
                descripción: hallazgo.descripción,
                accionCorrectiva: hallazgo.accionCorrectiva || '',
                responsable: hallazgo.responsable || null,
                fechaVencimiento: hallazgo.fechaVencimiento ? Timestamp.fromDate(new Date(hallazgo.fechaVencimiento)) : null
            }
        );
        return docRef.id;
    },

    async obtener(planId, hallazgoId) {
        const docRef = doc(db, `nexeaudit/planesAuditoria/${planId}/hallazgos`, hallazgoId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async actualizar(planId, hallazgoId, data) {
        const docRef = doc(db, `nexeaudit/planesAuditoria/${planId}/hallazgos`, hallazgoId);
        await updateDoc(docRef, {
            ...data,
            ultimaActualización: Timestamp.now()
        });
    },

    async eliminar(planId, hallazgoId) {
        const docRef = doc(db, `nexeaudit/planesAuditoria/${planId}/hallazgos`, hallazgoId);
        await deleteDoc(docRef);
    },

    async listarPorPlan(planId, estado = null) {
        let q;
        if (estado) {
            q = query(
                collection(db, `nexeaudit/planesAuditoria/${planId}/hallazgos`),
                where('estado', '==', estado),
                orderBy('fechaRegistro', 'desc')
            );
        } else {
            q = query(
                collection(db, `nexeaudit/planesAuditoria/${planId}/hallazgos`),
                orderBy('fechaRegistro', 'desc')
            );
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async obtenerPorSeveridad(planId, severidad) {
        const q = query(
            collection(db, `nexeaudit/planesAuditoria/${planId}/hallazgos`),
            where('severidad', '==', severidad),
            orderBy('fechaRegistro', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// ============================================================================
// EVIDENCIAS (Audit Evidence)
// ============================================================================
export const EvidenciasDB = {

    async crear(planId, hallazgoId, evidencia) {
        const docRef = await addDoc(
            collection(db, `nexeaudit/planesAuditoria/${planId}/hallazgos/${hallazgoId}/evidencias`),
            {
                ...evidencia,
                fechaDocumentación: Timestamp.now(),
                tipo: evidencia.tipo || 'documento',
                descripción: evidencia.descripción,
                referencia: evidencia.referencia || '',
                fotoPrueba: evidencia.fotoPrueba || null
            }
        );
        return docRef.id;
    },

    async listarPorHallazgo(planId, hallazgoId) {
        const q = query(
            collection(db, `nexeaudit/planesAuditoria/${planId}/hallazgos/${hallazgoId}/evidencias`),
            orderBy('fechaDocumentación', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async eliminar(planId, hallazgoId, evidenciaId) {
        const docRef = doc(db, `nexeaudit/planesAuditoria/${planId}/hallazgos/${hallazgoId}/evidencias`, evidenciaId);
        await deleteDoc(docRef);
    }
};

// ============================================================================
// RIESGOS (Risk Register - ISO 31000)
// ============================================================================
export const RiesgosDB = {

    async crear(riesgo) {
        const docRef = await addDoc(collection(db, 'nexeaudit/riesgos/registro'), {
            ...riesgo,
            fechaIdentificación: Timestamp.now(),
            estado: 'activo',
            probabilidad: riesgo.probabilidad || 'media',
            impacto: riesgo.impacto || 'media',
            nivel: this._calcularNivel(riesgo.probabilidad, riesgo.impacto),
            propietarioRiesgo: riesgo.propietarioRiesgo || null,
            estrategiaControl: riesgo.estrategiaControl || 'mitigación',
            estadoMitigación: riesgo.estadoMitigación || 'planificado'
        });
        return docRef.id;
    },

    async obtener(riesgoId) {
        const docRef = doc(db, 'nexeaudit/riesgos/registro', riesgoId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async actualizar(riesgoId, data) {
        const docRef = doc(db, 'nexeaudit/riesgos/registro', riesgoId);
        await updateDoc(docRef, {
            ...data,
            nivel: this._calcularNivel(data.probabilidad, data.impacto),
            ultimaActualización: Timestamp.now()
        });
    },

    async eliminar(riesgoId) {
        const docRef = doc(db, 'nexeaudit/riesgos/registro', riesgoId);
        await deleteDoc(docRef);
    },

    async listar(estado = null) {
        let q;
        if (estado) {
            q = query(
                collection(db, 'nexeaudit/riesgos/registro'),
                where('estado', '==', estado),
                orderBy('nivel', 'desc')
            );
        } else {
            q = query(
                collection(db, 'nexeaudit/riesgos/registro'),
                orderBy('nivel', 'desc')
            );
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async listarPorNivel(nivel) {
        const q = query(
            collection(db, 'nexeaudit/riesgos/registro'),
            where('nivel', '==', nivel),
            orderBy('fechaIdentificación', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    _calcularNivel(probabilidad, impacto) {
        const matriz = {
            'baja': { 'baja': 'bajo', 'media': 'bajo', 'alta': 'medio' },
            'media': { 'baja': 'bajo', 'media': 'medio', 'alta': 'alto' },
            'alta': { 'baja': 'medio', 'media': 'alto', 'alta': 'crítico' }
        };
        return matriz[probabilidad]?.[impacto] || 'medio';
    }
};

// ============================================================================
// CONTROLES (ISO 9001 Controls)
// ============================================================================
export const ControlesDB = {

    async crear(control) {
        const docRef = await addDoc(collection(db, 'nexeaudit/controles/control'), {
            ...control,
            fechaImplementación: Timestamp.now(),
            estado: 'activo',
            tipoControl: control.tipoControl || 'preventivo',
            frecuenciaVerificación: control.frecuenciaVerificación || 'mensual',
            responsable: control.responsable || null,
            úlitmaVerificación: null
        });
        return docRef.id;
    },

    async listar(estado = null) {
        let q;
        if (estado) {
            q = query(
                collection(db, 'nexeaudit/controles/control'),
                where('estado', '==', estado),
                orderBy('fechaImplementación', 'desc')
            );
        } else {
            q = query(
                collection(db, 'nexeaudit/controles/control'),
                orderBy('fechaImplementación', 'desc')
            );
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async actualizarVerificación(controlId, resultadoVerificación) {
        const docRef = doc(db, 'nexeaudit/controles/control', controlId);
        await updateDoc(docRef, {
            últimaVerificación: Timestamp.now(),
            resultadoÚltima: resultadoVerificación
        });
    }
};

// ============================================================================
// SEGUIMIENTO DE ACCIONES CORRECTIVAS
// ============================================================================
export const AccionesCorrectívasDB = {

    async crear(acción) {
        const docRef = await addDoc(collection(db, 'nexeaudit/accionesCorrectivas/acciones'), {
            ...acción,
            fechaApertura: Timestamp.now(),
            estado: 'abierta',
            hallazgoOrigen: acción.hallazgoOrigen,
            descripción: acción.descripción,
            responsableImplementación: acción.responsableImplementación || null,
            fechaVencimiento: acción.fechaVencimiento ? Timestamp.fromDate(new Date(acción.fechaVencimiento)) : null,
            fechaCierre: null,
            evidenciaImplementación: null
        });
        return docRef.id;
    },

    async cerrar(acciónId, evidencia) {
        const docRef = doc(db, 'nexeaudit/accionesCorrectivas/acciones', acciónId);
        await updateDoc(docRef, {
            estado: 'cerrada',
            fechaCierre: Timestamp.now(),
            evidenciaImplementación: evidencia
        });
    },

    async listar(estado = null) {
        let q;
        if (estado) {
            q = query(
                collection(db, 'nexeaudit/accionesCorrectivas/acciones'),
                where('estado', '==', estado),
                orderBy('fechaApertura', 'desc')
            );
        } else {
            q = query(
                collection(db, 'nexeaudit/accionesCorrectivas/acciones'),
                orderBy('fechaApertura', 'desc')
            );
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// ============================================================================
// AUDITORÍA LOG (Immutable Audit Trail)
// ============================================================================
export const AuditoríaDB = {

    async registrar(acción, detalles, usuarioId, módulo = 'NexeAudit') {
        await addDoc(collection(db, 'nexeaudit/auditoria/logs'), {
            acción,
            detalles,
            usuarioId,
            módulo,
            timestamp: Timestamp.now(),
            ipAddress: 'N/A',
            navegador: navigator.userAgent
        });
    },

    async obtenerLogs(límite = 100) {
        const q = query(
            collection(db, 'nexeaudit/auditoria/logs'),
            orderBy('timestamp', 'desc'),
            limit(límite)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// ============================================================================
// REPORTES ISO 9001
// ============================================================================
export const ReportesAuditDB = {

    async generarReporteSituación() {
        try {
            const planes = await PlanesAuditoríaDB.listar();
            const riesgos = await RiesgosDB.listar();
            const hallazgos_total = [];

            for (const plan of planes) {
                const hallazgos = await HallazgosDB.listarPorPlan(plan.id);
                hallazgos_total.push(...hallazgos);
            }

            return {
                fechaGeneración: new Date(),
                planesActivos: planes.filter(p => p.estado === 'en_ejecución').length,
                hallazgosAbiertos: hallazgos_total.filter(h => h.estado === 'abierto').length,
                riesgosAltos: riesgos.filter(r => r.nivel === 'alto' || r.nivel === 'crítico').length,
                cumplimiento_estimado: this._calcularCumplimiento(hallazgos_total, riesgos)
            };
        } catch (error) {
            console.error('Error generando reporte:', error);
            return null;
        }
    },

    _calcularCumplimiento(hallazgos, riesgos) {
        // Fórmula simplificada: (Hallazgos cerrados / Total) * 100
        const cerrados = hallazgos.filter(h => h.estado === 'cerrado').length;
        const total = hallazgos.length || 1;
        return Math.round((cerrados / total) * 100);
    },

    async exportarSituaciónISO() {
        const reporte = await this.generarReporteSituación();
        return JSON.stringify(reporte, null, 2);
    }
};

export default {
    PlanesAuditoríaDB,
    HallazgosDB,
    EvidenciasDB,
    RiesgosDB,
    ControlesDB,
    AccionesCorrectívasDB,
    AuditoríaDB,
    ReportesAuditDB
};
