# Social drafts — not published

These drafts describe implemented features. Add repository or live links only after verification.

## LinkedIn

I built Threshold Atlas to make a common ML decision easier to inspect: where should a binary classifier's decision threshold sit when review capacity is limited?

It takes a two-column CSV of scores and labels, compares false-alarm and missed-positive penalties, and examines every attainable threshold while keeping tied scores together. The browser interface shows the confusion matrix and review-volume/error trade-off, then exports an aggregate decision report.

The demo uses clearly labelled synthetic data. Results describe the loaded sample; they are not evidence of predictive performance on future data. A separate test set still matters.

The computation runs in the browser. I would welcome contributions around independent test-set workflows and accessible statistical visualizations.

Repository: https://github.com/Christiansada/threshold-atlas

Publication note: a verified public application URL is not yet available. Add one only after a live functional check.

## X

Built Threshold Atlas: a browser-local workbench for classification thresholds, error costs, and review capacity. Import scored CSV, inspect trade-offs, export a decision report. Synthetic demo; sample results aren't future-performance guarantees.

No posts have been published.
