// ==========================================
// CENTRAL DE DADES - NEXESOCIAL ERP
// ==========================================

const BBDD = {
    // 1. TAULA D'EXPEDIENTS (GESTIÓ SOCIAL)
    expedients: [
        { 
            id: "EXP-2026-001", 
            dni: "12345678A", 
            nom: "Joan Garcia Rico", 
            estat: "Actiu", 
            dataAlta: "2026-01-15",
            treballador: "Marta Social",
            notes: "Seguiment rutinari mensual."
        }
    ],

    // 2. TAULA D'INFRAESTRUCTURA (SALES I ESPAIS)
    sales: [
        { id: "RMT-S-001", nom: "Sala Naüm", planta: "1ª Planta", capacitat: 15, estat: "Lliure" },
        { id: "RMT-S-002", nom: "Despatx 1", planta: "Planta Baixa", capacitat: 3, estat: "Ocupat" }
    ],

    // 3. TAULA D'INVENTARI (ACTIUS AMB QR)
    actius: [
        { id: "RMT-A-001", nom: "Projector Epson", ubicacio_id: "RMT-S-001", estat: "Operatiu" },
        { id: "RMT-A-002", nom: "Aire Lavanda", ubicacio_id: "RMT-S-002", estat: "Avariat" }
    ],

    // 4. TAULA D'INCIDÈNCIES (MANTENIMENT)
    incidencies: [
        { id: 1, rmt_id: "RMT-A-002", desc: "No encén el comandament", estat: "Pendent", tecnic: "" }
    ]
};

// Funcions per guardar i llegir (Simulant AWS)
function desarDades() {
    localStorage.setItem('NexeSocial_DB', JSON.stringify(BBDD));
}

function carregarDades() {
    const dadesGuardades = localStorage.getItem('NexeSocial_DB');
    if (dadesGuardades) {
        Object.assign(BBDD, JSON.parse(dadesGuardades));
    }
}
BBDD.programes = [
    { id: 'PROG-001', nom: 'Entrega d\'Aliments', responsable: 'Anna Martínez', color: '#3b82f6' },
    { id: 'PROG-002', nom: 'Inserció Laboral', responsable: 'Joan Pere', color: '#10b981' },
    { id: 'PROG-003', nom: 'Acompanyament Jurídic', responsable: 'Marta Soler', color: '#f59e0b' },
    { id: 'PROG-004', nom: 'Suport Psicològic', responsable: 'Carme Riera', color: '#ef4444' }
];