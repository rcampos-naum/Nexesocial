export const areas = [
    ['centre-dia', 'Centre de dia'], ['orientacio', 'Orientació Laboral'],
    ['son-roca', 'Son Roca Activa'], ['formacio', 'Formació'],
    ['espais', 'Espais Familiars'], ['voluntariat', 'Voluntariat']
].map(([id, name]) => ({ id, name }));
export const programs = [
    ['ludiques', 'Activitats Lúdiques', 'centre-dia'], ['reforc', 'Reforç Educatiu', 'centre-dia'],
    ['psicomotricitat', 'Psicomotricitat', 'centre-dia'], ['estiu', "Escola d’Estiu", 'centre-dia'],
    ['son-roca-connecta', 'Son Roca Connecta', 'son-roca'], ['serralta-connecta', 'Serralta Connecta', 'son-roca'],
    ['pqi', 'PQI', 'formacio'], ['sais', 'SAIS', 'formacio']
].map(([id, name, areaId]) => ({ id, name, areaId }));
export const activities = [
    { id: 'demo-digital', name: 'Taller digital · prova', areaId: 'son-roca', programId: 'son-roca-connecta', status: 'active' },
    { id: 'demo-serralta', name: 'Trobada comunitària · prova', areaId: 'son-roca', programId: 'serralta-connecta', status: 'active' },
    { id: 'demo-reforc', name: 'Suport a l’estudi · prova', areaId: 'centre-dia', programId: 'reforc', status: 'active' },
    { id: 'demo-estiu', name: 'Jocs cooperatius · prova', areaId: 'centre-dia', programId: 'estiu', status: 'paused' }
];
