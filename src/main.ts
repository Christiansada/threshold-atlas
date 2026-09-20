import './style.css';
import {
  evaluate,
  sweep,
  recommend,
  exportSweep,
  validateThreshold,
  type Metrics,
  type Observation,
  type Policy,
} from './engine';
import { parseCsv, MAX_BYTES } from './csv';
import { syntheticDemo } from './demo';

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
<a class="skip" href="#workbench">Skip to workbench</a>
<header class="masthead">
  <a class="brand" href="./" aria-label="Threshold Atlas home"><span class="brand-mark" aria-hidden="true">T<span>A</span></span><span>Threshold Atlas<small>THE DECISION WORKBENCH</small></span></a>
  <span class="local-badge">Browser-local analysis</span>
</header>
<main id="workbench">
  <section class="intro">
    <div><p class="eyebrow">MODEL EVALUATION / 001</p><h1>A score is not a decision.</h1><p class="lede">Find the threshold that fits your error costs and your team's capacity.</p></div>
    <button id="export-report" class="button dark">Export decision report <span aria-hidden="true">↗</span></button>
  </section>
  <div class="workspace">
    <aside class="controls" aria-label="Dataset and decision controls">
      <section class="control-section"><p class="step">01 / DATASET</p><h2>Your validation sample</h2>
        <div class="dataset"><span class="file-symbol" aria-hidden="true">▤</span><div><strong id="dataset-name">Synthetic support triage</strong><small id="dataset-info"></small></div></div>
        <p class="hint" id="data-note">Invented scores and labels. No real customer data.</p>
        <label for="csv-file" class="file-label">Import scored CSV</label><input type="file" id="csv-file" accept=".csv,text/csv" aria-describedby="csv-help" />
        <p id="csv-help" class="hint">Exactly <code>score,label</code>. Scores 0–1; labels 0 or 1. Up to 50,000 rows / 2 MB. Remove personal data before importing.</p>
        <div class="text-actions"><button id="download-example" class="text-button">Download example</button><button id="reset-demo" class="text-button">Reset demo</button></div>
      </section>
      <section class="control-section"><p class="step">02 / ERROR COSTS</p><h2>What does an error cost?</h2>
        <p class="hint">Relative penalty units per error, not a currency estimate.</p>
        <label for="fp-cost">False alarm <span>False positive</span></label><input id="fp-cost" type="number" min="0" max="1000000" step="any" value="1" />
        <label for="fn-cost">Missed positive <span>False negative</span></label><input id="fn-cost" type="number" min="0" max="1000000" step="any" value="5" />
      </section>
      <section class="control-section"><p class="step">03 / REVIEW CAPACITY</p><label for="capacity" class="capacity-label">Maximum flagged rows</label><input id="capacity" type="number" min="0" max="240" step="1" value="60" /><p class="hint">A hard limit for this sample. Equal scores stay together.</p></section>
      <p id="feedback" role="status" aria-live="polite"></p>
    </aside>
    <div class="analysis">
      <section class="threshold-panel" aria-labelledby="threshold-heading">
        <div class="section-heading"><div><p class="eyebrow">EXPLORE A DECISION RULE</p><h2 id="threshold-heading">Flag a row when score ≥ threshold</h2></div><span id="threshold-readout" class="threshold-readout">0.500</span></div>
        <label class="sr-only" for="threshold">Decision threshold slider</label><input id="threshold" type="range" min="0" max="1" step="0.001" value="0.5" /><div class="range-labels"><span>0 · Flag more</span><span>1 · Flag fewer</span></div>
        <div class="threshold-tools"><label for="exact-threshold">Exact threshold</label><input id="exact-threshold" type="number" min="0" max="1" step="any" value="0.5" /><button id="flag-none" class="text-button">Flag none</button><button id="baseline" class="text-button">Use 0.5</button></div>
      </section>
      <section class="metrics" aria-label="Results at selected threshold">
        <article><p>Flagged for review</p><strong id="flagged"></strong><small id="capacity-status"></small></article>
        <article><p>Precision</p><strong id="precision"></strong><small>True positives / flagged rows</small></article>
        <article><p>Recall</p><strong id="recall"></strong><small>True positives / all positives</small></article>
        <article><p>Weighted error</p><strong id="loss"></strong><small>FP × cost + FN × cost</small></article>
      </section>
      <section class="recommendation" aria-labelledby="recommend-title"><div class="recommend-icon" aria-hidden="true">✦</div><div><h2 id="recommend-title">Lowest sample error within capacity</h2><p id="recommendation-text"></p></div><button id="apply-best" class="button mint">Use threshold</button></section>
      <div class="result-grid">
        <section class="panel chart-panel"><div class="section-heading"><div><p class="eyebrow">THE TRADE-OFF</p><h2>Error versus review volume</h2></div><span class="unit">Penalty units</span></div>
          <div id="chart"></div><div class="legend"><span><i class="legend-line"></i>All attainable rules</span><span><i class="legend-circle"></i>Selected</span><span><i class="legend-dash"></i>Capacity</span></div><p class="hint">Each point keeps all equal scores together. Connecting lines guide the eye.</p>
        </section>
        <section class="panel"><p class="eyebrow">BEHIND THE METRICS</p><h2>Where the decisions land</h2><table class="confusion"><caption>Confusion matrix at selected threshold</caption><thead><tr><td></td><th scope="col">Actual 1</th><th scope="col">Actual 0</th></tr></thead><tbody><tr><th scope="row">Flagged</th><td class="positive"><strong id="tp"></strong><span>True positive</span></td><td class="error"><strong id="fp"></strong><span>False positive</span></td></tr><tr><th scope="row">Not flagged</th><td class="error"><strong id="fn"></strong><span>False negative</span></td><td><strong id="tn"></strong><span>True negative</span></td></tr></tbody></table></section>
      </div>
      <section class="panel comparison"><div class="section-heading"><div><p class="eyebrow">DECISION RECORD</p><h2>Compare before you commit</h2></div><button id="export-sweep" class="text-button">Export all thresholds ↓</button></div><div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable decision comparison"><table><caption class="sr-only">Selected, baseline, and capacity-constrained candidate comparison</caption><thead><tr><th scope="col">Rule</th><th scope="col">Threshold</th><th scope="col">Flagged</th><th scope="col">Missed</th><th scope="col">Error</th><th scope="col">Capacity</th></tr></thead><tbody id="comparison-body"></tbody></table></div></section>
      <details class="method"><summary>How to interpret these results</summary><div><p><strong>Exploration, not a deployment guarantee.</strong> Fit your model on training data, choose a threshold using a separate validation sample, then evaluate the fixed rule on untouched test data. These metrics describe only the loaded rows.</p><p>Label 1 is the positive class. A score is a ranking value between 0 and 1; it is not assumed to be a calibrated probability. Every unique score and a flag-none rule are considered. Ties are never split. Equal-cost candidates prefer fewer flagged rows. Undefined precision or recall is shown as “—”.</p><p>Weighted error = false positives × false-alarm cost + false negatives × missed-positive cost. This omits review costs and downstream effects. Capacity applies to the loaded sample, not a future arrival rate. There is no model training, uncertainty interval, fairness assessment, or automatic deployment.</p><p>CSV content stays in page memory. It is not saved by this app, added to a URL, or sent to a server. Reloading clears imported data. Exports contain aggregates, not source rows. Hosting may retain ordinary request logs.</p><p>Method reference: <a href="https://scikit-learn.org/stable/modules/classification_threshold.html" target="_blank" rel="noreferrer">scikit-learn threshold tuning guidance</a>.</p></div></details>
    </div>
  </div>
