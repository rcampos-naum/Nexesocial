import { personFields } from './person-schema.mjs';

export function ageOn(birth, day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth || '') || birth > day) return null;
  const date = new Date(`${birth}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== birth) return null;
  return Number(day.slice(0,4)) - Number(birth.slice(0,4)) - Number(day.slice(5) < birth.slice(5));
}

// Each person appears once, even when enrolled in more than one selected group.
// Course is the course recorded on a group; it is not a historical profile snapshot.
export function selectedPeople(data, { program = '', course = '', group = '', status = 'active', participation = 'active' } = {}) {
  let ids = null;
  if (group || course) {
    const groups = new Set(data.groups.filter(g => (!program || g.program_id === program) && (!course || g.course === course) && (!group || g.id === group)).map(g => g.id));
    ids = new Set(data.enrollments.filter(e => groups.has(e.group_id) && (participation !== 'active' || e.active)).map(e => e.person_id));
  } else if (program) {
    ids = new Set(data.memberships.filter(m => m.program_id === program && (participation !== 'active' || m.active)).map(m => m.person_id));
  }
  return data.people.filter(p => (!status || (p.status || 'active') === status) && (!ids || ids.has(p.id)));
}

export function totalsFor(people, day) {
  const dimensions = Object.fromEntries(['genere','situacio_admin','situacio_laboral','ingressos','nacionalitat','distribucio_origen','situacio_domicili','membres_unitat_familiar','context_familiar','nivell_educatiu','bretxa_digital'].map(key => [key, {}]));
  dimensions.age = { 'Menores de 18': 0, '18–30': 0, '31–64': 0, '65 o más': 0, 'Sin informar': 0 };
  let sum = 0, known = 0;
  for (const p of people) {
    const profile = JSON.parse(p.profile_json || '{}');
    for (const key of Object.keys(dimensions).filter(key => key !== 'age')) { const value = profile[key] || 'Sin informar'; dimensions[key][value] = (dimensions[key][value] || 0) + 1; }
    const age = ageOn(p.data_naixement, day);
    dimensions.age[age === null ? 'Sin informar' : age < 18 ? 'Menores de 18' : age <= 30 ? '18–30' : age <= 64 ? '31–64' : '65 o más']++;
    if (age !== null) { sum += age; known++; }
  }
  return { total: people.length, averageAge: known ? sum / known : null, ageKnown: known, dimensions };
}

export const dimensionLabel = key => key === 'age' ? 'Edad' : personFields.find(field => field.key === key)?.label || key;
// Protect CSV opened in Excel against formula interpretation, including future categories.
export const csvCell = value => `"${String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
export function summaryCsv(stats, filters = []) {
  const rows = [['Resumen de personas', stats.total], ['Edad media', stats.averageAge === null ? 'Sin informar' : stats.averageAge.toFixed(1)], ['Edad conocida',stats.ageKnown], ...filters, [], ['Dimensión','Categoría','Personas']];
  for (const [key, values] of Object.entries(stats.dimensions)) for (const [label, count] of Object.entries(values)) rows.push([dimensionLabel(key),label,count]);
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
