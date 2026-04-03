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