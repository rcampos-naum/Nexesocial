// ============================================================================
// NEXEPSY - DATABASE LAYER (nexepsy-db.js)
// Psychological Services Management - Data Access Layer
// ============================================================================

import { db, auth } from '../firebase-config.js';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc,
    query, where, orderBy, limit, startAfter, Timestamp, writeBatch,
    runTransaction, setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ============================================================================
// NUMERACIÓ D'EXPEDIENTS PSICOSOCIALS  PS{any}-###
// El número correlativo MAI es reinicia, independentment de l'any
// ============================================================================
async function generarNumeroExpedient() {
    const counterRef = doc(db, 'nexepsy/config/contadors', 'expedients');
    let nouNumero;
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        nouNumero = snap.exists() ? (snap.data().ultim || 0) + 1 : 1;
        tx.set(counterRef, { ultim: nouNumero }, { merge: true });
    });
    const any = new Date().getFullYear();
    return `PS${any}-${String(nouNumero).padStart(3, '0')}`;
}

// ============================================================================
// INTERVENCIONES (Psychology Interventions/Cases)
// ============================================================================
export const IntervencionesDB = {
    
    async crear(intervención) {
        const numExpedient = await generarNumeroExpedient();
        const docRef = await addDoc(collection(db, 'nexepsy/intervenciones/intervenciones'), {
            ...intervención,
            numExpedient,
            beneficiariId: intervención.beneficiariId || intervención.pacienteId || '',
            familiaId: intervención.familiaId || '',
            fechaCreacion: Timestamp.now(),
            estado: 'activa',
            sesionesRealizadas: 0,
            sesionesPlaneadas: intervención.sesionesPlaneadas || 0,
            ultimaActualizacion: Timestamp.now()
        });
        return { id: docRef.id, numExpedient };
    },

    async obtener(interventionId) {
        const docRef = doc(db, 'nexepsy/intervenciones/intervenciones', interventionId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async actualizar(interventionId, data) {
        const docRef = doc(db, 'nexepsy/intervenciones/intervenciones', interventionId);
        await updateDoc(docRef, {
            ...data,
            ultimaActualizacion: Timestamp.now()
        });
    },

    async eliminar(interventionId) {
        const docRef = doc(db, 'nexepsy/intervenciones/intervenciones', interventionId);
        await deleteDoc(docRef);
    },

    async listar(estado = null, patientId = null) {
        let q;
        if (estado && patientId) {
            q = query(
                collection(db, 'nexepsy/intervenciones/intervenciones'),
                where('estado', '==', estado),
                where('pacienteId', '==', patientId),
                orderBy('fechaCreacion', 'desc')
            );
        } else if (estado) {
            q = query(
                collection(db, 'nexepsy/intervenciones/intervenciones'),
                where('estado', '==', estado),
                orderBy('fechaCreacion', 'desc')
            );
        } else if (patientId) {
            q = query(
                collection(db, 'nexepsy/intervenciones/intervenciones'),
                where('pacienteId', '==', patientId),
                orderBy('fechaCreacion', 'desc')
            );
        } else {
            q = query(
                collection(db, 'nexepsy/intervenciones/intervenciones'),
                orderBy('fechaCreacion', 'desc')
            );
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async obtenerPorDatos(filter) {
        const q = query(
            collection(db, 'nexepsy/intervenciones/intervenciones'),
            where('diagnóstico', '==', filter),
            orderBy('fechaCreacion', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async cambiarEstado(interventionId, nuevoEstado) {
        const docRef = doc(db, 'nexepsy/intervenciones/intervenciones', interventionId);
        await updateDoc(docRef, {
            estado: nuevoEstado,
            ultimaActualizacion: Timestamp.now()
        });
    }
};

// ============================================================================
// SESIONES (Sessions / Appointments)
// ============================================================================
export const SesionesDB = {

    async crear(interventionId, sesión) {
        const docRef = await addDoc(
            collection(db, `nexepsy/intervenciones/${interventionId}/sesiones`),
            {
                ...sesión,
                fechaSesión: Timestamp.fromDate(new Date(sesión.fechaSesión)),
                fechaRegistro: Timestamp.now(),
                estado: 'completada'
            }
        );
        
        // Increment session counter
        await IntervencionesDB.actualizar(interventionId, {
            sesionesRealizadas: sesión.sesionesRealizadas + 1
        });
        
        return docRef.id;
    },

    async obtener(interventionId, sessionId) {
        const docRef = doc(
            db,
            `nexepsy/intervenciones/${interventionId}/sesiones`,
            sessionId
        );
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async actualizar(interventionId, sessionId, data) {
        const docRef = doc(
            db,
            `nexepsy/intervenciones/${interventionId}/sesiones`,
            sessionId
        );
        await updateDoc(docRef, {
            ...data,
            ultimaActualizacion: Timestamp.now()
        });
    },

    async eliminar(interventionId, sessionId) {
        const docRef = doc(
            db,
            `nexepsy/intervenciones/${interventionId}/sesiones`,
            sessionId
        );
        await deleteDoc(docRef);
    },

    async listarPorIntervención(interventionId) {
        const q = query(
            collection(db, `nexepsy/intervenciones/${interventionId}/sesiones`),
            orderBy('fechaSesión', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async listarProximas(days = 7) {
        const now = Timestamp.now();
        const futuro = new Timestamp(now.seconds + (days * 24 * 60 * 60), now.nanoseconds);
        
        const q = query(
            collection(db, 'nexepsy/intervenciones/sesiones'),
            where('fechaSesión', '>=', now),
            where('fechaSesión', '<=', futuro),
            where('estado', '==', 'programada'),
            orderBy('fechaSesión', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// ============================================================================
// PACIENTES (Patients / Beneficiaries in Psychology Context)
// ============================================================================
export const PacientesDB = {

    async crear(paciente) {
        const docRef = await addDoc(collection(db, 'nexepsy/pacientes/pacientes'), {
            ...paciente,
            fechaRegistro: Timestamp.now(),
            activo: true,
            intervencionesActivas: 0
        });
        return docRef.id;
    },

    async obtener(patientId) {
        const docRef = doc(db, 'nexepsy/pacientes/pacientes', patientId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async actualizar(patientId, data) {
        const docRef = doc(db, 'nexepsy/pacientes/pacientes', patientId);
        await updateDoc(docRef, {
            ...data,
            ultimaActualizacion: Timestamp.now()
        });
    },

    async eliminar(patientId) {
        const docRef = doc(db, 'nexepsy/pacientes/pacientes', patientId);
        await deleteDoc(docRef);
    },

    async listar(activos = true) {
        const q = query(
            collection(db, 'nexepsy/pacientes/pacientes'),
            where('activo', '==', activos),
            orderBy('nombre', 'asc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async obtenerIntervenciones(patientId) {
        const q = query(
            collection(db, 'nexepsy/intervenciones/intervenciones'),
            where('pacienteId', '==', patientId),
            orderBy('fechaCreacion', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async buscar(searchTerm) {
        const q = query(
            collection(db, 'nexepsy/pacientes/pacientes'),
            where('nombre', '>=', searchTerm),
            where('nombre', '<=', searchTerm + '\uf8ff'),
            orderBy('nombre', 'asc'),
            limit(10)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// ============================================================================
// REPORTES ESTADÍSTICOS (Statistical Reports)
// ============================================================================
export const ReportesDB = {

    async crearReporte(reporte) {
        const docRef = await addDoc(collection(db, 'nexepsy/reportes/reportes'), {
            ...reporte,
            fechaGeneracion: Timestamp.now(),
            estado: 'completado'
        });
        return docRef.id;
    },

    async obtenerReporte(reporteId) {
        const docRef = doc(db, 'nexepsy/reportes/reportes', reporteId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async listarReportes(tipo = null) {
        let q;
        if (tipo) {
            q = query(
                collection(db, 'nexepsy/reportes/reportes'),
                where('tipo', '==', tipo),
                orderBy('fechaGeneracion', 'desc')
            );
        } else {
            q = query(
                collection(db, 'nexepsy/reportes/reportes'),
                orderBy('fechaGeneracion', 'desc')
            );
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async obtenerEstadísticas(startDate, endDate) {
        const q = query(
            collection(db, 'nexepsy/intervenciones/intervenciones'),
            where('fechaCreacion', '>=', Timestamp.fromDate(startDate)),
            where('fechaCreacion', '<=', Timestamp.fromDate(endDate)),
            orderBy('fechaCreacion', 'asc')
        );
        const querySnapshot = await getDocs(q);
        
        const intervenciones = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Agregaciones
        const estadísticas = {
            totalIntervenciones: intervenciones.length,
            porDiagnóstico: {},
            porEstado: {},
            porTerapeuta: {},
            sesionesPromedio: 0
        };

        intervenciones.forEach(int => {
            // Por diagnóstico
            estadísticas.porDiagnóstico[int.diagnóstico] = (estadísticas.porDiagnóstico[int.diagnóstico] || 0) + 1;
            // Por estado
            estadísticas.porEstado[int.estado] = (estadísticas.porEstado[int.estado] || 0) + 1;
            // Por terapeuta
            estadísticas.porTerapeuta[int.terapeutaId] = (estadísticas.porTerapeuta[int.terapeutaId] || 0) + 1;
        });

        if (intervenciones.length > 0) {
            const totalSesiones = intervenciones.reduce((sum, int) => sum + (int.sesionesRealizadas || 0), 0);
            estadísticas.sesionesPromedio = totalSesiones / intervenciones.length;
        }

        return estadísticas;
    },

    async exportarDatos(formato = 'json') {
        const intervenciones = await IntervencionesDB.listar();
        
        if (formato === 'csv') {
            // Implementar exportación a CSV
            return this._convertirACSV(intervenciones);
        }
        
        return JSON.stringify(intervenciones, null, 2);
    },

    _convertirACSV(data) {
        const headers = ['ID', 'Paciente', 'Diagnóstico', 'Terapeuta', 'Estado', 'Sesiones Realizadas'];
        const rows = data.map(int => [
            int.id,
            int.pacienteNombre,
            int.diagnóstico,
            int.terapeutaNombre,
            int.estado,
            int.sesionesRealizadas
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        return csv;
    }
};

// ============================================================================
// AUDITORÍA (Audit Logging)
// ============================================================================
export const AuditoriaNexePsyDB = {

    async registrar(acción, detalles, usuarioId) {
        await addDoc(collection(db, 'nexepsy/auditoria/logs'), {
            acción,
            detalles,
            usuarioId,
            timestamp: Timestamp.now(),
            módulo: 'NexePsy'
        });
    },

    async obtenerLogs(usuarioId = null, limit_count = 100) {
        let q;
        if (usuarioId) {
            q = query(
                collection(db, 'nexepsy/auditoria/logs'),
                where('usuarioId', '==', usuarioId),
                orderBy('timestamp', 'desc'),
                limit(limit_count)
            );
        } else {
            q = query(
                collection(db, 'nexepsy/auditoria/logs'),
                orderBy('timestamp', 'desc'),
                limit(limit_count)
            );
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// ============================================================================
// EXPEDIENT PSICOSOCIAL INDIVIDUAL
// Vincle entre beneficiari/família i les intervencions NexePsy
// ============================================================================
export const ExpedientPsyDB = {

    // Obtenir totes les intervencions d'un beneficiari concret
    async obtenerPorBeneficiari(beneficiariId) {
        const q = query(
            collection(db, 'nexepsy/intervenciones/intervenciones'),
            where('beneficiariId', '==', beneficiariId),
            orderBy('fechaCreacion', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Obtenir totes les intervencions associades a una família
    async obtenerPorFamilia(familiaId) {
        const q = query(
            collection(db, 'nexepsy/intervenciones/intervenciones'),
            where('familiaId', '==', familiaId),
            orderBy('fechaCreacion', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Resum públic (sense dades clíniques) per a usuaris sense accés NexePsy
    async resumPublic(beneficiariId) {
        const q = query(
            collection(db, 'nexepsy/intervenciones/intervenciones'),
            where('beneficiariId', '==', beneficiariId),
            where('estado', '==', 'activa')
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => d.data());
        return {
            teAtencio: docs.length > 0,
            totalIntervencions: docs.length,
            ultima: docs.length > 0
                ? docs.reduce((latest, d) => {
                    const t = d.ultimaActualizacion?.toDate?.() || d.fechaCreacion?.toDate?.() || null;
                    return (!latest || (t && t > latest)) ? t : latest;
                }, null)
                : null
        };
    },

    // Resum públic per família (sense dades clíniques)
    async resumPublicFamilia(familiaId) {
        const q = query(
            collection(db, 'nexepsy/intervenciones/intervenciones'),
            where('familiaId', '==', familiaId),
            where('estado', '==', 'activa')
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => d.data());
        const perBeneficiari = {};
        docs.forEach(d => {
            if (!perBeneficiari[d.beneficiariId]) perBeneficiari[d.beneficiariId] = { nom: d.pacienteNombre, count: 0 };
            perBeneficiari[d.beneficiariId].count++;
        });
        return {
            teAtencio: docs.length > 0,
            totalIntervencions: docs.length,
            membres: Object.values(perBeneficiari)
        };
    }
};

// ============================================================================
// INICIADORS DE COL·LECCIONS (Collection Initialization)
// ============================================================================
export const ColeccionesNexePsy = {

    async inicializarColecciones() {
        // Crear documento raíz si no existe
        const docRef = doc(db, 'nexepsy/intervenciones/intervenciones/');
        
        // Crear documentos de índice si es necesario
        try {
            await addDoc(collection(db, 'nexepsy/intervenciones/intervenciones'), {
                tipo: 'índice',
                creado: Timestamp.now(),
                estado: 'activo'
            });
        } catch (error) {
            console.log('Collection already initialized');
        }
    },

    async crearIndicadores() {
        const docRef = doc(db, 'nexepsy/indicadores', 'general');
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            await updateDoc(doc(db, 'nexepsy/indicadores', 'general'), {
                totalIntervenciones: 0,
                totalSesiones: 0,
                pacientesActivos: 0,
                ultimaActualización: Timestamp.now()
            }).catch(() => {
                // Crear si no existe
                addDoc(collection(db, 'nexepsy/indicadores'), {
                    totalIntervenciones: 0,
                    totalSesiones: 0,
                    pacientesActivos: 0,
                    ultimaActualización: Timestamp.now()
                });
            });
        }
    }
};

export default {
    IntervencionesDB,
    SesionesDB,
    PacientesDB,
    ReportesDB,
    AuditoriaNexePsyDB,
    ColeccionesNexePsy
};
