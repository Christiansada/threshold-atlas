import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/csv';
describe('CSV trust boundary', () => {
  it('accepts BOM, CRLF, quoted headers, reversed columns, and scientific scores', () => {
    expect(parseCsv('\uFEFF"label","score"\r\n1,"5e-1"\r\n0,0\r\n')).toEqual([
      { score: 0.5, label: 1 },
      { score: 0, label: 0 },
    ]);
  });
  it.each([
    '',
    'score,label\n',
    'score,label,name\n.5,1,person',
    'score,score\n.5,.6',
    'score,label\n,1',
    'score,label\nInfinity,1',
    'score,label\n0x1,1',
    'score,label\n.5,2',
    'score,label\n1.01,1',
    'score,label\n-0.1,0',
    'score,label\n.5,1\n\n',
    'score,label\n".5,1',
    'score,label\n".5"x,1',
    'score,label\n.5,1,0',
    'score,label\n"=1+1",1',
    'score,label\n"<script>",1',
    'score,label\n"0""1",1',
  ])('rejects malformed or ambiguous input without dropping rows: %s', (csv) =>
    expect(() => parseCsv(csv)).toThrow(),
  );
  it('reports the location of an invalid value', () =>
    expect(() => parseCsv('score,label\n.4,1\nno,0')).toThrow('Row 3'));
  it('enforces byte and row limits', () => {
    expect(() => parseCsv('x'.repeat(2_000_001))).toThrow('2 MB');
    expect(() => parseCsv('score,label\n' + '0,0\n'.repeat(50_001))).toThrow(
      '50,000',
    );
  });
});
