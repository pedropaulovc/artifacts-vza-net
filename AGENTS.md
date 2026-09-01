# AGENTS.md

This repository contains the Cloudflare Worker and self-contained static artifact folders for `artifacts.vza.net`. Keep the Worker generic: the asset binding serves the directory listing and every artifact folder. Do not add artifact-specific redirects or a source-account fallback.

## Response contract

`src/index.ts` must delegate static requests to the configured asset binding. The asset directory must preserve these observable results:

- `GET /`: HTTP 200 with the Apache-style artifact directory listing
- `HEAD /`: HTTP 200 with an empty body
- other methods on `/`: HTTP 405 with an empty body
- `GET /<artifact>`: HTTP 307 to `/<artifact>/` when the artifact is a folder
- `GET /<artifact>/`: HTTP 200 with that folder's `index.html`
- `HEAD /<artifact>/`: HTTP 200 with an empty body
- any method on an unsupported path: HTTP 404 with an empty body

Each artifact must live in its own `artifacts/<name>/` folder. Update `test/worker.test.ts` whenever the contract changes. Tests must assert both status and body.

## Cloudflare boundaries

The deployable environments are:

- production: account `97358a67fb6e05c67a44b04bdd9f7558`, Worker `artifacts-vza-net-prod`
- PPE: account `b84c535427bb541a804d4055918a94ab`, Worker `artifacts-vza-net-ppe`

Account `18ef3246e9f36d1560485ef53889c0ab` contains the old source Worker. It is retirement-only and must never appear in deploy configuration, workflow fallback logic, or runtime code.

Keep production and PPE in separate Wrangler files and separate GitHub workflows. Production uses the `cloudflare-production` environment and PPE uses `cloudflare-ppe`. Each environment supplies `CLOUDFLARE_ACCOUNT_ID` as a variable and `CLOUDFLARE_API_TOKEN` as a secret.

## Working commands

Use Node.js 22 or newer.

```sh
npm ci
npm test
npm run typecheck
```

Do not deploy during routine development or review. Deployment is an explicit GitHub Actions operation. A push to `main` triggers production; PPE uses the manual `Deploy PPE` workflow.

## Change discipline

- Use the assets binding for static files; do not replace it with artifact-specific Worker redirects.
- Keep account IDs and Worker names exact in their environment-specific files.
- Keep this repository's production Worker workers.dev-only. The public `artifacts.vza.net` custom-domain binding belongs to the dedicated `vza-net-router` account and must route only to the production origin; do not configure PPE or a legacy-account fallback here.
- Never commit Cloudflare tokens, local Wrangler state, test output, or `node_modules`.
- Update the README when origins, environment prerequisites, triggers, smoke checks, rollback, or cleanup steps change.
