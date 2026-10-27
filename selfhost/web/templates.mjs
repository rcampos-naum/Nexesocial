import { firebaseTemplates } from './firebase-adapter.mjs';
// Initial field catalogue adapted from public/centre-dia-docs.html.
// Layout and complete fidelity to the nine original files remain acceptance checks.
const field = (key, label, type = 'text', options) => ({ key, label, type, options });
const notes = field('observacions', 'Observacions', 'textarea');
const ratings = ['Molt bona', 'Bona', 'Regular', 'Malament'];
const study = ['Organització / planificació', 'Ús de l’agenda', 'Competències socials', 'Matemàtiques', 'Competències lingüístiques', 'Higiene de l’espai i cura del material', 'Seguiment de les tasques escolars', 'Assistència i implicació al reforç', 'Autonomia per fer les tasques', 'Implicació a l’escola', 'Participació i integració al grup', 'Vincles positius amb adults', 'Vincles positius amb iguals'];
const dimensions = ['Compliment de normes grupals', 'Relació entre iguals, respecte i acceptació', 'Participació i implicació', 'Comunicació i escolta', 'Treball en equip i cooperació', 'Responsabilitat', 'Autoestima i seguretat', 'Autonomia personal', 'Empatia i suport entre iguals', 'Sentiment de pertinença', 'Regulació emocional i frustració', 'Resolució de conflictes', 'Vincle amb l’educador/a'];
const rated = (labels, prefix, options) => labels.flatMap((label, i) => [field(`${prefix}_${i}`, label, 'select', options), field(`${prefix}_${i}_notes`, `Observacions · ${label}`, 'textarea')]);
const identification = [field('escola', 'Escola i curs'), field('programes', 'Programes de participació'), field('la_caixa', 'Vinculació a La Caixa'), field('voluntaris', 'Voluntaris/es de referència'), field('grup', 'Grup de referència')];
const evaluation = [...identification, ...rated(study, 'competencia', ratings).map(f => ({ ...f, requiredOnFinal: true })), field('evolucio', 'Evolució i objectius', 'textarea'), notes];
// These are activity/experience questions from the children's survey, not clinical dimensions.
const surveyItems = ['Tiempo de repaso', 'Ayuda para hacer los deberes', 'Materiales del aula para hacer los deberes', 'Psicomotricidad', 'Manualidades', 'Quedada a dormir', 'Parque', 'Salidas', 'Formaciones', 'Talleres con el ordenador', 'Actividades de aula', 'Dinámicas con psicóloga del centro de día', 'Juego libre', 'Just Dance', 'Talleres de habilidades sociales', 'Gincanas', 'Deportes', 'Cine', 'Pyssla', 'Sala coordinadora', 'Salidas al parque', 'Excursión a La Caixa', 'Juegos de mesa', 'Juegos de patio', 'Cómo te sientes con tu grupo', 'Relación con compañeros/as', 'Relación con educadores/as', 'Relación con voluntarios/as', 'Materiales y juegos de las aulas', 'Instalaciones: patio y aulas', 'Fiesta de Reyes', 'Chocolatada', 'Excursión Castillo de Bellver', 'Torrada Sant Antoni', 'Palma Jump', 'CESAG', 'Among Us'];
export const surveyLabels = ['Positiva', 'Neutra', 'Negativa', 'No ha participado / sin respuesta'];
const plan = [field('mes', 'Mes'), field('rutina', 'Rutina setmanal', 'textarea'), field('activitats', 'Activitats: setmana, nom, desenvolupament, objectius i material', 'textarea'), ...rated(['Participació activa dels infants', 'Actitud del voluntariat', 'Adequació de les dinàmiques', 'Materials disponibles', 'Reflexió i expressió', 'Assoliment dels objectius', 'Motivació i interès', 'Cohesió del grup'], 'aval', ['1', '2', '3', '4', '5']), field('incidencies', 'Incidències', 'textarea'), field('positius', 'Aspectes positius', 'textarea'), field('millora', 'Propostes de millora', 'textarea'), notes];
export const templates = {
  ...firebaseTemplates,
  diary: { label: 'Diari individual', scope: 'person', source: 'DIARI 2025-26.xlsx', fields: [{ ...field('mes', 'Mes de seguiment', 'month'), requiredOnFinal: true }, ...identification, field('assist_raco', 'Assistència mensual al racó: sessions presents o amb retard', 'number'), field('assist_ludiques', 'Assistència mensual a activitats lúdiques: sessions presents o amb retard', 'number'), ...rated(['Organitza i planifica les tasques', 'Du l’agenda i material', 'Seguiment de les tasques', 'Autonomia en les tasques', 'Implicació a l’escola', 'Participa positivament', 'Se sent bé al grup', 'Vincles amb adults', 'Vincles amb iguals', 'Gestió de conflictes', 'Identifica i gestiona emocions', 'Puntualitat', 'Supervisió familiar adequada', 'Context familiar segur'], 'indicador', ratings), field('esport', 'Participa en esport o moviment', 'select', ['Sí', 'No']), field('berenar', 'Berenar saludable', 'select', ['Sí', 'No']), notes] },
  observation: { label: 'Diari d’observació', scope: 'person', source: 'Diario de observación.xlsx', fields: [field('observacio', 'Observació del dia', 'textarea')] },
  evaluation1: { label: '1a avaluació · desembre', scope: 'person', source: '1ºaval I 2º AVAL PLANTILLA 25-26 (DES I MARÇ).xlsx', fields: evaluation },
  evaluation2: { label: '2a avaluació · març', scope: 'person', source: '1ºaval I 2º AVAL PLANTILLA 25-26 (DES I MARÇ).xlsx', fields: evaluation },
  evaluationFinal: { label: 'Avaluació final · juny', scope: 'person', source: 'AVAL FINAL PLANTILLA 25-26 (JUNY).xlsx', fields: evaluation },
  generalEvaluation: { label: 'Encuesta de evaluación del niño/a', scope: 'person', source: 'EVALUACION NIÑOS 2025-2026 CENTRE DE DIA.docx', fields: [field('grup', 'Grupo'), ...surveyItems.map((label, i) => field(`enquesta_${i}`, label, 'select', surveyLabels)), field('observacions', 'Observaciones', 'textarea'), field('suggeriments', 'Qué te gustaría hacer el próximo año', 'textarea'), field('queixes', 'Quejas sobre el funcionamiento del centro', 'textarea')] },
  groupFollowup: { label: 'Observació i seguiment grupal', scope: 'group', source: 'REGISTRE OBSERVACIÓ I SEGUIMENT GRUPAL NUEVO.docx', fields: [field('trimestre', 'Trimestre', 'select', ['1r', '2n', '3r']), field('participants', 'Nombre de participants', 'number'), field('edat', 'Rang d’edat'), ...rated(dimensions, 'dim', Array.from({ length: 10 }, (_, i) => String(i + 1))), ...[1, 2, 3].flatMap(i => [field(`objectiu_${i}`, `Objectiu / competència ${i}`), ...[1, 2, 3].map(t => field(`objectiu_${i}_t${t}`, `Objectiu ${i} · valoració trimestre ${t}`, 'select', Array.from({ length: 10 }, (_, n) => String(n + 1))))]), field('evolucio', 'Evolució respecte als objectius', 'textarea'), field('fortaleses', 'Fortaleses del grup', 'textarea'), field('millores', 'Aspectes a millorar', 'textarea'), field('estrategies', 'Estratègies, tècniques i recursos utilitzats', 'textarea'), field('evidencies', 'Descripció d’evidències gràfiques o documentals', 'textarea'), field('projeccions', 'Projeccions per al pròxim trimestre', 'textarea'), notes] },
  activityPlan: { label: 'Planificació i avaluació d’activitats', scope: 'group', source: 'PLANIFICACIÓ I AVALUACIÓ ACTIVITATS 25-26.odt', fields: plan },
  tribuPlan: { label: 'Planificació i avaluació Tribu', scope: 'group', source: 'PLANIFICACIÓ I AVALUACIÓ TRIBU PLANTILLA.doc', fields: plan },
  groupEvaluation: { label: 'Resumen de la evaluación del grupo', scope: 'group', source: 'EVALUACION NIÑOS 2025-2026 CENTRE DE DIA.docx', fields: [field('enquestes', 'Número de encuestas recogidas', 'number'), field('resultats', 'Resultados por actividad: positivas, neutras, negativas y no participantes', 'textarea'), field('assistencia', 'Asistencia y evolución del grupo', 'textarea'), field('caracteristiques', 'Características y necesidades del grupo', 'textarea'), field('casos_prioritaris', 'Casos que requieren seguimiento prioritario', 'textarea'), field('comportament', 'Convivencia y comportamiento', 'textarea'), field('funcionen', 'Actividades que mejor y peor han funcionado y por qué', 'textarea'), field('sortides', 'Valoración de las salidas', 'textarea'), field('organitzacio', 'Organización, materiales e instalaciones', 'textarea'), field('propostes', 'Propuestas de mejora y coordinación', 'textarea'), notes] },
};

