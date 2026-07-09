// admin-logic.js - Lógica Frontend para Módulo de Administración

import { auth } from "../firebase-config.js";
import { PersonalDB, SubvencionesDB, DocumentosDB, ProyectosDB, AuditoriaDB, RolesDB } from "./admin-db.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export const AdminLogic = {

    // ==========================================
    // --- USUARIO Y AUTENTICACIÓN ---
    // ==========================================

    usuarioActual: null,
    rolUsuario: null,

    inicializar: async function() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    this.usuarioActual = user;
                    // Aquí se obtendría el rol del usuario de Firestore
                    this.rolUsuario = localStorage.getItem("rolUsuario") || "COORDINACION";
                    resolve(true);
                } else {
                    window.location.href = "index.html";
                    resolve(false);
                }
            });
        });
    },

    // ==========================================
    // --- NOTIFICACIONES ---
    // ==========================================

    mostrarAlerta: function(titulo, mensaje, tipo = "info") {
        console.log(`[${tipo.toUpperCase()}] ${titulo}: ${mensaje}`);
        // Aquí se integraría con un sistema de notificaciones visual
        const notif = document.createElement("div");
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${tipo === "error" ? "#fee2e2" : tipo === "success" ? "#dcfce7" : "#dbeafe"};
            color: ${tipo === "error" ? "#991b1b" : tipo === "success" ? "#166534" : "#1e40af"};
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10001;
            font-weight: 600;
            border-left: 4px solid ${tipo === "error" ? "#ef4444" : tipo === "success" ? "#10b981" : "#3b82f6"};
        `;
        notif.innerHTML = `<strong>${titulo}</strong><br>${mensaje}`;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    },

    // ==========================================
    // --- GESTIÓN DE PERSONAL ---
    // ==========================================

    crearEmpleado: async function(datosEmpleado) {
        try {
            const id = await PersonalDB.crear(datosEmpleado);
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "CREATE",
                "personal",
                { empleadoId: id, nombre: datosEmpleado.nombre }
            );
            this.mostrarAlerta("Éxito", `Empleado ${datosEmpleado.nombre} creado correctamente`, "success");
            return id;
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            throw error;
        }
    },

    actualizarEmpleado: async function(empleadoId, datos) {
        try {
            await PersonalDB.actualizar(empleadoId, datos);
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "UPDATE",
                "personal",
                { empleadoId, campos: Object.keys(datos) }
            );
            this.mostrarAlerta("Éxito", "Empleado actualizado correctamente", "success");
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            throw error;
        }
    },

    darBajaEmpleado: async function(empleadoId) {
        try {
            await PersonalDB.darBaja(empleadoId);
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "UPDATE",
                "personal",
                { empleadoId, accion: "BAJA" }
            );
            this.mostrarAlerta("Éxito", "Empleado dado de baja correctamente", "success");
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            throw error;
        }
    },

    obtenerEmpleados: async function() {
        try {
            const empleados = await PersonalDB.obtenerTodos("Activo");
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "VIEW",
                "personal",
                { accion: "LISTAR" }
            );
            return empleados;
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            return [];
        }
    },

    // ==========================================
    // --- GESTIÓN DE SUBVENCIONES ---
    // ==========================================

    crearSubvencion: async function(datosSubvencion) {
        try {
            const id = await SubvencionesDB.crear(datosSubvencion);
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "CREATE",
                "subvenciones",
                { subvencionId: id, nombre: datosSubvencion.nombre }
            );
            this.mostrarAlerta("Éxito", `Subvención ${datosSubvencion.nombre} creada correctamente`, "success");
            return id;
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            throw error;
        }
    },

    actualizarSubvencion: async function(subvencionId, datos) {
        try {
            await SubvencionesDB.actualizar(subvencionId, datos);
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "UPDATE",
                "subvenciones",
                { subvencionId, campos: Object.keys(datos) }
            );
            this.mostrarAlerta("Éxito", "Subvención actualizada correctamente", "success");
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            throw error;
        }
    },

    obtenerSubvenciones: async function() {
        try {
            const subvenciones = await SubvencionesDB.obtenerTodas();
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "VIEW",
                "subvenciones",
                { accion: "LISTAR" }
            );
            return subvenciones;
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            return [];
        }
    },

    obtenerKPIsSubvenciones: async function() {
        try {
            const kpis = await SubvencionesDB.calcularKPIs();
            return kpis;
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            return null;
        }
    },

    // ==========================================
    // --- GESTIÓN DOCUMENTAL ---
    // ==========================================

    subirDocumento: async function(datosDocumento) {
        try {
            const id = await DocumentosDB.subir(datosDocumento);
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "CREATE",
                "documentos",
                { documentoId: id, nombre: datosDocumento.nombre }
            );
            this.mostrarAlerta("Éxito", `Documento ${datosDocumento.nombre} subido correctamente`, "success");
            return id;
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            throw error;
        }
    },

    obtenerDocumentos: async function(filtros = {}) {
        try {
            const documentos = await DocumentosDB.obtenerTodos(filtros);
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "VIEW",
                "documentos",
                { accion: "LISTAR", filtros }
            );
            return documentos;
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            return [];
        }
    },

    obtenerDocumentosVencidos: async function() {
        try {
            const vencidos = await DocumentosDB.obtenerVencidos();
            return vencidos;
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            return [];
        }
    },

    // ==========================================
    // --- PROYECTOS ---
    // ==========================================

    crearProyecto: async function(datosProyecto) {
        try {
            const id = await ProyectosDB.crear(datosProyecto);
            await AuditoriaDB.registrar(
                this.usuarioActual.uid,
                this.usuarioActual.displayName || "Usuario",
                "CREATE",
                "proyectos",
                { proyectoId: id, nombre: datosProyecto.nombre }
            );
            this.mostrarAlerta("Éxito", `Proyecto ${datosProyecto.nombre} creado correctamente`, "success");
            return id;
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
            throw error;
        }
    },

    // ==========================================
    // --- CONTROL DE ACCESO ---
    // ==========================================

    tienePermiso: function(modulo, accion = "leer") {
        return RolesDB.tienePermiso(this.rolUsuario, modulo, accion);
    },

    verificarAcceso: function(modulo, accion = "leer") {
        if (!this.tienePermiso(modulo, accion)) {
            this.mostrarAlerta("Acceso Denegado", `No tienes permisos para ${accion} en ${modulo}`, "error");
            return false;
        }
        return true;
    },

    // ==========================================
    // --- UTILIDADES ---
    // ==========================================

    exportarAExcel: function(datos, nombreArchivo) {
        try {
            let csv = "";
            // Encabezados
            if (datos.length > 0) {
                csv = Object.keys(datos[0]).join(",") + "\n";
                // Filas
                datos.forEach(row => {
                    csv += Object.values(row).map(v => `"${v}"`).join(",") + "\n";
                });
            }
            
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            this.mostrarAlerta("Éxito", "Archivo exportado correctamente", "success");
        } catch (error) {
            this.mostrarAlerta("Error", error.message, "error");
        }
    }
};

// Exponerlo globalmente
window.AdminLogic = AdminLogic;

export default AdminLogic;
