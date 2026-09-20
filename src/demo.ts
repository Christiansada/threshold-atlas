import type { Observation } from './engine';
/** Invented validation scores, not a trained model or observations about real people. */
export function syntheticDemo(): Observation[] {
  let seed = 192026;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 240 }, () => {
    const score = Math.round(random() ** 1.8 * 1000) / 1000;
    return { score, label: random() < 0.04 + 0.8 * score ** 1.3 ? 1 : 0 };
  });
}