// Presentation groups only: field keys, values and validation stay unchanged.
export function reportSections(type, fields) {
  const remaining = new Set(fields.map(f => f.key)), sections = [];
  const take = (title, icon, match) => { const chosen=fields.filter(f=>remaining.has(f.key)&&match(f.key)); if(chosen.length) { sections.push({title,icon,fields:chosen}); chosen.forEach(f=>remaining.delete(f.key)); } };
  const keys = (...names) => key => names.includes(key);
  if(type==='diary') {
    take('Període de seguiment','calendar',keys('mes'));
    take('ACONSEGUIR UNA ASSISTÈNCIA ESTABLE I CONTINUADA','calendar',key=>key.startsWith('assist_'));
    take('MILLORAR ELS HÀBITS D’ESTUDI','edit',key=>/^indicador_[0-4](_notes)?$/.test(key));
    take('MILLORAR LES RELACIONS INTERPERSONALS','users',key=>/^indicador_([5-9]|10)(_notes)?$/.test(key));
    take('DETECTAR SITUACIONS DE RISC','alert',key=>/^indicador_(11|12|13)(_notes)?$/.test(key));
    take('MILLORAR ELS HÀBITS DE VIDA SALUDABLE','check',keys('esport','berenar'));
    take('Informació addicional','pin',keys('escola','programes','la_caixa','voluntaris','grup','observacions'));
  } else if(type.startsWith('evaluation')) {
    take('Informació del beneficiari/ària','id',keys('escola','programes','la_caixa','voluntaris','grup'));
    take('REFORÇ EDUCATIU','edit',key=>/^competencia_([0-9]|10)(_notes)?$/.test(key));
    take('ACTIVITATS LÚDIQUES','users',key=>/^competencia_(11|12)(_notes)?$/.test(key));
    take('Evolució i observacions','pin',keys('evolucio','observacions'));
  } else if(type==='groupFollowup') {
    take('1. DADES GENERALS','id',keys('trimestre','participants','edat'));
    take('2. OBSERVACIÓ I VALORACIÓ (1 = molt baix / 10 = molt alt)','chart',key=>key.startsWith('dim_'));
    take('3. OBJECTIUS I EVOLUCIÓ TRIMESTRAL','target',key=>key.startsWith('objectiu_')||key==='evolucio');
    take('4. FORTALESES, ASPECTES A MILLORAR I ESTRATÈGIES','flag',keys('fortaleses','millores','estrategies'));
    take('6. EVIDÈNCIES GRÀFIQUES O DOCUMENTALS','edit',keys('evidencies'));
    take('7. OBSERVACIONS FINALS I PROJECCIONS PER AL PROPER TRIMESTRE','pin',keys('projeccions','observacions'));
  } else if(type==='activityPlan'||type==='tribuPlan') {
    take('Període i rutina setmanal','calendar',keys('mes','rutina'));
    take('Activitats planificades','calendar',keys('activitats'));
    take('Ítems d’avaluació per sessió','chart',key=>key.startsWith('aval_'));
    take('Valoració global del mes','check',keys('incidencies','positius','millora','observacions'));
  } else if(type==='observation') take('Diari d’observació','eye',()=>true);
  else if(type==='generalEvaluation') {
    take('Dades del grup','id',keys('grup'));
    take('Valoració de les activitats i experiències','clipboard',key=>key.startsWith('enquesta_'));
    take('Observacions i propostes','pin',()=>true);
  } else if(type==='groupEvaluation') {
    take('Resum de l’avaluació del grup','chart',key=>key!=='propostes'&&key!=='observacions');
    take('Propostes i millores','flag',()=>true);
  }
  take('Informació addicional','pin',()=>true);
  return sections;
}
