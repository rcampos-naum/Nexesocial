// admin-db.js - Capa de Base de Datos para Módulo de Administración
// Gestiona: Personal, Subvenciones, Documentos, Proyectos, Auditoría

import { db, auth } from "../firebase-config.js";
import { 
    collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, 
    query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// --- GESTIÓN DE PERSONAL ---
// ==========================================

export const PersonalDB = {
    
    // Crear empleado
    crear: async function(datosEmpleado) {
        try {
            const docRef = await addDoc(collection(db, "empleados"), {
                ...datosEmpleado,
                fechaAlta: datosEmpleado.fechaAlta || serverTimestamp(),
                fechaCreacion: serverTimestamp(),
                estado: datosEmpleado.estado || "Activo"
            });
            return docRef.id;
        } catch (error) {
            console.error("Error crear empleado:", error);
            throw error;
        }
    },

    // Obtener todos los empleados (opcional: filtrar por estado)
    obtenerTodos: async function(estado = null) {
        try {
            let q;
            if (estado) {
                q = query(collection(db, "empleados"), where("estado", "==", estado), orderBy("nombre"));
            } else {
                q = query(collection(db, "empleados"), orderBy("nombre"));
            }
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener empleados:", error);
            return [];
        }
    },

    // Obtener empleado por ID
    obtenerPorId: async function(empleadoId) {
        try {
            const docSnapshot = await getDoc(doc(db, "empleados", empleadoId));
            return docSnapshot.exists() ? { id: docSnapshot.id, ...docSnapshot.data() } : null;
        } catch (error) {
            console.error("Error obtener empleado:", error);
            return null;
        }
    },

    // Actualizar empleado
    actualizar: async function(empleadoId, datosActualizados) {
        try {
            await updateDoc(doc(db, "empleados", empleadoId), {
                ...datosActualizados,
                fechaModificacion: serverTimestamp()
            });
            return empleadoId;
        } catch (error) {
            console.error("Error actualizar empleado:", error);
            throw error;
        }
    },

    // Eliminar (cambiar estado a baja)
    darBaja: async function(empleadoId) {
        try {
            await updateDoc(doc(db, "empleados", empleadoId), {
                estado: "Baja",
                fechaBaja: serverTimestamp()
            });
        } catch (error) {
            console.error("Error dar baja empleado:", error);
            throw error;
        }
    }
};

// ==========================================
// --- GESTIÓN DE SUBVENCIONES ---
// ==========================================

export const SubvencionesDB = {
    
    // Estados: Borrador, Preparación, Presentada, Concedida, Denegada, Ejecución, Justificada, Cerrada
    ESTADOS: ["Borrador", "En preparación", "Presentada", "Concedida", "Denegada", "En ejecución", "Justificada", "Cerrada"],
    
    // Crear subvención
    crear: async function(datosSubvencion) {
        try {
            const docRef = await addDoc(collection(db, "subvenciones"), {
                ...datosSubvencion,
                estado: datosSubvencion.estado || "Borrador",
                fechaCreacion: serverTimestamp(),
                tasaExito: 0
            });
            return docRef.id;
        } catch (error) {
            console.error("Error crear subvención:", error);
            throw error;
        }
    },

    // Obtener todas las subvenciones
    obtenerTodas: async function() {
        try {
            const q = query(collection(db, "subvenciones"), orderBy("fechaCierre", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener subvenciones:", error);
            return [];
        }
    },

    // Obtener subvenciones activas o con vencimiento próximo (próximos 30 días)
    obtenerProximas: async function() {
        try {
            const hoy = new Date();
            const en30dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            const q = query(
                collection(db, "subvenciones"),
                where("estado", "in", ["En preparación", "En ejecución"])
            );
            const snapshot = await getDocs(q);
            const subvenciones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            return subvenciones.filter(s => {
                if (s.fechaCierre) {
                    const fecha = new Date(s.fechaCierre);
                    return fecha >= hoy && fecha <= en30dias;
                }
                return false;
            });
        } catch (error) {
            console.error("Error obtener próximas:", error);
            return [];
        }
    },

    // Actualizar subvención
    actualizar: async function(subvencionId, datosActualizados) {
        try {
            await updateDoc(doc(db, "subvenciones", subvencionId), {
                ...datosActualizados,
                fechaModificacion: serverTimestamp()
            });
            return subvencionId;
        } catch (error) {
            console.error("Error actualizar subvención:", error);
            throw error;
        }
    },

    // Calcular KPIs
    calcularKPIs: async function() {
        try {
            const todas = await this.obtenerTodas();
            const concedidas = todas.filter(s => s.estado === "Concedida" || s.estado === "En ejecución" || s.estado === "Justificada").length;
            const tasaConcesion = (concedidas / todas.length) * 100 || 0;
            
            const solicitado = todas.reduce((sum, s) => sum + (s.importeSolicitado || 0), 0);
            const concedido = todas.reduce((sum, s) => sum + (s.importeConcedido || 0), 0);
            const porcentajeImporte = (concedido / solicitado) * 100 || 0;
            
            return {
                totalSubvenciones: todas.length,
                tasaConcesion: tasaConcesion.toFixed(1),
                importeSolicitado: solicitado,
                importeConcedido: concedido,
                porcentajeImporte: porcentajeImporte.toFixed(1),
                activas: todas.filter(s => s.estado === "En ejecución").length
            };
        } catch (error) {
            console.error("Error calcular KPIs:", error);
            return null;
        }
    }
};

// ==========================================
// --- GESTIÓN DOCUMENTAL ---
// ==========================================

export const DocumentosDB = {
    
    TIPOS: ["Contrato", "Nómina", "Seguro", "Acta", "Subvención", "Protocolo", "Autorización", "Certificado"],
    CONFIDENCIALIDAD: ["Público interno", "Restringido", "Alta confidencialidad"],
    
    // Subir documento
    subir: async function(datosDocumento) {
        try {
            const docRef = await addDoc(collection(db, "documentos"), {
                ...datosDocumento,
                fechaSubida: serverTimestamp(),
                estado: "Activo"
            });
            return docRef.id;
        } catch (error) {
            console.error("Error subir documento:", error);
            throw error;
        }
    },

    // Obtener documentos (opcional: filtrar por tipo o proyecto)
    obtenerTodos: async function(filtros = {}) {
        try {
            let q;
            const condiciones = [];
            
            if (filtros.tipo) condiciones.push(where("tipo", "==", filtros.tipo));
            if (filtros.proyectoId) condiciones.push(where("proyectoId", "==", filtros.proyectoId));
            
            if (condiciones.length > 0) {
                q = query(collection(db, "documentos"), ...condiciones, orderBy("fechaSubida", "desc"));
            } else {
                q = query(collection(db, "documentos"), orderBy("fechaSubida", "desc"));
            }
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener documentos:", error);
            return [];
        }
    },

    // Obtener documentos con vencimiento próximo
    obtenerVencidos: async function() {
        try {
            const hoy = new Date().toISOString().split('T')[0];
            const todos = await this.obtenerTodos();
            return todos.filter(d => d.fechaVencimiento && d.fechaVencimiento <= hoy && d.estado === "Activo");
        } catch (error) {
            console.error("Error obtener vencidos:", error);
            return [];
        }
    },

    // Actualizar documento
    actualizar: async function(documentoId, datosActualizados) {
        try {
            await updateDoc(doc(db, "documentos", documentoId), {
                ...datosActualizados,
                fechaModificacion: serverTimestamp()
            });
        } catch (error) {
            console.error("Error actualizar documento:", error);
            throw error;
        }
    },

    // Nuevo versión de documento
    crearVersion: async function(documentoOriginalId, nuevoFile) {
        try {
            const docOriginal = await getDoc(doc(db, "documentos", documentoOriginalId));
            if (!docOriginal.exists()) throw new Error("Documento original no encontrado");
            
            const versionNumero = (docOriginal.data().versionNumero || 1) + 1;
            
            const docRef = await addDoc(collection(db, "documentos"), {
                ...docOriginal.data(),
                versionNumero: versionNumero,
                documentoPadreId: documentoOriginalId,
                fechaSubida: serverTimestamp()
            });
            
            return docRef.id;
        } catch (error) {
            console.error("Error crear versión:", error);
            throw error;
        }
    }
};

// ==========================================
// --- GESTIÓN DE PROYECTOS ---
// ==========================================

export const ProyectosDB = {
    
    ESTADOS: ["Planificado", "Activo", "Finalizado"],
    
    // Crear proyecto
    crear: async function(datosProyecto) {
        try {
            const docRef = await addDoc(collection(db, "proyectos"), {
                ...datosProyecto,
                estado: datosProyecto.estado || "Planificado",
                fechaCreacion: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error crear proyecto:", error);
            throw error;
        }
    },

    // Obtener proyectos
    obtenerTodos: async function(estado = null) {
        try {
            let q;
            if (estado) {
                q = query(collection(db, "proyectos"), where("estado", "==", estado), orderBy("nombre"));
            } else {
                q = query(collection(db, "proyectos"), orderBy("nombre"));
            }
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obtener proyectos:", error);
            return [];
        }
    },

    // Actualizar proyecto
    actualizar: async function(proyectoId, datosActualizados) {
        try {
            await updateDoc(doc(db, "proyectos", proyectoId), {
                ...datosActualizados,
                fechaModificacion: serverTimestamp()
            });
        } catch (error) {
            console.error("Error actualizar proyecto:", error);
            throw error;
        }
    }
};

// ==========================================
// --- AUDITORÍA LOG ---
// ==========================================

export const AuditoriaDB = {
    
    // Registrar acción
    registrar: async function(usuarioId, usuarioNombre, accion, modulo, detalles = {}) {
        try {
            await addDoc(collection(db, "auditoria_log"), {
                usuarioId,
                usuarioNombre,
                accion,  // CREATE, UPDATE, DELETE, VIEW, EXPORT
                modulo,  // personal, subvenciones, documentos, proyectos
                detalles,
                fechaHora: serverTimestamp(),
                ipAddress: "N/A" // Será capturado por servidor si es posible
            });
        } catch (error) {
            console.error("Error registrar auditoría:", error);
        }
    },

    // Obtener historial (últimos 100 registros)
    obtenerHistorial: async function(filtros = {}) {
        try {
            const q = query(collection(db, "auditoria_log"), orderBy("fechaHora", "desc"));
            const snapshot = await getDocs(q);
            let registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (filtros.modulo) {
                registros = registros.filter(r => r.modulo === filtros.modulo);
            }
            if (filtros.usuarioId) {
                registros = registros.filter(r => r.usuarioId === filtros.usuarioId);
            }
            
            return registros.slice(0, 100);
        } catch (error) {
            console.error("Error obtener historial:", error);
            return [];
        }
    }
};

// ==========================================
// --- SISTEMA DE PERMISOS Y ROLES ---
// ==========================================

export const RolesDB = {
    
    ROLES: {
        ADMIN_TOTAL: { nombre: "Administrador Total", permisos: ["*"] },
        ADMIN: { nombre: "Administración", permisos: ["personal", "documentos", "proyectos"] },
        COORDINACION: { nombre: "Coordinación", permisos: ["personal", "proyectos"] },
        TECNICO: { nombre: "Técnico", permisos: ["personal.leer", "proyectos.leer"] },
        DIRECCION: { nombre: "Dirección", permisos: ["*.leer"] }
    },
    
    // Verificar permiso
    tienePermiso: function(rolUsuario, modulo, accion = "leer") {
        const rol = this.ROLES[rolUsuario];
        if (!rol) return false;
        if (rol.permisos.includes("*")) return true;
        
        const permiso = `${modulo}.${accion}`;
        return rol.permisos.includes(permiso) || rol.permisos.includes(modulo);
    },

    // Obtener listas de archivos según permiso
    obtenerAccesiblesPorUsuario: async function(usuarioId, rolUsuario, modulo) {
        if (!this.tienePermiso(rolUsuario, modulo)) {
            return [];
        }
        // Aquí se implementaría la lógica de filtrado según usuario
        return [];
    }
};

// ==========================================
// --- GESTIÓN DE FACTURAS / PROVEEDORES ---
// ==========================================

export const FacturasDB = {

    ESTADOS: ["Pendent", "Pagada", "Comptabilitzada"],
    FORMES_PAGAMENT: ["Transferència", "Domiciliació", "Efectiu", "Targeta"],

    crear: async function(datosFactura) {
        try {
            const docRef = await addDoc(collection(db, "facturas"), {
                ...datosFactura,
                importeTotal: parseFloat(datosFactura.importeTotal) || 0,
                baseImponible: parseFloat(datosFactura.baseImponible) || 0,
                importeIVA: parseFloat(datosFactura.importeIVA) || 0,
                estado: datosFactura.estado || "Pendent",
                fechaCreacion: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error crear factura:", error);
            throw error;
        }
    },

    obtenerTodas: async function() {
        try {
            const q = query(collection(db, "facturas"), orderBy("fechaCreacion", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("Error obtener facturas:", error);
            return [];
        }
    },

    obtenerPorSubvencion: async function(subvencionId) {
        try {
            const q = query(
                collection(db, "facturas"),
                where("subvencionId", "==", subvencionId),
                orderBy("fechaCreacion", "desc")
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("Error obtener facturas por subvenció:", error);
            return [];
        }
    },

    actualizar: async function(facturaId, datosActualizados) {
        try {
            await updateDoc(doc(db, "facturas", facturaId), {
                ...datosActualizados,
                fechaModificacion: serverTimestamp()
            });
            return facturaId;
        } catch (error) {
            console.error("Error actualitzar factura:", error);
            throw error;
        }
    },

    calcularGastosPorSubvencion: async function() {
        try {
            const facturas = await this.obtenerTodas();
            const gastos = {};
            facturas.forEach(f => {
                const key = f.subvencionId || "general";
                gastos[key] = (gastos[key] || 0) + (parseFloat(f.importeTotal) || 0);
            });
            return gastos;
        } catch (error) {
            console.error("Error calcular gastos:", error);
            return {};
        }
    },

    calcularKPIs: async function() {
        try {
            const facturas = await this.obtenerTodas();
            const now = new Date();
            const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            return {
                totalFacturat: facturas.reduce((s, f) => s + (parseFloat(f.importeTotal) || 0), 0),
                totalPendent: facturas.filter(f => f.estado === "Pendent").reduce((s, f) => s + (parseFloat(f.importeTotal) || 0), 0),
                facturesMes: facturas.filter(f => {
                    if (!f.fechaCreacion) return false;
                    const d = f.fechaCreacion.toDate ? f.fechaCreacion.toDate() : new Date();
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === key;
                }).length,
                totalFactures: facturas.length
            };
        } catch (error) {
            return { totalFacturat: 0, totalPendent: 0, facturesMes: 0, totalFactures: 0 };
        }
    }
};

// ==========================================
// --- FUNCIONES GLOBALES DE EXPORTACIÓN ---
// ==========================================

export default {
    PersonalDB,
    SubvencionesDB,
    DocumentosDB,
    ProyectosDB,
    AuditoriaDB,
    RolesDB,
    FacturasDB
};
