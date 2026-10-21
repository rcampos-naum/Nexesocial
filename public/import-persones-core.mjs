// Pure validation: no network, browser storage or database writes.
export const FIELDS = [
  ['nom', 'Nom *', ['nom', 'nombre']],
  ['cognoms', 'Cognoms *', ['cognoms', 'apellidos', 'primer apellido', 'primer llinatge']],
  ['segonCognom', 'Segon cognom (si està separat)', ['segundo apellido', 'segon llinatge']],
  ['dni', 'DNI / NIE / document', ['dni', 'nie', 'documento', 'dni nie']],
  ['data_naixement', 'Data de naixement', ['data naixement', 'fecha nacimiento', 'fecha de nacimiento', 'data de naixement']],
  ['telefon', 'Telèfon', ['telefon', 'telefono', 'movil', 'mobil']],
  ['email', 'Correu electrònic', ['email', 'correo', 'correu electronic']],
  ['poblacio', 'Població', ['poblacio', 'poblacion', 'municipio']],
];
export function normalized(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function suggestedMapping(headers) {
  return Object.fromEntries(FIELDS.map(([key, , aliases]) => [key, headers.findIndex(h => aliases.includes(normalized(h)))]));
}
const text = value => String(value ?? '').trim();
export const documentKey = value => text(value).toUpperCase().replace(/[\s.-]/g, '');
export function birthDate(value, { date1904 = false, today = new Date().toISOString().slice(0, 10) } = {}) {
  if (value === '' || value == null) return '';
  let iso;
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0 || (!date1904 && value === 60)) throw new Error('Data Excel no vàlida');
    const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31);
    iso = new Date(epoch + (value - (!date1904 && value > 60 ? 1 : 0)) * 86400000).toISOString().slice(0, 10);
  } else {
    const raw = text(value);
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (m) iso = raw;
    else {
      m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(raw);
      if (!m) throw new Error('Data: utilitza DD/MM/AAAA o AAAA-MM-DD');
      iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
  }
  const date = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso || iso < '1900-01-01' || iso > today) {
    throw new Error('Data de naixement inexistent, futura o anterior a 1900');
  }
  return iso;
}
export function identityKeys(person) {
  const keys = [];
  if (person.dni) keys.push(`document:${documentKey(person.dni)}`);
  if (person.nom && person.cognoms && person.data_naixement) keys.push(`person:${normalized(person.nom)}|${normalized(person.cognoms)}|${person.data_naixement}`);
  return keys;
}
export function validateRows(rows, mapping, options = {}) {
  const selected = Object.values(mapping).filter(i => i >= 0);
  if (new Set(selected).size !== selected.length) throw new Error('Una columna no es pot assignar a dos camps');
  if (!(mapping.nom >= 0) || !(mapping.cognoms >= 0)) throw new Error('Assigna les columnes de nom i cognoms');
  return rows.filter(({ cells }) => cells.some(v => text(v))).map(({ cells, rowNumber, invalidCells = [] }) => {
    const person = Object.fromEntries(FIELDS.map(([key]) => [key, mapping[key] >= 0 ? text(cells[mapping[key]]) : '']));
    const errors = [];
    if (selected.some(i => invalidCells.includes(i))) errors.push('Hi ha fórmules o errors Excel en un camp assignat; substitueix-los per valors');
    person.cognoms = [person.cognoms, person.segonCognom].filter(Boolean).join(' ');
    delete person.segonCognom;
    person.dni = documentKey(person.dni);
    try { person.data_naixement = birthDate(mapping.data_naixement >= 0 ? cells[mapping.data_naixement] : '', options); }
    catch (e) { errors.push(e.message); }
    if (!person.nom || !person.cognoms) errors.push('Falten nom o cognoms');
    if (!person.dni && !person.data_naixement) errors.push('Cal document o data de naixement per comprovar duplicats');
    if (person.dni && !/^[A-Z0-9]{5,20}$/.test(person.dni)) errors.push('Document no vàlid: entre 5 i 20 lletres o dígits');
    if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) errors.push('Correu electrònic no vàlid');
    if (Object.values(person).some(v => v.length > 250)) errors.push('Un camp supera els 250 caràcters');
    return { rowNumber, person, status: errors.length ? 'error' : 'new', messages: errors };
  });
}
export function classifyRows(rows, existing = []) {
  const keys = new Set(existing.flatMap(identityKeys));
  const names = new Map();
  const remember = person => {
    const name = `${normalized(person.nom)}|${normalized(person.cognoms)}`;
    if (!names.has(name)) names.set(name, []);
    names.get(name).push(person);
  };
  existing.forEach(remember);
  return rows.map(row => {
    const result = { ...row, messages: [...row.messages] };
    if (row.status === 'error') return result;
    const person = row.person;
    const ids = identityKeys(person);
    const peers = names.get(`${normalized(person.nom)}|${normalized(person.cognoms)}`) || [];
    if (ids.some(k => keys.has(k))) {
      result.status = 'duplicate';
      result.messages.push('Coincideix amb una fitxa existent o una altra fila; no es modificarà');
    } else if (peers.some(p => !p.data_naixement || !person.data_naixement || p.data_naixement === person.data_naixement)) {
      result.status = 'review';
      result.messages.push('Possible coincidència de nom: revisió manual necessària');
    }
    ids.forEach(k => keys.add(k));
    remember(person);
    return result;
  });
}
