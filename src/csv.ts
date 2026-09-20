import { MAX_ROWS, validateRows, type Observation } from './engine';
export const MAX_BYTES = 2_000_000;
/** Strict two-column CSV parser. No identifiers or arbitrary text are accepted. */
export function parseCsv(source: string): Observation[] {
  if (new TextEncoder().encode(source).length > MAX_BYTES)
    throw new Error('CSV exceeds the 2 MB limit.');
  const text = source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const records: string[][] = [];
  let record: string[] = [],
    field = '',
    quoted = false,
    closed = false;
  const flushField = () => {
    record.push(field);
    field = '';
    closed = false;
  };
  const flushRow = () => {
    flushField();
    records.push(record);
    record = [];
    if (records.length > MAX_ROWS + 1)
      throw new Error('CSV exceeds 50,000 observations.');
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === ',') flushField();
    else if (c === '\n') flushRow();
    else if (c === '"' && !field && !closed) quoted = true;
    else {
      if (closed || c === '"') throw new Error('Malformed CSV quoting.');
      field += c;
    }
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  if (field.length || record.length || closed) flushRow();
  const header = records.shift()?.map((x) => x.trim().toLowerCase());
  if (
    !header ||
    header.length !== 2 ||
    !header.includes('score') ||
    !header.includes('label')
  )
    throw new Error(
      'CSV must contain exactly two columns: score,label. Remove identifiers and extra columns.',
    );
  const scoreIndex = header.indexOf('score'),
    labelIndex = header.indexOf('label');
  const decimal = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  const rows = records.map((columns, i): Observation => {
    if (columns.length !== 2)
      throw new Error('Row ' + (i + 2) + ': expected two values.');
    const score = columns[scoreIndex].trim(),
      label = columns[labelIndex].trim();
    if (
      !decimal.test(score) ||
      !['0', '1'].includes(label) ||
      Number(score) < 0 ||
      Number(score) > 1 ||
      !Number.isFinite(Number(score))
    )
      throw new Error(
        'Row ' + (i + 2) + ': score must be 0–1 and label must be 0 or 1.',
      );
    return { score: Number(score), label: Number(label) as 0 | 1 };
  });
  validateRows(rows);
  return rows;
}
