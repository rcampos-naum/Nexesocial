// ==========================================
// --- SIMULACIÓ DE BASE DE DADES (Nexe) ---
// ==========================================

// 1. Dades inicials de prova (Expedients i Salut)
const dadesInicials = {
    expedients: [
        { 
            id: "U2026/01",         // ID NexeSocial
            id_psy: "EXP-2024-001", // ID NexePsy (Enllaçat)
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
            // Camps ampliats per a l'àrea clínica (NexePsy)
            genograma: "https://via.placeholder.com/600x400?text=Genograma+Marc+García", 
            estat_expedient: "obert", // obert / tancat
            motiu_tancament: "",
            salut: { 
                alergies: { ambientals: ["Pols"], medicaments: [], alimentaries: ["Lactosa"] }, 
                tda: "No", tdha: "Sí", dependencia: "No", grau: "", 
                diagnostics: "F90.1 Trastorn d'activitat de l'atenció i hipercinètic.",
                observacions: "Requereix seguiment de dinàmiques post-trauma i reforç en habilitats socials." 
            }
        },
        { 
            id: "U2026/02", 
            id_psy: "EXP-2024-002", 
            nom: "Pol", 
            cognoms: "Sánchez Pérez", 
            dni: "12312312K",
            dataNaixement: "2009-11-02", 
            tipus: "menor",
            edat: 0, 
            programes: ["PROG-JOVE"],
            vincles_detallats: [],
            genograma: null,
            estat_expedient: "obert",
            motiu_tancament: "",
            salut: { 
                alergies: { ambientals: [], medicaments: [], alimentaries: [] }, 
                tda: "No", tdha: "No", dependencia: "No", grau: "", 
                diagnostics: "", 
                observacions: "Pendent d'avaluació inicial de xarxa social." 
            }
        },
        { 
            id: "U2026/03", 
            id_psy: null, 
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
            genograma: null,
            estat_expedient: "obert",
            motiu_tancament: "",
            salut: { 
                alergies: { ambientals: [], medicaments: [], alimentaries: [] }, 
                tda: "No", tdha: "No", dependencia: "No", grau: "", 
                diagnostics: "", 
                observacions: "" 
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

// Migració: Assegurar que els nous camps existeixen per a registres antics
expedientsData = expedientsData.map(usuari => {
    if (!usuari.salut) usuari.salut = {};
    if (usuari.salut.diagnostics === undefined) usuari.salut.diagnostics = "";
    if (usuari.salut.observacions === undefined) usuari.salut.observacions = "";
    if (usuari.genograma === undefined) usuari.genograma = null;
    if (usuari.estat_expedient === undefined) usuari.estat_expedient = "obert";
    
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
    buscarPerID: function(idBuscat) {
        return BBDD.expedients.find(u => u.id === idBuscat || u.id_psy === idBuscat);
    },
    // NOVA FUNCIÓ: Actualitza dades específiques d'un usuari i desa
    actualitzar: function(id, dadesNoves) {
        const index = BBDD.expedients.findIndex(u => u.id === id || u.id_psy === id);
        if (index !== -1) {
            // Fusió profunda simple per a l'objecte salut si cal
            if (dadesNoves.salut) {
                BBDD.expedients[index].salut = { ...BBDD.expedients[index].salut, ...dadesNoves.salut };
                delete dadesNoves.salut;
            }
            // Fusió de la resta de camps
            BBDD.expedients[index] = { ...BBDD.expedients[index], ...dadesNoves };
            desatElectronic();
            return true;
        }
        return false;
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
        role: "admin",
        permisos: {
            psy: "admin",
            audit: "admin",
            rrhh: "admin",
            subv: "admin"
        }
    }
];

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
        if (user.email === "admin@nexesocial.com" || user.role === "admin") return true;

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

desatElectronic();