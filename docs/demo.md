# Demonstration plan

A 60–90 second screen recording of the real running application.

1. **Problem (0–10s):** “A classifier gives scores. A review team needs a rule that fits its capacity.”
2. **Context (10–20s):** Show the synthetic dataset badge and explain that these 240 invented observations do not demonstrate real model quality.
3. **Interaction (20–40s):** Move the threshold and show flagged count, precision, recall, and confusion counts changing. Lower capacity and increase missed-positive cost.
4. **Decision (40–55s):** Apply the capacity-constrained candidate. Show the selected, baseline, and candidate comparison. Explain that tied scores cannot be split.
5. **Input/output (55–70s):** Download the example, import it, and export the aggregate JSON report and all-threshold CSV.
6. **Technical value and limits (70–85s):** Exact candidate enumeration, bounded parser, browser-local processing, and independent arithmetic tests. Explain separate validation and test data.
7. **Closing (85–90s):** Show verified repository and deployment links from the daily run report only after they exist.

Do not show a proposed URL as a published repository. Browser-test screenshots are evidence of the real interface, not a video or proof of public deployment. No narration should claim production suitability, predictive accuracy, time savings, or measured adoption.
