// --- SIMULACIÓ DE BASE DE DADES (Demo Mode) ---

// 1. Dades inicials de prova amb el nou format de ID, Perfils y Salut
const dadesInicials = {
    expedients: [
        { 
            id: "U2026/01", 
            nom: "Marc", 
            cognoms: "García Martí", 
            dni: "44556677L",
            dataNaixement: "2011-03-15", 
            tipus: "menor",
            edat: 0, 
            programes: ["PROG-JOVE"],
            vincles_detallats: [
                { nom: "Laura Martí", relacio: "Mare", id_vincle: "U2026/03" }
            ],
            salut: { 
                alergies: { ambientals: ["Pols"], medicaments: [], alimentaries: ["Lactosa"] }, 
                tda: "No", tdha: "Sí", dependencia: "No", grau: "", observacions: "" 
            }
        },
        { 
            id: "U2026/02", 
            nom: "Pol", 
            cognoms: "Sánchez Pérez", 
            dni: "12312312K",
            dataNaixement: "2009-11-02", 
            tipus: "menor",
            edat: 0, 
            programes: ["PROG-JOVE"],
            vincles_detallats: [],
            salut: { 
                alergies: { ambientals: [], medicaments: [], alimentaries: [] }, 
                tda: "No", tdha: "No", dependencia: "No", grau: "", observacions: "" 
            }
        },
        { 
            id: "U2026/03", 
            nom: "Laura", 
            cognoms: "Martí Sole", 
            dni: "33221144P",
            dataNaixement: "1985-05-20", 
            tipus: "adult",
            edat: 0, 
            programes: [],
            vincles_detallats: [
                { nom: "Marc García", relacio: "Fill", id_vincle: "U2026/01" }
            ],
            salut: { 
                alergies: { ambientals: [], medicaments: [], alimentaries: [] }, 
                tda: "No", tdha: "No", dependencia: "No", grau: "", observacions: "" 
            }
        }
    ],
    activitats: []
};

// Funció per calcular l'edat de forma precisa
function calcularEdat(dataNaixement) {
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

// 2. Lògica de Persistència
const DB_KEY = 'nexe_persones';

if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(dadesInicials.expedients));
}

// Carreguem les dades
let expedientsData = JSON.parse(localStorage.getItem(DB_KEY));

// --- MIGRACIÓ I MANTENIMENT ---
// Asegurem que tots els expedients tinguin l'estructura de salut si no existeix
expedientsData = expedientsData.map(usuari => {
    if (!usuari.salut) {
        usuari.salut = { 
            alergies: { ambientals: [], medicaments: [], alimentaries: [] }, 
            tda: "No", tdha: "No", dependencia: "No", grau: "", observacions: "" 
        };
    }
    if (usuari.dataNaixement) {
        usuari.edat = calcularEdat(usuari.dataNaixement);
    }
    return usuari;
});

// Objecte global per accedir des de qualsevol fitxer
const BBDD = {
    expedients: expedientsData,
    activitats: [] 
};

// 3. Funció per guardar canvis (Desat Electrònic)
function desatElectronic() {
    localStorage.setItem(DB_KEY, JSON.stringify(BBDD.expedients));
    console.log("💾 BBDD sincronitzada correctament");
}

// 4. Eines de gestió de dades (DB_Tools)
const DB_Tools = {
    generarNouID: function() {
        const anyActual = new Date().getFullYear();
        const total = BBDD.expedients.length + 1;
        const numCorrelatiu = total.toString().padStart(2, '0');
        return `U${anyActual}/${numCorrelatiu}`;
    },

    vincularUsuariAPrograma: function(idUsuari, idPrograma) {
        const usuari = BBDD.expedients.find(u => u.id === idUsuari);
        if (usuari && !usuari.programes.includes(idPrograma)) {
            usuari.programes.push(idPrograma);
            desatElectronic();
            return true;
        }
        return false;
    },

    reiniciarDemo: function() {
        localStorage.removeItem(DB_KEY);
        location.reload();
    }
};

// Inicialitzem el desat per fixar canvis de migració o edats calculades
desatElectronic();
// Añadir esto a tu archivo database.js
BBDD.families = [
    {
        id: "FAM-0001",
        cognoms_referencia: "García Martí", // Corregido según tus datos iniciales
        membres: ["U2026/01", "U2026/03"], // Marc y Laura que sí existen en tu BBDD
        data_creacio: "2026-04-05",
        observacions: "Unitat de convivència estable."
    }
];

// Función para generar nuevo ID de familia
function generarIdFamilia() {
    const ultimId = BBDD.families.length;
    return "FAM-" + String(ultimId + 1).padStart(4, '0');
}
// --- NUEVA SECCIÓN: GESTIÓN DE USUARIOS Y PERMISOS ---
const USERS_KEY = 'nexe_usuarios';
const SESSION_KEY = 'nexe_session'; // Aquí guardamos quién ha entrado

// 1. Usuarios iniciales (El primer usuario funcional: TÚ)
const usuariosIniciales = [
    { 
        id: "ADMIN-01", 
        nombre: "Administrador Nexe", 
        email: "admin@nexesocial.com", 
        pass: "1234", // En un entorno real, esto iría encriptado
        permisos: {
            psy: "admin",
            audit: "admin",
            rrhh: "admin",
            subv: "admin"
        }
    }
];

// Inicializar BD de usuarios si no existe
if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(usuariosIniciales));
}

// Objeto Global de Seguridad
const Auth = {
    // Intentar hacer login
    login: function(email, password) {
        const usuarios = JSON.parse(localStorage.getItem(USERS_KEY));
        const user = usuarios.find(u => u.email === email && u.pass === password);
        
        if (user) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
            return true;
        }
        return false;
    },

    // Cerrar sesión
    logout: function() {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = "login.html";
    },

    // VERIFICACIÓN CRÍTICA: ¿Puede entrar en esta suite?
    checkAccess: function(suiteNombre) {
        const session = sessionStorage.getItem(SESSION_KEY);
        if (!session) {
            window.location.href = "login.html"; // Si no hay sesión, fuera.
            return false;
        }
        
        const user = JSON.parse(session);
        const permiso = user.permisos[suiteNombre];

        if (!permiso || permiso === "none") {
            // Si no tiene permiso, lo mandamos al inicio con un aviso
            alert("No tens autorització per entrar a Nexe" + suiteNombre.toUpperCase());
            window.location.href = "index.html"; 
            return false;
        }
        return true;
    },

    // Obtener datos del usuario actual para poner su nombre en el Sidebar
    getUser: function() {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    }
};