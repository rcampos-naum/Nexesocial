// Local XLSX reader: ZIP/XML via browser APIs, with explicit resource limits.
// Does not execute formulas, macros, external relationships or embedded content.
export async function readWorkbook(buffer) {
  if (buffer.byteLength > 10 * 1024 * 1024) throw new Error('El Excel supera los 10 MB');
  const view = new DataView(buffer); const bytes = new Uint8Array(buffer);
  const u16 = i => view.getUint16(i, true); const u32 = i => view.getUint32(i, true);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (u32(i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('Formato no válido. Guarda el archivo como .xlsx (no .xls antiguo)');
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) throw new Error('ZIP dividido no compatible');
  const count = u16(end + 10); let offset = u32(end + 16);
  if (count > 3000 || offset + u32(end + 12) > end) throw new Error('Excel demasiado complejo');
  const entries = new Map(); const decoder = new TextDecoder(); let total = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || u32(offset) !== 0x02014b50) throw new Error('Índice ZIP no válido');
    const compressed = u32(offset + 20), size = u32(offset + 24), nameLength = u16(offset + 28);
    const next = offset + 46 + nameLength + u16(offset + 30) + u16(offset + 32);
    if (next > end) throw new Error('Índice ZIP truncado');
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    if (entries.has(name) || name.includes('..') || size > 20 * 1024 * 1024 || (total += size) > 50 * 1024 * 1024 || u16(offset + 8) & 1) throw new Error('Excel cifrado, duplicado o demasiado grande');
    entries.set(name, { compressed, size, crc: u32(offset + 16), method: u16(offset + 10), start: u32(offset + 42) }); offset = next;
  }
  async function xml(path) {
    const entry = entries.get(path); if (!entry) throw new Error(`Falta una parte del libro: ${path}`);
    const { start, compressed, size, method } = entry;
    if (start + 30 > bytes.length || u32(start) !== 0x04034b50) throw new Error('Entrada ZIP no válida');
    const dataStart = start + 30 + u16(start + 26) + u16(start + 28);
    if (dataStart + compressed > bytes.length) throw new Error('Entrada ZIP truncada');
    let result;
    if (method === 0) result = bytes.slice(dataStart, dataStart + compressed);
    else if (method === 8) {
      const stream = new Blob([bytes.slice(dataStart, dataStart + compressed)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const reader = stream.getReader(); const chunks = []; let length = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > size || length > 20 * 1024 * 1024) { await reader.cancel(); throw new Error('Parte del Excel demasiado grande'); } chunks.push(value); }
      result = new Uint8Array(length); let pos = 0; for (const chunk of chunks) { result.set(chunk, pos); pos += chunk.length; }
    } else throw new Error('Compresión Excel no compatible');
    if (result.length !== size) throw new Error('Tamaño de entrada incorrecto');
    let crc = 0xffffffff;
    for (const byte of result) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    if (((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw new Error('El archivo Excel está dañado');
    const text = decoder.decode(result); if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('XML no permitido');
    const doc = new DOMParser().parseFromString(text, 'application/xml'); if (doc.querySelector('parsererror')) throw new Error('XML no válido'); return doc;
  }
  const elements = (node, tag) => [...node.getElementsByTagNameNS('*', tag)];
  const book = await xml('xl/workbook.xml'); const relationships = await xml('xl/_rels/workbook.xml.rels');
  const rels = new Map(elements(relationships, 'Relationship').filter(r => r.getAttribute('TargetMode') !== 'External').map(r => [r.getAttribute('Id'), r.getAttribute('Target')]));
  const shared = entries.has('xl/sharedStrings.xml') ? elements(await xml('xl/sharedStrings.xml'), 'si').map(si => elements(si, 't').map(t => t.textContent).join('')) : [];
  const dateStyles = new Set(), zeroPads = new Map();
  if (entries.has('xl/styles.xml')) {
    const styles = await xml('xl/styles.xml'); const formats = new Map(elements(styles, 'numFmt').map(n => [Number(n.getAttribute('numFmtId')), n.getAttribute('formatCode') || '']));
    const xfs = elements(styles, 'cellXfs')[0];
    if (xfs) elements(xfs, 'xf').forEach((xf, i) => { const id = Number(xf.getAttribute('numFmtId')); const format = (formats.get(id) || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, ''); if ((id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58) || /[dy]/i.test(format)) dateStyles.add(i); if (/^0{1,30}$/.test(format)) zeroPads.set(i, format.length); });
  }
  const sheets = elements(book, 'sheet').filter(s => !['hidden', 'veryHidden'].includes(s.getAttribute('state'))).map(s => ({ name: s.getAttribute('name'), relation: s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') }));
  const date1904 = ['1', 'true'].includes(elements(book, 'workbookPr')[0]?.getAttribute('date1904'));
  return { sheets, date1904, async rows(index, headerRow = 1) {
    const sheet = sheets[index]; if (!sheet) throw new Error('Selecciona una hoja');
    const target = rels.get(sheet.relation); if (!target || target.includes('..') || target.includes(':')) throw new Error('Relación de hoja no compatible');
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const document = await xml(path); const result = []; const seenRows = new Set();
    for (const row of elements(document, 'row')) {
      const rowNumber = Number(row.getAttribute('r')); if (rowNumber < headerRow) continue;
      if (!Number.isInteger(rowNumber) || rowNumber > 10000) throw new Error('Demasiadas filas en la hoja');
      if (seenRows.has(rowNumber)) throw new Error('Hay filas repetidas en el Excel'); seenRows.add(rowNumber);
      const cells = [], invalidCells = [];
      for (const cell of elements(row, 'c')) {
        const reference = /^([A-Z]+)(\d+)$/.exec(cell.getAttribute('r') || ''); if (!reference) throw new Error('Celda sin referencia');
        const column = [...reference[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
        if (column > 200) throw new Error('Demasiadas columnas');
        if (Number(reference[2]) !== rowNumber || Object.hasOwn(cells, column)) throw new Error('Referencia de celda no válida');
        const type = cell.getAttribute('t'); const raw = elements(cell, 'v')[0]?.textContent || '';
        let value = type === 's' ? shared[Number(raw)] ?? '' : type === 'inlineStr' ? elements(cell, 't').map(t => t.textContent).join('') : raw;
        // Preserve formatted identifiers/phones as strings; only date cells are numeric.
        if ((!type || type === 'n') && raw !== '' && dateStyles.has(Number(cell.getAttribute('s') || 0))) value = Number(raw);
        else if ((!type || type === 'n') && /^\d+$/.test(raw) && zeroPads.has(Number(cell.getAttribute('s') || 0))) value = raw.padStart(zeroPads.get(Number(cell.getAttribute('s') || 0)), '0');
        if (elements(cell, 'f').length || type === 'e') invalidCells.push(column);
        cells[column] = value;
      }
      if (rowNumber === headerRow || cells.some(value => String(value ?? '').trim()) || invalidCells.length) result.push({ rowNumber, cells, invalidCells });
      if (result.length > 1001) throw new Error('Máximo 1.000 personas por importación');
    }
    if (result[0]?.rowNumber !== headerRow) throw new Error('No hay cabeceras en la fila elegida');
    return { headers: result[0].cells, rows: result.slice(1) };
  } };
}
