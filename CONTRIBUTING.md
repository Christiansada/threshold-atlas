# Contributing

Start with a focused issue describing the user problem, expected behavior, and a small nonprivate example. For calculation changes, include independently derived expected results and explicitly discuss tie handling and undefined metrics.

1. Install Node.js 22.12+ and run `npm ci`.
2. Create a topic branch in your own checkout.
3. Make the smallest coherent change and add meaningful tests.
4. Run `npm run check`, `npm run test:e2e`, and `npm audit`.
5. Explain the behavior change, validation, and limitations in your pull request.

Keep scores and labels synthetic in tests. Do not include private datasets, credentials, personal identifiers, or proprietary material. Do not add telemetry or data uploads without a separately reviewed privacy design.

Changes should retain keyboard navigation, meaningful labels, responsive layouts, and a text/table equivalent for important chart information. New dependencies need a clear purpose and compatible license. Contributions are made under the MIT license.

Good starting points: screen-reader review, clearer edge-case explanations, and additional arithmetic fixtures. Larger statistical features should begin with a design discussion.
