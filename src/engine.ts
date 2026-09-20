export interface Observation {
  score: number;
  label: 0 | 1;
}
export interface Policy {
  falsePositiveCost: number;
  falseNegativeCost: number;
  capacity: number;
}
export interface Metrics {
  threshold: number | null;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  flagged: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  loss: number;
  feasible: boolean;
}
export const MAX_ROWS = 50_000;
export function validateRows(rows: readonly Observation[]): void {
  if (!rows.length || rows.length > MAX_ROWS)
    throw new Error('Use between 1 and 50,000 observations.');
  for (const row of rows) {
    if (
      !Number.isFinite(row.score) ||
      row.score < 0 ||
      row.score > 1 ||
      (row.label !== 0 && row.label !== 1)
    )
      throw new Error(
        'Scores must be finite numbers from 0 to 1; labels must be 0 or 1.',
      );
  }
}
export function validatePolicy(policy: Policy, count: number): void {
  for (const value of [policy.falsePositiveCost, policy.falseNegativeCost])
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000)
      throw new Error('Error costs must be between 0 and 1,000,000.');
  if (
    !Number.isInteger(policy.capacity) ||
    policy.capacity < 0 ||
    policy.capacity > count
  )
    throw new Error(
      'Capacity must be a whole number between 0 and the dataset size.',
    );
}
export function validateThreshold(threshold: number | null): void {
  if (
    threshold !== null &&
    (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
  )
    throw new Error('Threshold must be between 0 and 1, or null to flag none.');
}
function result(
  threshold: number | null,
  tp: number,
  fp: number,
  positives: number,
  negatives: number,
  policy: Policy,
): Metrics {
  const fn = positives - tp,
    tn = negatives - fp;
  return {
    threshold,
    tp,
    fp,
    tn,
    fn,
    flagged: tp + fp,
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: positives ? tp / positives : null,
    f1: 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null,
    loss: fp * policy.falsePositiveCost + fn * policy.falseNegativeCost,
    feasible: tp + fp <= policy.capacity,
  };
}
export function evaluate(
  rows: readonly Observation[],
  threshold: number | null,
  policy: Policy,
): Metrics {
  validateRows(rows);
  validatePolicy(policy, rows.length);
  validateThreshold(threshold);
  let tp = 0,
    fp = 0,
    positives = 0;
  for (const row of rows) {
    positives += row.label;
    if (threshold !== null && row.score >= threshold) {
      if (row.label) tp++;
      else fp++;
    }
  }
  return result(threshold, tp, fp, positives, rows.length - positives, policy);
}
/** Exact sweep of every attainable prediction set; tied scores are indivisible. */
export function sweep(rows: readonly Observation[], policy: Policy): Metrics[] {
  validateRows(rows);
  validatePolicy(policy, rows.length);
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const positives = sorted.reduce((sum, row) => sum + row.label, 0),
    negatives = rows.length - positives;
  const points = [result(null, 0, 0, positives, negatives, policy)];
  let tp = 0,
    fp = 0,
    i = 0;
  while (i < sorted.length) {
    const score = sorted[i].score;
    while (i < sorted.length && sorted[i].score === score) {
      if (sorted[i].label) tp++;
      else fp++;
      i++;
    }
    points.push(result(score, tp, fp, positives, negatives, policy));
  }
  return points;
}
export function recommend(points: readonly Metrics[]): Metrics {
  const feasible = points.filter((point) => point.feasible);
  if (!feasible.length) throw new Error('No feasible candidate.');
  return feasible.reduce((best, point) =>
    point.loss < best.loss ||
    (point.loss === best.loss && point.flagged < best.flagged)
      ? point
      : best,
  );
}
export function exportSweep(points: readonly Metrics[]): string {
  const header =
    'threshold,tp,fp,tn,fn,flagged,precision,recall,f1,weighted_loss,within_capacity';
  return (
    [
      header,
      ...points.map((p) =>
        [
          p.threshold ?? 'none',
          p.tp,
          p.fp,
          p.tn,
          p.fn,
          p.flagged,
          p.precision ?? '',
          p.recall ?? '',
          p.f1 ?? '',
          p.loss,
          p.feasible,
        ].join(','),
      ),
    ].join('\n') + '\n'
  );
}
