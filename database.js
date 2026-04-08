// ==========================================
// --- SIMULACIÓ DE BASE DE DADES (Nexe) ---
// ==========================================

// 1. Dades inicials de prova (Expedients i Salut)
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
    ]
};

// Funció per calcular l'edat
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

// 2. Lògica de Persistència (LocalStorage)
const DB_KEY = 'nexe_persones';

if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(dadesInicials.expedients));
}

let expedientsData = JSON.parse(localStorage.getItem(DB_KEY));

// Migració i càlcul automàtic d'edats
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

// Objecte Global BBDD
const BBDD = {
    expedients: expedientsData,
    activitats: [],
    families: [
        {
            id: "FAM-0001",
            cognoms_referencia: "García Martí",
            membres: ["U2026/01", "U2026/03"],
            data_creacio: "2026-04-05",
            observacions: "Unitat de convivència estable."
        }
    ]
};

function desatElectronic() {
    localStorage.setItem(DB_KEY, JSON.stringify(BBDD.expedients));
    console.log("💾 BBDD sincronitzada correctament");
}

// 3. Eines de Gestió (DB_Tools)
const DB_Tools = {
    generarNouID: function() {
        const anyActual = new Date().getFullYear();
        const total = BBDD.expedients.length + 1;
        return `U${anyActual}/${total.toString().padStart(2, '0')}`;
    },
    generarIdFamilia: function() {
        return "FAM-" + String(BBDD.families.length + 1).padStart(4, '0');
    },
    reiniciarDemo: function() {
        localStorage.removeItem(DB_KEY);
        localStorage.removeItem('nexe_usuarios');
        location.reload();
    }
};

// ===================================================
// --- GESTIÓ D'USUARIS, SESSIONS I SEGURETAT ---
// ===================================================

const USERS_KEY = 'nexe_usuarios';
const SESSION_KEY = 'nexe_session';

const usuariosIniciales = [
    { 
        id: "ADMIN-01", 
        nombre: "Administrador Nexe", 
        email: "admin@nexesocial.com", 
        pass: "1234",
        role: "admin", // Afegit rol per a major seguretat
        permisos: {
            psy: "admin",
            audit: "admin",
            rrhh: "admin",
            subv: "admin"
        }
    }
];

// Inicialitzar usuaris si no existeixen
if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(usuariosIniciales));
}

const Auth = {
    login: function(email, password) {
        const usuarios = JSON.parse(localStorage.getItem(USERS_KEY));
        const user = usuarios.find(u => u.email === email && u.pass === password);
        
        if (user) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
            return true;
        }
        return false;
    },

    logout: function() {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = "index.html";
    },

    checkAccess: function(suiteNombre) {
        const session = sessionStorage.getItem(SESSION_KEY);
        if (!session) {
            window.location.href = "index.html";
            return false;
        }
        
        const user = JSON.parse(session);

        // CLAU MESTRA: Si ets l'admin o tens el rol d'admin, entres a tot arreu
        if (user.email === "admin@nexesocial.com" || user.role === "admin") {
            return true;
        }

        const permiso = user.permisos ? user.permisos[suiteNombre] : null;

        if (!permiso || permiso === "none") {
            alert("No tens autorització per entrar a Nexe" + suiteNombre.toUpperCase());
            window.location.href = "index.html"; 
            return false;
        }
        return true;
    },

    getUser: function() {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    }
};

// Inicialització final
desatElectronic();