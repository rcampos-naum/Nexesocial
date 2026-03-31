// --- SIMULACIÓ DE BASE DE DADES (Demo Mode) ---

// 1. Dades inicials de prova
// NOTA: He añadido 'dataNaixement' a los ejemplos porque si no, no hay nada que calcular.
const dadesInicials = {
    expedients: [
        { id: "EXP-001", nom: "Marc", cognoms: "García", dataNaixement: "2011-03-15", edat: 0, programes: ["PROG-JOVE"] },
        { id: "EXP-002", nom: "Laia", cognoms: "Martí", dataNaixement: "2013-07-20", edat: 0, programes: [] },
        { id: "EXP-003", nom: "Pol", cognoms: "Sánchez", dataNaixement: "2009-11-02", edat: 0, programes: ["PROG-JOVE"] },
        { id: "EXP-004", nom: "Júlia", cognoms: "López", dataNaixement: "2016-01-10", edat: 0, programes: [] },
        { id: "EXP-005", nom: "Èric", cognoms: "Vila", dataNaixement: "2010-05-25", edat: 0, programes: [] }
    ],
    activitats: []
};

// Función para calcular la edad (Mantenemos la tuya pero aseguramos que devuelva número)
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

// 2. Lògica de Persistent/Càrrega
if (!localStorage.getItem('NexeSocial_DB')) {
    localStorage.setItem('NexeSocial_DB', JSON.stringify(dadesInicials));
}

const BBDD = JSON.parse(localStorage.getItem('NexeSocial_DB'));

// --- CAMBIO CLAVE: Autocalcular y sincronizar al cargar ---
BBDD.expedients.forEach(usuari => {
    if (usuari.dataNaixement) {
        usuari.edat = calcularEdat(usuari.dataNaixement);
    }
});
// Guardamos inmediatamente para que el .edat deje de ser 0 o undefined en la ficha
desatElectronic();

// 3. Funció per guardar canvis
function desatElectronic() {
    localStorage.setItem('NexeSocial_DB', JSON.stringify(BBDD));
    console.log("💾 BBDD actualitzada i edats calculades");
}

// 4. Funcions auxiliars
const DB_Tools = {
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
        localStorage.removeItem('NexeSocial_DB');
        location.reload();
    }
};