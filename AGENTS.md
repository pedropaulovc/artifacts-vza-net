# AGENTS.md

## Repository purpose

This repository contains the intentionally empty-response Cloudflare Worker for `artifacts.vza.net`. Keep the implementation small and explicit. Do not add application behavior, storage, bindings, redirects, or a source-account fallback unless the service contract changes and the change is documented.

## Response contract

`src/index.ts` must preserve these observable results:

- `GET /` and `HEAD /`: HTTP 200 with an empty body
- other methods on `/`: HTTP 405 with an empty body
- any method on another path: HTTP 404 with an empty body

Update `test/worker.test.ts` whenever the contract changes. Tests must assert both status and body.

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

- Preserve the no-bindings design unless a documented requirement needs a binding.
- Keep account IDs and Worker names exact in their environment-specific files.
- Do not add public routes to Wrangler configuration. Public cutover is a separate operator action described in `README.md`.
- Never commit Cloudflare tokens, local Wrangler state, test output, or `node_modules`.
- Update the README when origins, environment prerequisites, triggers, smoke checks, rollback, or cleanup steps change.
