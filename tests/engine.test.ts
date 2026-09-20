import { describe, expect, it } from 'vitest';
import {
  evaluate,
  sweep,
  recommend,
  exportSweep,
  type Observation,
  type Policy,
} from '../src/engine';
import { syntheticDemo } from '../src/demo';
const rows: Observation[] = [
  { score: 0.9, label: 1 },
  { score: 0.8, label: 0 },
  { score: 0.5, label: 1 },
  { score: 0.2, label: 0 },
];
const policy: Policy = {
  falsePositiveCost: 1,
  falseNegativeCost: 5,
  capacity: 2,
};
describe('decision arithmetic', () => {
  it('matches hand-calculated inclusive-boundary metrics', () => {
    expect(evaluate(rows, 0.5, policy)).toMatchObject({
      tp: 2,
      fp: 1,
      tn: 1,
      fn: 0,
      flagged: 3,
      precision: 2 / 3,
      recall: 1,
      f1: 0.8,
      loss: 1,
      feasible: false,
    });
  });
  it('finds the lowest feasible loss, not the unconstrained optimum', () => {
    expect(recommend(sweep(rows, policy))).toMatchObject({
      threshold: 0.9,
      flagged: 1,
      loss: 5,
    });
  });
  it('keeps tied scores together when capacity cannot fit them', () => {
    expect(
      recommend(
        sweep(
          [
            { score: 1, label: 1 },
            { score: 1, label: 0 },
          ],
          { ...policy, capacity: 1 },
        ),
      ),
    ).toMatchObject({ threshold: null, flagged: 0 });
  });
  it('includes score endpoints and an explicit flag-none rule', () => {
    const points = sweep(
      [
        { score: 0, label: 1 },
        { score: 1, label: 0 },
      ],
      { ...policy, capacity: 2 },
    );
    expect(points.map((p) => p.flagged)).toEqual([0, 1, 2]);
    expect(
      evaluate([{ score: 1, label: 1 }], 1, { ...policy, capacity: 1 }).tp,
    ).toBe(1);
  });
  it('supports zero capacity and reports undefined metrics honestly', () => {
    expect(recommend(sweep(rows, { ...policy, capacity: 0 }))).toMatchObject({
      threshold: null,
      precision: null,
      recall: 0,
    });
    expect(
      evaluate([{ score: 0, label: 0 }], null, { ...policy, capacity: 0 }),
    ).toMatchObject({ precision: null, recall: null, f1: null });
  });
  it('prefers fewer flagged rows when losses tie', () => {
    expect(
      recommend(
        sweep(rows, {
          ...policy,
          capacity: 4,
          falsePositiveCost: 0,
          falseNegativeCost: 0,
        }),
      ).threshold,
    ).toBeNull();
  });
  it.each([NaN, Infinity, -0.1, 1.1])(
    'rejects invalid score or threshold %s',
    (value) => {
      expect(() =>
        evaluate([{ score: value, label: 1 }], 0.5, { ...policy, capacity: 1 }),
      ).toThrow();
      expect(() => evaluate(rows, value, policy)).toThrow();
    },
  );
  it('rejects empty samples, invalid costs and capacities', () => {
    expect(() => sweep([], policy)).toThrow();
    for (const capacity of [-1, 1.5, 5, NaN])
      expect(() => sweep(rows, { ...policy, capacity })).toThrow();
    for (const cost of [-1, Infinity, 1_000_001])
      expect(() =>
        sweep(rows, { ...policy, falsePositiveCost: cost }),
      ).toThrow();
  });
  it('agrees with a separate brute-force oracle across seeded datasets and policies', () => {
    let seed = 123;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let trial = 0; trial < 80; trial++) {
      const sample: Observation[] = Array.from({ length: 20 }, () => ({
        score: Math.round(random() * 10) / 10,
        label: random() > 0.6 ? 1 : 0,
      }));
      const settings = {
        falsePositiveCost: Math.floor(random() * 5),
        falseNegativeCost: Math.floor(random() * 10),
        capacity: Math.floor(random() * 21),
      };
      const candidates: [number | null, ...number[]] = [
        null,
        ...new Set(sample.map((r) => r.score)),
      ];
      const oracle = candidates
        .map((t) => {
          const flagged = sample.filter((r) => t !== null && r.score >= t);
          const fp = flagged.filter((r) => r.label === 0).length;
          const fn = sample.filter(
            (r) => r.label === 1 && (t === null || r.score < t),
          ).length;
          return {
            threshold: t,
            flagged: flagged.length,
            loss:
              fp * settings.falsePositiveCost + fn * settings.falseNegativeCost,
          };
        })
        .filter((r) => r.flagged <= settings.capacity)
        .sort((a, b) => a.loss - b.loss || a.flagged - b.flagged)[0];
      expect(recommend(sweep(sample, settings))).toMatchObject(oracle);
    }
  });
  it('does not mutate input and exports all attainable numeric decisions', () => {
    const copy = structuredClone(rows);
    const points = sweep(rows, policy);
    expect(rows).toEqual(copy);
    expect(exportSweep(points).trim().split('\n')).toHaveLength(6);
    expect(exportSweep(points)).toContain('none,0,0,2,2,0,,0,0,10,true');
  });
  it('handles the 50,000-row boundary', () => {
    const sample = Array.from({ length: 50_000 }, (_, i): Observation => ({
      score: i / 50_000,
      label: i % 2 ? 1 : 0,
    }));
    expect(sweep(sample, { ...policy, capacity: 100 }).length).toBe(50_001);
    expect(() => sweep([...sample, sample[0]], policy)).toThrow();
  });
  it('keeps the demonstration deterministic', () => {
    expect(syntheticDemo()).toEqual(syntheticDemo());
    expect(syntheticDemo()).toHaveLength(240);
  });
});
