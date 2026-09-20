# Static deployment

Run `npm ci` and `npm run check`, then `npm run test:e2e`. Publish only the generated `dist/` directory to an HTTPS static host. No secrets or runtime variables are needed.

## GitHub Pages

For the public `Christiansada/threshold-atlas` repository or your own fork:

1. Use `main` as the default branch.
2. In repository Settings → Pages, select GitHub Actions as the build source.
3. Run the included **Deploy static site** workflow manually.
4. Wait for the deployment to complete, then open the URL returned by the deployment job.
5. Verify CSV import, a threshold change, and report download on that live URL.

The deploy workflow has only contents-read, pages-write, and id-token-write permissions. Validation runs before deployment. GitHub's built-in workflow token is used automatically; no token belongs in this project.

The relative Vite base permits a repository subpath. A Pages URL is not claimed until the workflow and live check succeed.

## Sites

The optional `.openai/hosting.json` binds this checkout to a Sites project and declares `dist` as static output. This file contains no credentials. Sites publishing also requires its source-upload and version-save operations; a local manifest alone does not indicate a deployment.

## Verification checklist

Load the exact production URL, confirm no console errors, apply a candidate, import the synthetic CSV, verify counts, and download a JSON report. Check a narrow screen. Record deployment status and source commit in the daily run report.
