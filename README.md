# Threshold Atlas

A browser-local decision workbench for ML developers who need to choose a binary classification threshold under a review-capacity limit.

A classifier's score does not tell a team which rows to act on. Threshold Atlas makes the trade-off between false alarms, missed positives, and available review capacity visible. It evaluates scores you already have; it does not train a model.

## Capabilities

- Import a strict two-column `score,label` CSV, with row-specific validation.
- Explore inclusive thresholds (`score >= threshold`) and an explicit flag-none rule.
- Set separate false-positive and false-negative penalties and a maximum flagged-row count.
- Find the lowest weighted error among every attainable rule within capacity.
- Inspect precision, recall, confusion counts, a volume/error chart, and a baseline comparison.
- Download every candidate as CSV or a timestamped aggregate decision report as JSON.
- Use the built-in, clearly labelled synthetic support-triage example.
- Operate with keyboard controls and responsive desktop/mobile layouts.

All computations run in page memory. There is no app backend, telemetry, external font, model API, or account requirement. The app does not upload CSV contents or persist imported data. Hosting providers may retain ordinary request logs.

## Intended users

ML practitioners, analysts, and students reviewing a binary classifier's validation scores. The capacity constraint is a row count for the loaded sample, useful when a review team cannot act on every positive prediction.

## Technology and architecture

TypeScript, semantic HTML, CSS, SVG, and Vite. Vitest tests the computation and parser; Playwright and axe-core check browser interactions and basic accessibility. There are no runtime package dependencies.

```text
CSV or deterministic synthetic sample
  → strict validation
  → observations in browser memory
  → exact score sweep + cost/capacity policy
  → metrics, candidate rule, chart, comparison
  → aggregate JSON report / threshold CSV
```

The engine sorts scores once per policy update and groups equal values. It visits each group to produce all attainable prediction sets in O(n log n) time and O(n) memory. Changing the selected threshold evaluates that rule in O(n). See [architecture](docs/architecture.md).

## Installation

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The lockfile is committed for reproducibility.

## Configuration

No environment variables or credentials are required. `.env.example` documents that intentionally empty configuration. Defaults are false-alarm cost 1, missed-positive cost 5, capacity 60, and threshold 0.5. Use the controls to change them.

## Usage

1. Explore the synthetic example or import a scored validation sample.
2. Set the relative cost of each error and the maximum flagged count.
3. Move the threshold slider or enter an exact numeric threshold.
4. Compare the selected rule, the 0.5 baseline, and the best capacity-constrained candidate.
5. Use **Use threshold** to apply that candidate and export a decision report.

Input example:

```csv
score,label
0.90,1
0.80,0
0.50,1
0.20,0
```

The header order may be reversed. BOM, CRLF, quoted fields, decimal/exponent scores, and a final newline are supported. Headers are case-insensitive. Extra columns, missing fields, nonnumeric scores, nonbinary labels, and internal blank rows are rejected. No rows are silently discarded. Limits: 2 MB and 50,000 observations. Remove identifiers and private information before importing; only two numeric columns are needed.

For the four rows above, threshold 0.5 gives TP=2, FP=1, TN=1, FN=0. With costs 1 and 5 and capacity 2, the candidate is 0.9: one flagged row and a weighted error of 5.

## Interpretation

- **Weighted error:** FP × false-positive cost + FN × false-negative cost.
- **Precision:** TP / (TP + FP).
- **Recall:** TP / (TP + FN).
- **F1:** 2TP / (2TP + FP + FN), included in exports.
- Undefined ratios are displayed as “—” and exported as null (JSON) or empty (CSV).
- Label 1 is always positive. Scores need not be calibrated probabilities.
- The candidate search includes every unique score and a flag-none rule, represented by null in JSON and `none` in CSV.
- Tied scores are never split. Equal-loss candidates prefer fewer flagged rows.
- Capacity includes both true and false positives. It is not a future throughput forecast.

Use separate training and validation data; assess the chosen rule on an untouched test set before relying on it. Changing the threshold on a sample and reporting performance on that same sample creates optimistic selection bias.

## Testing and validation

```sh
npm run check
npm run test:e2e
npm audit
```

`check` runs formatting, linting, type checks, unit tests, and the production build. Browser tests run against the built static output. On Windows they use installed Microsoft Edge. On other systems install Playwright Chromium first:

```sh
npx playwright install --with-deps chromium
```

Tests cover hand-calculated metrics, a separate brute-force oracle, score ties, endpoints, zero capacity, undefined metrics, malformed CSV, import preservation, exports, keyboard controls, responsive widths, and automated accessibility checks. An optional browser-tool adapter has contract tests with a simulated registry; this is not evidence of real WebMCP host interoperability.

## Deployment

```sh
npm run build
npm run preview
```

Serve the generated `dist/` directory on a static host over HTTPS. Relative asset URLs allow deployment under a subdirectory, including repository-based GitHub Pages. There are no server-side routes, runtime secrets, or database migrations. See [deployment instructions](docs/deployment.md).

Try the [public live demo](https://christiansada.github.io/threshold-atlas/). Source is published in [Christiansada/threshold-atlas](https://github.com/Christiansada/threshold-atlas). The optional Sites deployment is owner-private. Use the included static deployment instructions to host your own copy.

## Data and model sources

The bundled data are entirely synthetic, generated by a deterministic pseudorandom procedure in [src/demo.ts](src/demo.ts), seed 192026. They illustrate an invented support-triage task and do not represent customers, real model quality, or field observations. The example data and all original code are MIT licensed. No pretrained models or third-party datasets are bundled.

Method background: [scikit-learn decision-threshold guidance](https://scikit-learn.org/stable/modules/classification_threshold.html). Independent implementation; no scikit-learn code is bundled. Presentation research included [Carbon chart anatomy](https://carbondesignsystem.com/data-visualization/chart-anatomy/) for readable axes and legends and [Linear](https://linear.app/features) for concise workflow hierarchy. No branding, proprietary code, or assets were copied.

## Known limitations

This is sample-based exploration, not automatic deployment or an operational guarantee. It does not train models, calculate confidence intervals, correct distribution shift, assess fairness, or calibrate probabilities. Costs omit review time and downstream consequences. Only unweighted binary observations and a single global threshold are supported. Large inputs can briefly block the browser's main thread. No cloud persistence or collaboration is implemented. Automated accessibility checks complement, rather than replace, assistive-technology testing.

## Contributing and future work

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md). Useful contributions include independently checked bootstrap intervals, separate validation/test sample workflows, worker-based processing for larger inputs, and manual screen-reader testing. Propose assumptions and numerical acceptance cases before implementing statistical extensions.

## License

MIT. See [LICENSE](LICENSE).
