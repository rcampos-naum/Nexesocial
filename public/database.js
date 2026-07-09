// database.js
import { db } from "./firebase-config.js";

// IMPORTACIÓN CORREGIDA: Usamos la URL completa para el navegador
import { 
    doc, 
    runTransaction, 
    collection, 
    serverTimestamp, 
    getDocs, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// --- UTILIDADES ---
// ==========================================

export function calcularEdat(dataNaixement) {
    if (!dataNaixement) return 0;
    const avui = new Date();
    const naixement = new Date(dataNaixement);
    let edat = avui.getFullYear() - naixement.getFullYear();
    const mes = avui.getMonth() - naixement.getMonth();
    if (mes < 0 || (mes === 0 && avui.getDate() < naixement.getDate())) {
        edat--;
    }
    return edat;
}

// ==========================================
// --- EINES DE GESTIÓ (Firebase Real) ---
// ==========================================

export const DB_Tools = {
    
    // 1. GUARDAR NUEVO EXPEDIENTE
    guardarExpedienteNuevo: async function() {
        const contadorRef = doc(db, "metadata", "configuracion");
        const expedientsColl = collection(db, "expedientes");

        try {
            const idFinal = await runTransaction(db, async (transaction) => {
                const contadorDoc = await transaction.get(contadorRef);
                const numeroActual = contadorDoc.exists() ? (contadorDoc.data().ultimo_numero || 0) : 0;

                const nouNumero = numeroActual + 1;
                const anyActual = new Date().getFullYear();
                const numFormatejat = `UA${anyActual}-${nouNumero.toString().padStart(3, '0')}`;

                const dadesExpedient = {
                    numero_expediente: numFormatejat,
                    estado: "Activo",
                    fecha_apertura: serverTimestamp(),
                    dades_personals: {
                        nom: document.getElementById('in-nom').value,
                        cognoms: document.getElementById('in-cognoms').value,
                        dni: document.getElementById('in-dni').value,
                        telefon: document.getElementById('in-tel1').value || "",
                        data_naixement: document.getElementById('in-data-naixement')?.value || ""
                    },
                    salut: {
                        te_alergies: document.getElementById('in-te-alergies').value,
                        dependencia: document.getElementById('in-dependencia').value,
                        grau: document.getElementById('in-grau').value || "Cap",
                        diagnostics: document.getElementById('in-diagnostics')?.value || ""
                    },
                    socio_laboral: {
                        estudis: document.getElementById('in-estudis').value || "",
                        laboral: document.getElementById('in-situacio-laboral').value || "",
                        origen: document.getElementById('in-origen').value || ""
                    }
                };

                transaction.set(contadorRef, { ultimo_numero: nouNumero }, { merge: true });
                const nouDocRef = doc(expedientsColl);
                transaction.set(nouDocRef, dadesExpedient);

                return numFormatejat;
            });

            alert("✅ Expedient creat correctament: " + idFinal);
            window.location.href = "dades-totals.html";

        } catch (error) {
            console.error("Error al guardar:", error);
            alert("❌ Error de connexió: " + error);
        }
    },

    // 2. BUSCAR POR ID
    buscarPerID: async function(idBuscat) {
        try {
            const q = query(collection(db, "expedientes"), where("numero_expediente", "==", idBuscat));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return { id_db: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
            }
            return null;
        } catch (error) {
            console.error("Error al buscar ID:", error);
            return null;
        }
    }
};

// ===================================================
// --- GESTIÓ D'USUARIS I SESSIONS (Auth Real) ---
// ===================================================

const SESSION_KEY = 'nexe_session';

export const Auth = {
    // LOGIN ACTUALIZADO: Maneja el mapa de permisos para las 3 suites
    login: async function(email, password) {
        try {
            const q = query(
                collection(db, "usuarios"), 
                where("email", "==", email), 
                where("pass", "==", password)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                
                // Estructura de sesión con permisos garantizados
                const userSession = {
                    uid: querySnapshot.docs[0].id,
                    nombre: userData.nombre,
                    email: userData.email,
                    role: userData.role || 'editor',
                    // Si el usuario no tiene el mapa de permisos en la BD, lo generamos por defecto
                    permisos: userData.permisos || {
                        psy: (userData.role === 'admin' || userData.email === 'admin@nexesocial.com') ? 'admin' : 'none',
                        audit: (userData.role === 'admin' || userData.email === 'admin@nexesocial.com') ? 'admin' : 'none',
                        admin: (userData.role === 'admin' || userData.email === 'admin@nexesocial.com') ? 'admin' : 'none'
                    }
                };

                sessionStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error login:", error);
            return false;
        }
    },

    logout: function() {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = "index.html";
    },

    checkAccess: function() {
        const session = sessionStorage.getItem(SESSION_KEY);
        if (!session) {
            window.location.href = "index.html";
            return false;
        }
        return true;
    },

    // Nueva utilidad para verificar permisos rápidamente desde el código
    hasPermission: function(suite) {
        const user = this.getUser();
        if (!user) return false;
        if (user.role === 'admin' || user.email === 'admin@nexesocial.com') return true;
        return user.permisos && user.permisos[suite] && user.permisos[suite] !== 'none';
    },

    getUser: function() {
        const session = sessionStorage.getItem(SESSION_KEY);
        return session ? JSON.parse(session) : null;
    }
};

// Compatibility bridge: many legacy pages still read these as globals.
window.calcularEdat = calcularEdat;
window.DB_Tools = DB_Tools;
window.Auth = window.Auth || Auth;