</main>
<footer><span>Threshold Atlas <span class="footer-version">v0.1</span></span><span>Make the trade-off explicit.</span></footer>
`;

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
let rows: Observation[] = syntheticDemo();
let threshold: number | null = 0.5;
let policy: Policy = {
  falsePositiveCost: 1,
  falseNegativeCost: 5,
  capacity: 60,
};
let source: 'synthetic' | 'imported' = 'synthetic';
let points = sweep(rows, policy);
const percent = (n: number | null) =>
  n === null ? '—' : (n * 100).toFixed(1) + '%';
const number = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 3 });
const rule = (t: number | null) => (t === null ? 'Flag none' : String(t));
const feedback = (message: string, error = false) => {
  el('feedback').textContent = message;
  el('feedback').classList.toggle('invalid', error);
};
function chart(selected: Metrics): void {
  const width = 600,
    height = 265,
    left = 55,
    right = 580,
    top = 18,
    bottom = 215;
  const maxY = Math.max(1, ...points.map((p) => p.loss), selected.loss);
  const x = (value: number) => left + (value / rows.length) * (right - left);
  const y = (value: number) => bottom - (value / maxY) * (bottom - top);
  const line = points
    .map((p) => x(p.flagged).toFixed(2) + ',' + y(p.loss).toFixed(2))
    .join(' ');
  const grid = [0, 0.5, 1]
    .map(
      (f) =>
        `<line x1="${left}" x2="${right}" y1="${y(f * maxY)}" y2="${y(f * maxY)}" class="grid-line"/><text x="${left - 10}" y="${y(f * maxY) + 4}" text-anchor="end">${number(f * maxY)}</text><text x="${x(f * rows.length)}" y="${bottom + 24}" text-anchor="middle">${number(f * rows.length)}</text>`,
    )
    .join('');
  el('chart').innerHTML =
    `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Weighted error by flagged row count</title><desc id="chart-desc">Selected rule flags ${selected.flagged} rows with weighted error ${number(selected.loss)}. Capacity is ${policy.capacity}. Download all threshold values for the full data table.</desc><rect x="${x(policy.capacity)}" y="${top}" width="${right - x(policy.capacity)}" height="${bottom - top}" fill="#fff2e8"/>${grid}<polyline points="${line}" fill="none" stroke="#147d68" stroke-width="2.5"/><line x1="${x(policy.capacity)}" x2="${x(policy.capacity)}" y1="${top}" y2="${bottom}" stroke="#93501d" stroke-dasharray="5 5"/><circle cx="${x(selected.flagged)}" cy="${y(selected.loss)}" r="6" fill="#101e2b" stroke="white" stroke-width="2"/><text x="${(left + right) / 2}" y="261" text-anchor="middle">Flagged rows</text></svg>`;
}
function render(): void {
  const selected = evaluate(rows, threshold, policy),
    best = recommend(points),
    baseline = evaluate(rows, 0.5, policy);
  el('dataset-name').textContent =
    source === 'synthetic'
      ? 'Synthetic support triage'
      : 'Imported validation sample';
  el('dataset-info').textContent =
    number(rows.length) +
    ' rows · ' +
    number(selected.tp + selected.fn) +
    ' positives';
  el('data-note').textContent =
    source === 'synthetic'
      ? 'Invented scores and labels. No real customer data.'
      : 'Loaded in page memory. Not saved or uploaded by this app.';
  el<HTMLInputElement>('capacity').max = String(rows.length);
  el('threshold-readout').textContent =
    threshold === null ? 'None' : threshold.toFixed(3);
  el<HTMLInputElement>('threshold').value = String(threshold ?? 1);
  el<HTMLInputElement>('exact-threshold').value =
    threshold === null ? '' : String(threshold);
  el('flag-none').setAttribute('aria-pressed', String(threshold === null));
  el('flagged').textContent = number(selected.flagged);
  el('capacity-status').textContent = selected.feasible
    ? 'Within capacity of ' + number(policy.capacity)
    : number(selected.flagged - policy.capacity) + ' above capacity';
  el('capacity-status').classList.toggle('over-capacity', !selected.feasible);
  el('precision').textContent = percent(selected.precision);
  el('recall').textContent = percent(selected.recall);
  el('loss').textContent = number(selected.loss);
  for (const key of ['tp', 'fp', 'fn', 'tn'] as const)
    el(key).textContent = number(selected[key]);
  el('recommendation-text').textContent =
    (best.threshold === null
      ? 'Flag none'
      : 'Threshold ' + rule(best.threshold)) +
    ' · ' +
    number(best.flagged) +
    ' flagged · ' +
    number(best.fn) +
    ' missed · ' +
    number(best.loss) +
    ' penalty units. Best on this sample only.';
  el('comparison-body').innerHTML = [
    ['Selected', selected],
    ['Baseline', baseline],
    ['Capacity candidate', best],
  ]
    .map(([label, value]) => {
      const p = value as Metrics;
      return `<tr><th scope="row">${label}</th><td>${rule(p.threshold)}</td><td>${number(p.flagged)}</td><td>${number(p.fn)}</td><td>${number(p.loss)}</td><td><span class="status ${p.feasible ? 'within' : 'over'}">${p.feasible ? 'Within' : 'Over'}</span></td></tr>`;
    })
    .join('');
  chart(selected);
}
function setThreshold(value: number | null): Metrics {
  validateThreshold(value);
  threshold = value;
  render();
  return evaluate(rows, threshold, policy);
}
function changePolicy(): void {
  const inputs = ['fp-cost', 'fn-cost', 'capacity'].map((id) =>
    el<HTMLInputElement>(id),
  );
  if (
    inputs.some((input) => !input.checkValidity() || input.value.trim() === '')
  ) {
    inputs.forEach((input) =>
      input.setAttribute(
        'aria-invalid',
        String(!input.checkValidity() || input.value.trim() === ''),
      ),
    );
    feedback(
      'Enter valid error costs and a whole-number capacity. Results still use the last valid settings.',
      true,
    );
    return;
  }
  inputs.forEach((input) => input.removeAttribute('aria-invalid'));
  policy = {
    falsePositiveCost: Number(inputs[0].value),
    falseNegativeCost: Number(inputs[1].value),
    capacity: Number(inputs[2].value),
  };
  points = sweep(rows, policy);
  render();
  feedback('Decision settings updated.');
}
function download(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const id of ['fp-cost', 'fn-cost', 'capacity'])
  el(id).addEventListener('input', changePolicy);
el('threshold').addEventListener('input', (event) => {
  setThreshold(Number((event.target as HTMLInputElement).value));
  feedback('Threshold updated.');
});
el('exact-threshold').addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  if (!input.checkValidity() || input.value.trim() === '') {
    input.setAttribute('aria-invalid', 'true');
    feedback(
      'Enter a threshold from 0 to 1. Results still use the previous threshold.',
      true,
    );
    return;
  }
  input.removeAttribute('aria-invalid');
  setThreshold(Number(input.value));
  feedback('Exact threshold updated.');
});
el('flag-none').addEventListener('click', () => {
  setThreshold(null);
  feedback('Flag-none rule selected.');
});
el('baseline').addEventListener('click', () => {
  setThreshold(0.5);
  feedback('Baseline threshold selected.');
});
el('apply-best').addEventListener('click', () => {
  setThreshold(recommend(points).threshold);
  feedback('Capacity-constrained candidate applied.');
});
let importVersion = 0;
el('csv-file').addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0],
    version = ++importVersion;
  if (!file) return;
  try {
    if (file.size > MAX_BYTES) throw new Error('CSV exceeds the 2 MB limit.');
    const loaded = parseCsv(await file.text());
    if (version !== importVersion) return;
    rows = loaded;
    source = 'imported';
    policy.capacity = Math.min(policy.capacity, rows.length);
    el<HTMLInputElement>('capacity').value = String(policy.capacity);
    points = sweep(rows, policy);
    render();
    feedback('CSV loaded. All rows validated; none were skipped.');
  } catch (error) {
    if (version === importVersion)
      feedback((error as Error).message + ' Previous dataset kept.', true);
  } finally {
    if (version === importVersion) input.value = '';
  }
});
el('reset-demo').addEventListener('click', () => {
  importVersion++;
  rows = syntheticDemo();
  source = 'synthetic';
  threshold = 0.5;
  policy = { falsePositiveCost: 1, falseNegativeCost: 5, capacity: 60 };
  el<HTMLInputElement>('fp-cost').value = '1';
  el<HTMLInputElement>('fn-cost').value = '5';
  el<HTMLInputElement>('capacity').value = '60';
  for (const id of ['fp-cost', 'fn-cost', 'capacity', 'exact-threshold'])
    el(id).removeAttribute('aria-invalid');
  points = sweep(rows, policy);
  render();
  feedback('Synthetic demo restored.');
});
el('download-example').addEventListener('click', () =>
  download(
    'score,label\n' +
      syntheticDemo()
        .map((r) => r.score + ',' + r.label)
        .join('\n') +
      '\n',
    'synthetic-support-triage.csv',
    'text/csv',
  ),
);
el('export-sweep').addEventListener('click', () =>
  download(exportSweep(points), 'threshold-atlas-sweep.csv', 'text/csv'),
);
el('export-report').addEventListener('click', () => {
  const report = {
    product: 'Threshold Atlas',
    version: '0.1.0',
    createdAt: new Date().toISOString(),
    data: {
      source,
      rows: rows.length,
      positives: rows.reduce((s, r) => s + r.label, 0),
    },
    rule: 'score >= threshold; null means flag none',
    policy,
    selected: evaluate(rows, threshold, policy),
    baseline: evaluate(rows, 0.5, policy),
    candidate: recommend(points),
    limitations: [
      'In-sample evaluation only; use an independent test set.',
      'No model training, probability calibration, fairness analysis, or uncertainty intervals.',
      'Capacity and costs describe this sample; future volume is unknown.',
    ],
  };
  download(
    JSON.stringify(report, null, 2) + '\n',
    'threshold-atlas-report.json',
    'application/json',
  );
});
render();

interface ModelContext {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
}
const context = (document as Document & { modelContext?: ModelContext })
  .modelContext;
if (context?.registerTool) {
  const lifecycle = new AbortController();
  addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: 'set_decision_threshold',
          description:
            'Update the visible decision threshold and return sample metrics; null flags no rows.',
          inputSchema: {
            type: 'object',
            properties: {
              threshold: { type: ['number', 'null'], minimum: 0, maximum: 1 },
            },
            required: ['threshold'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input) {
            if (
              typeof input !== 'object' ||
              input === null ||
              !('threshold' in input) ||
              Object.keys(input).length !== 1 ||
              (input.threshold !== null && typeof input.threshold !== 'number')
            )
              throw new Error('Provide one numeric threshold or null.');
            const result = setThreshold(input.threshold);
            feedback('Decision threshold updated through browser tool.');
            return result;
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {
      /* Optional enhancement; visible controls remain available. */
    });
  } catch {
    /* Browsers with partial support can continue using the visible interface. */
  }
}
