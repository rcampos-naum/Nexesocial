// grupos-db.js - Capa de Base de Datos para Módulo de Grupos

import { db } from "./firebase-config.js";
import {
    collection,
    doc,
    setDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    increment,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Función auxiliar para generar ID de grupo secuencial
async function generarIdGrupo() {
    const contadorRef = doc(db, "metadata", "grupos_contador");
    try {
        const docSnap = await getDoc(contadorRef);
        let numeroActual = 1;
        if (docSnap.exists()) {
            numeroActual = docSnap.data().contador + 1;
        }
        await updateDoc(contadorRef, { contador: numeroActual });
        return numeroActual.toString().padStart(3, '0');
    } catch (error) {
        await setDoc(contadorRef, { contador: 1 });
        return "001";
    }
}

// ==========================================
// --- DEPARTAMENTOS ---
// ==========================================

export const DepartamentosDB = {
    
    // Crear departamento
    crear: async function(nombre, descripcion = "") {
        try {
            const docRef = doc(collection(db, "departamentos"));
            await setDoc(docRef, {
                id: docRef.id,
                nombre,
                descripcion,
                fechaCreacion: serverTimestamp(),
                estado: "Activo"
            });
            return docRef.id;
        } catch (error) {
            console.error("Error crear departamento:", error);
            throw error;
        }
    },

    // Obtener todos los departamentos
    obtenerTodos: async function() {
        try {
            const q = query(collection(db, "departamentos"), where("estado", "==", "Activo"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener departamentos:", error);
            return [];
        }
    },

    // Obtener un departamento por ID
    obtenerPorId: async function(id) {
        try {
            const docSnap = await getDoc(doc(db, "departamentos", id));
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error("Error obtener departamento:", error);
            return null;
        }
    }
};

// ==========================================
// --- ACTIVIDADES ---
// ==========================================

export const ActividadesDB = {
    
    // Crear actividad
    crear: async function(nombre, departamentoId, edadMinima, edadMaxima, descripcion = "") {
        try {
            const docRef = doc(collection(db, "actividades"));
            await setDoc(docRef, {
                id: docRef.id,
                nombre,
                departamentoId,
                edadMinima: parseInt(edadMinima),
                edadMaxima: parseInt(edadMaxima),
                descripcion,
                fechaCreacion: serverTimestamp(),
                estado: "Activo"
            });
            return docRef.id;
        } catch (error) {
            console.error("Error crear actividad:", error);
            throw error;
        }
    },

    // Obtener actividades por departamento
    obtenerPorDepartamento: async function(departamentoId) {
        try {
            const q = query(
                collection(db, "actividades"),
                where("departamentoId", "==", departamentoId),
                where("estado", "==", "Activo")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener actividades:", error);
            return [];
        }
    },

    // Obtener actividad por ID
    obtenerPorId: async function(id) {
        try {
            const docSnap = await getDoc(doc(db, "actividades", id));
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error("Error obtener actividad:", error);
            return null;
        }
    }
};

// ==========================================
// --- GRUPOS ---
// ==========================================

export const GruposDB = {
    
    // Crear grupo
    crear: async function(nombre, departamentoId, actividadId, responsableId, responsableNombre, departamentoNombre = "", actividadNombre = "", turnos = [], meta = {}, tipoActividadId = null) {
        try {
            const idGrupo = await generarIdGrupo();
            const docRef = doc(collection(db, "grupos"));
            await setDoc(docRef, {
                id: docRef.id,
                idGrupo,
                nombre,
                departamentoId,
                actividadId,
                tipoActividadId: tipoActividadId || null,
                departamentoNombre,
                actividadNombre,
                responsableId,
                responsableNombre,
                beneficiarios: [], // Array vacío inicialmente
                turnos: turnos || [],
                periodId: meta.periodId || "",
                periodoId: meta.periodId || "",
                periodLabel: meta.periodLabel || "",
                periodoLabel: meta.periodLabel || "",
                periodType: meta.periodType || "",
                fechaCreacion: serverTimestamp(),
                estado: "Activo"
            });
            return { id: docRef.id, idGrupo };
        } catch (error) {
            console.error("Error crear grupo:", error);
            throw error;
        }
    },

    // Obtener todos los grupos
    obtenerTodos: async function() {
        try {
            const q = query(collection(db, "grupos"), where("estado", "==", "Activo"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener grupos:", error);
            return [];
        }
    },

    // Obtener grupo por ID
    obtenerPorId: async function(grupoId) {
        try {
            const docSnap = await getDoc(doc(db, "grupos", grupoId));
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error("Error obtener grupo:", error);
            return null;
        }
    },

    // Actualizar grupo
    actualizar: async function(grupoId, datos) {
        try {
            await updateDoc(doc(db, "grupos", grupoId), {
                ...datos,
                fechaModificacion: serverTimestamp()
            });
        } catch (error) {
            console.error("Error actualizar grupo:", error);
            throw error;
        }
    },

    // Eliminar grupo (lógicamente)
    eliminar: async function(grupoId) {
        try {
            await updateDoc(doc(db, "grupos", grupoId), {
                estado: "Inactivo",
                fechaEliminacion: serverTimestamp()
            });
        } catch (error) {
            console.error("Error eliminar grupo:", error);
            throw error;
        }
    }
};

// ==========================================
// --- BENEFICIARIOS EN GRUPOS ---
// ==========================================

export const BeneficiariosGruposDB = {
    
    // Agregar beneficiario al grupo
    agregar: async function(grupoId, beneficiarioId, nombre, edad, estado, motivoExcepcion = null, usuarioExcepcion = null, meta = {}) {
        try {
            const docRef = doc(collection(db, "beneficiarios_grupos"));
            const datos = {
                id: docRef.id,
                grupoId,
                beneficiarioId,
                nombre,
                edad: parseInt(edad),
                estado, // "Correcto" o "Excepción"
                periodId: meta.periodId || "",
                periodLabel: meta.periodLabel || "",
                periodType: meta.periodType || "",
                fechaAgregado: serverTimestamp()
            };

            if (estado === "Excepción" && motivoExcepcion) {
                datos.motivoExcepcion = motivoExcepcion;
                datos.usuarioExcepcion = usuarioExcepcion;
                datos.fechaExcepcion = serverTimestamp();
            }

            await setDoc(docRef, datos);
            
            // Agregar a array de beneficiarios del grupo
            const grupoRef = doc(db, "grupos", grupoId);
            const grupoDoc = await getDoc(grupoRef);
            if (grupoDoc.exists()) {
                const beneficiarios = grupoDoc.data().beneficiarios || [];
                if (!beneficiarios.includes(beneficiarioId)) {
                    beneficiarios.push(beneficiarioId);
                    await updateDoc(grupoRef, { beneficiarios });
                }
            }

            return docRef.id;
        } catch (error) {
            console.error("Error agregar beneficiario:", error);
            throw error;
        }
    },

    // Obtener beneficiarios de un grupo
    obtenerPorGrupo: async function(grupoId) {
        try {
            const q = query(collection(db, "beneficiarios_grupos"), where("grupoId", "==", grupoId));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener beneficiarios:", error);
            return [];
        }
    },

    // Eliminar beneficiario de grupo
    eliminar: async function(grupoId, beneficiarioId, idBeneficiarioGrupo) {
        try {
            // Eliminar documento de beneficiario_grupo
            await deleteDoc(doc(db, "beneficiarios_grupos", idBeneficiarioGrupo));
            
            // Eliminar del array de beneficiarios del grupo
            const grupoRef = doc(db, "grupos", grupoId);
            const grupoDoc = await getDoc(grupoRef);
            if (grupoDoc.exists()) {
                let beneficiarios = grupoDoc.data().beneficiarios || [];
                beneficiarios = beneficiarios.filter(id => id !== beneficiarioId);
                await updateDoc(grupoRef, { beneficiarios });
            }
        } catch (error) {
            console.error("Error eliminar beneficiario:", error);
            throw error;
        }
    },

    // Actualizar beneficiario
    actualizar: async function(idBeneficiarioGrupo, datos) {
        try {
            await updateDoc(doc(db, "beneficiarios_grupos", idBeneficiarioGrupo), {
                ...datos,
                fechaModificacion: serverTimestamp()
            });
        } catch (error) {
            console.error("Error actualizar beneficiario:", error);
            throw error;
        }
    }
};

// ==========================================
// --- ASISTENCIA ---
// ==========================================

export const AsistenciaDB = {
    
    // Guardar o actualizar asistencia
    guardar: async function(grupoId, beneficiarioId, fecha, asistio, responsableId, responsableNombre) {
        try {
            // Buscar si ya existe registro para esta combinación
            const q = query(
                collection(db, "asistencia"),
                where("grupoId", "==", grupoId),
                where("beneficiarioId", "==", beneficiarioId),
                where("fecha", "==", fecha)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Actualizar registro existente
                const docId = querySnapshot.docs[0].id;
                await updateDoc(doc(db, "asistencia", docId), {
                    asistio,
                    responsableId,
                    responsableNombre,
                    fechaModificacion: serverTimestamp()
                });
                return docId;
            } else {
                // Crear nuevo registro
                const docRef = doc(collection(db, "asistencia"));
                await setDoc(docRef, {
                    id: docRef.id,
                    grupoId,
                    beneficiarioId,
                    fecha,
                    asistio,
                    responsableId,
                    responsableNombre,
                    fechaRegistro: serverTimestamp()
                });
                return docRef.id;
            }
        } catch (error) {
            console.error("Error guardar asistencia:", error);
            throw error;
        }
    },

    // Obtener asistencia de un grupo en una fecha
    obtenerPorGrupoYFecha: async function(grupoId, fecha) {
        try {
            const q = query(
                collection(db, "asistencia"),
                where("grupoId", "==", grupoId),
                where("fecha", "==", fecha)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener asistencia:", error);
            return [];
        }
    },

    // Guardar asistencia con estado (P, F, FJ)
    guardarAsistenciaConEstado: async function(grupoId, beneficiarioId, fecha, estado, responsableId, responsableNombre, meta = {}) {
        try {
            // Buscar si ya existe registro para esta combinación
            const q = query(
                collection(db, "asistencia"),
                where("grupoId", "==", grupoId),
                where("beneficiarioId", "==", beneficiarioId),
                where("fecha", "==", fecha)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Actualizar registro existente
                const docId = querySnapshot.docs[0].id;
                await updateDoc(doc(db, "asistencia", docId), {
                    estado: estado || null,  // Guardar null si estado está vacío
                    responsableId,
                    responsableNombre,
                    periodId: meta.periodId || "",
                    periodLabel: meta.periodLabel || "",
                    periodType: meta.periodType || "",
                    fechaModificacion: serverTimestamp()
                });
                return docId;
            } else {
                // Solo crear si hay un estado válido
                if (!estado) return null;
                
                const docRef = doc(collection(db, "asistencia"));
                await setDoc(docRef, {
                    id: docRef.id,
                    grupoId,
                    beneficiarioId,
                    fecha,
                    estado,
                    responsableId,
                    responsableNombre,
                    periodId: meta.periodId || "",
                    periodLabel: meta.periodLabel || "",
                    periodType: meta.periodType || "",
                    fechaRegistro: serverTimestamp()
                });
                return docRef.id;
            }
        } catch (error) {
            console.error("Error guardar asistencia con estado:", error);
            throw error;
        }
    },

    // Obtener histórico de asistencia de un beneficiario
    obtenerHistoricoBeneficiario: async function(beneficiarioId, grupoId = null) {
        try {
            let q;
            if (grupoId) {
                q = query(
                    collection(db, "asistencia"),
                    where("beneficiarioId", "==", beneficiarioId),
                    where("grupoId", "==", grupoId)
                );
            } else {
                q = query(collection(db, "asistencia"), where("beneficiarioId", "==", beneficiarioId));
            }
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        } catch (error) {
            console.error("Error obtener histórico:", error);
            return [];
        }
    }
};

// ==========================================
// --- TIPOS DE ACTIVIDADES ---
// ==========================================

export const TiposActividadesDB = {
    
    // Crear tipo de actividad
    crear: async function(nombre, descripcion = "", departamentoId = "") {
        try {
            const docRef = doc(collection(db, "tipos_actividades"));
            await setDoc(docRef, {
                id: docRef.id,
                nombre,
                descripcion,
                departamentoId,
                fechaCreacion: serverTimestamp(),
                estado: "Activo"
            });
            return docRef.id;
        } catch (error) {
            console.error("Error crear tipo de actividad:", error);
            throw error;
        }
    },

    // Obtener todos los tipos de actividades
    obtenerTodos: async function() {
        try {
            const q = query(collection(db, "tipos_actividades"), where("estado", "==", "Activo"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener tipos de actividades:", error);
            return [];
        }
    },

    // Obtener tipos de actividades por departamento
    obtenerPorDepartamento: async function(departamentoId) {
        try {
            let q;
            if (departamentoId) {
                q = query(
                    collection(db, "tipos_actividades"),
                    where("departamentoId", "==", departamentoId),
                    where("estado", "==", "Activo")
                );
            } else {
                q = query(collection(db, "tipos_actividades"), where("estado", "==", "Activo"));
            }
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener tipos de actividades:", error);
            return [];
        }
    },

    // Obtener tipo de actividad por ID
    obtenerPorId: async function(id) {
        try {
            const docSnap = await getDoc(doc(db, "tipos_actividades", id));
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error("Error obtener tipo de actividad:", error);
            return null;
        }
    },

    // Actualizar tipo de actividad
    actualizar: async function(tipoId, datos) {
        try {
            await updateDoc(doc(db, "tipos_actividades", tipoId), {
                ...datos,
                fechaModificacion: serverTimestamp()
            });
        } catch (error) {
            console.error("Error actualizar tipo de actividad:", error);
            throw error;
        }
    },

    // Eliminar tipo de actividad (lógicamente)
    eliminar: async function(tipoId) {
        try {
            await updateDoc(doc(db, "tipos_actividades", tipoId), {
                estado: "Inactivo",
                fechaEliminacion: serverTimestamp()
            });
        } catch (error) {
            console.error("Error eliminar tipo de actividad:", error);
            throw error;
        }
    }
};

// ==========================================
// --- UTILIDADES ---
// ==========================================

export function calcularEdadPersona(dataNacimiento) {
    if (!dataNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(dataNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return Math.max(0, edad);
}

export function validarRangoEdad(edad, edadMinima, edadMaxima) {
    return edad >= edadMinima && edad <= edadMaxima;
}

export function formatearFecha(fecha) {
    if (typeof fecha === 'string') return fecha;
    return fecha.toISOString().split('T')[0];
}
