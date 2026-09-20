# Architecture and numerical contract

## Components

- `src/csv.ts`: strict bounded two-column parser and row validation.
- `src/engine.ts`: pure arithmetic, exact candidate sweep, selection, and CSV export.
- `src/demo.ts`: deterministic synthetic observations.
- `src/main.ts`: state, controls, rendering, downloads, optional browser-tool adapter.
- `src/style.css`: responsive presentation.

The parser completes before replacing the current dataset. Invalid imports preserve the prior valid state. Imported filenames and raw values are never interpolated into HTML. The only HTML assembled dynamically contains controlled labels and engine-generated numbers. An import generation counter prevents a slower file read from overwriting a later import or reset.

State is held in memory: rows, threshold, error costs, capacity, source kind, and cached candidate results. Invalid numeric control values leave the last valid state active and show a message. The report always exports that active state. Reload clears it.

## Exact candidate search

Sort scores descending. Begin with a flag-none candidate. At each distinct score, add every row with that score and emit cumulative TP and FP. Compute FN and TN from the sample totals.

Every attainable positive prediction set under an inclusive scalar threshold is represented. The sentinel distinguishes no flagged rows from threshold 1, which still flags score-1 observations. Minimize weighted loss among candidates with flagged count no greater than capacity; break equal losses by lower flagged count. No partial inclusion of a tied score group is allowed.

Costs are finite, nonnegative, at most 1,000,000. Capacity is an integer from zero to sample size. Finite scores are in [0,1]; labels are exactly 0 or 1. Up to 50,000 rows are accepted. Floating-point arithmetic follows JavaScript IEEE-754 semantics; costs are relative penalties, not exact monetary accounting.

## Privacy and export boundaries

No identifiers or extra CSV columns are accepted. The app does not upload data, persist data, or put data in navigation URLs. Exports contain aggregate metrics and settings. A report identifies synthetic versus imported source but does not reproduce the filename or raw records.

## Optional browser tools

Feature-detected `document.modelContext` exposes `set_decision_threshold`. It validates an exact object schema and invokes the same state function as the visible controls. Unsupported browsers keep normal functionality. Contract tests use a simulated registry; a real supporting host is required to validate interoperability.

## Validation strategy

Pure tests include independent brute-force comparisons over 80 deterministic datasets. Browser checks run against the production build and cover a malformed import, preserving prior data, exports, zero capacity, keyboard input, viewport overflow, and axe rules. No tests claim predictive validity of the synthetic scores.
