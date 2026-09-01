# artifacts.vza.net

The production Worker serves an Apache-style directory listing at `artifacts.vza.net/` and static artifact folders. Each artifact is self-contained under `artifacts/<name>/`.

## Response contract

The Worker matches this public endpoint behavior:

| Request | Status | Body |
| --- | ---: | --- |
| `GET /` | 200 | Apache-style directory listing |
| `HEAD /` | 200 | empty |
| another method on `/` | 405 | empty |
| `GET /qr-gov-br` | 307 | redirects to `/qr-gov-br/` |
| `GET /qr-gov-br/` | 200 | standalone HTML reader |
| `HEAD /qr-gov-br/` | 200 | empty |
| `GET /emojihose` | 307 | redirects to `/emojihose/` |
| `GET /emojihose/` | 200 | realtime emoji stream |
| `GET /qr-gov-br.html` | 307 | redirects to `/qr-gov-br/` |
| any method on an unsupported path | 404 | empty |

The tests pin the root, QR reader, dependency, extensionless URL, and empty-response rules.

The QR reader performs decoding locally in the browser. It does not call a network service or add application behavior to the root endpoint.

## Accounts and origins

| Environment | Cloudflare account ID | Worker | workers.dev origin |
| --- | --- | --- | --- |
| Production | `97358a67fb6e05c67a44b04bdd9f7558` | `artifacts-vza-net-prod` | `https://artifacts-vza-net-prod.artifacts-vza-net-prod.workers.dev` |
| PPE | `b84c535427bb541a804d4055918a94ab` | `artifacts-vza-net-ppe` | `https://artifacts-vza-net-ppe.artifacts-ppe-vza-net.workers.dev` |

The production configuration declares the `artifacts.vza.net` custom domain. The PPE configuration has no production custom-domain binding.

`wrangler.production.jsonc` and `wrangler.ppe.jsonc` contain the exact target account IDs and Worker names.


## Local commands

Use Node.js 22 or newer.

```sh
npm ci
npm test
npm run typecheck
```

The deploy scripts are available for operators, but normal deployments should go through GitHub Actions so the account and environment checks run:

```sh
npm run deploy:ppe
npm run deploy:production
```

## QR reader artifact

`artifacts/qr-gov-br/index.html` is the source for the standalone browser reader. Its public entry URL is `https://artifacts.vza.net/qr-gov-br`; Cloudflare redirects it to the canonical trailing-slash folder URL. The `.html` filename is not the public entry URL.

Open `artifacts/qr-gov-br/index.html` locally, or use `https://artifacts.vza.net/qr-gov-br` after production deployment, then choose, drop, or paste an image containing a QR code. The Brazilian Portuguese interface organizes readable payloads around three common cases:

- a physical CIN QR, shown as a possible validation address or structured identity data;
- a Vio identity/document code, with known local templates such as RG Digital rendered as fields;
- a Mercosur plate code, rendered conservatively as vehicle-identification data.

The reader never opens decoded URLs. Text stays text, and unrecognized binary payloads remain bytes represented as Base64. All decoded values are displayed with a caveat: decoding a QR pattern does not prove that a document, plate, or value is authentic.

A physical CIN payload is a JWT: the reader extracts the header and payload JSON, verifies an ES512 signature against the embedded production public key when Web Crypto is available, and keeps the encoded signature visible in the technical disclosure. A verified signature authenticates the signed payload only; it does not confirm the document's validity or current situation.

The artifact also recognizes Vio QR v4 payloads. It decodes the Vio field alphabet, supports the bundled RG Digital and Placa Veicular templates, and verifies known brainpoolP256r1 signatures locally when Web Crypto is available. A `verified` result means only that the signature matched the bundled certificate; it does not check revocation, issuer databases, physical-document comparison, or current legal validity. Unsupported Vio templates remain available as their original Base64 bytes.

The technical format, template ID, certificate, timestamp, field count, and raw payload are behind the reader's `Mostrar mais detalhes` disclosure. The reader makes no network requests, so it can be used offline. The official CIN flow can require the government app, an account, and internet for complete validation; the official app or the relevant issuing/traffic authority remains the source of truth.

Primary references for the use-case copy and limitations:

- [Gov.br: Verificar validade de QR Code da CIN](https://www.gov.br/pt-br/servicos/verificar-validade-de-qr-code-da-carteira-de-identidade-nacional)
- [Gov.br: Perguntas frequentes sobre a CIN](https://www.gov.br/governodigital/pt-br/identidade/cin/perguntas-frequentes-sobre-a-cin)
- [SERPRO Vio app listing](https://play.google.com/store/apps/details?id=br.gov.serpro.lince&hl=pt_BR)
- [Resolução Contran nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf)

`artifacts/qr-gov-br/jsqr.js` is the vendored jsQR 1.4.0 browser decoder under Apache 2.0; its license is preserved in `artifacts/qr-gov-br/JSQR-LICENSE.txt`.

## GitHub environments and workflow inputs

Create these repository environments before the first deployment:

- `cloudflare-production`
  - variable `CLOUDFLARE_ACCOUNT_ID=97358a67fb6e05c67a44b04bdd9f7558`
  - secret `CLOUDFLARE_API_TOKEN` scoped to deploy Workers in that account
- `cloudflare-ppe`
  - variable `CLOUDFLARE_ACCOUNT_ID=b84c535427bb541a804d4055918a94ab`
  - secret `CLOUDFLARE_API_TOKEN` scoped to deploy Workers in that account

The workflows do not accept custom text inputs. GitHub's standard workflow `--ref` selection chooses the PPE revision. The production job refuses to run unless the selected ref is `main`. Each workflow checks its environment account ID against the account baked into the matching Wrangler configuration before it calls Wrangler.
For local authenticated operations, use separate Wrangler profiles:

```sh
npx wrangler auth create artifacts
npx wrangler auth create artifacts-ppe-vza-net
npx wrangler auth activate artifacts-ppe-vza-net
```

Use `--profile artifacts` with the production configuration and `--profile artifacts-ppe-vza-net` with the PPE configuration. Authorize only the production account in `artifacts` and only the PPE account in `artifacts-ppe-vza-net`.
The `deploy-pr.yml` `pull_request_target` workflow deploys the head revision of an internal pull request targeting `main` to a disposable Worker in the PPE account when it is opened, updated, or reopened. It runs tests and typechecks against the pull request source without the Cloudflare token, then uses the Wrangler binary and configuration checked out from `main` for the privileged deployment. The Worker is named `artifacts-vza-net-pr-<number>` and its URL is `https://artifacts-vza-net-pr-<number>.artifacts-ppe-vza-net.workers.dev`; the job publishes that URL through GitHub's `cloudflare-ppe` environment. When the pull request closes, the workflow deletes the Worker. Fork pull requests are intentionally skipped because this deployment is restricted to repository-owned branches; use the manual PPE workflow for a trusted revision when a preview is required.

A push to `main` deploys production. Operators can also rerun production explicitly:

```sh
gh workflow run deploy-production.yml \
  --repo pedropaulovc/artifacts-vza-net \
  --ref main
```

The direct PPE deployment workflow is manual, so a branch or commit must be selected deliberately:

```sh
gh workflow run deploy-ppe.yml \
  --repo pedropaulovc/artifacts-vza-net \
  --ref <branch-or-commit>
```

## Cutover runbook

The production configuration declares `artifacts.vza.net` as a custom domain for `artifacts-vza-net-prod`. Production deployment creates or maintains that binding in the production account.

1. Deploy the intended revision to PPE and smoke-test the PPE workers.dev origin.
2. Merge that revision to `main`. Wait for the production deployment to finish.
3. Smoke-test the production workers.dev origin and `https://artifacts.vza.net`.
4. Verify `https://artifacts.vza.net/qr-gov-br` and `/emojihose/` before declaring the cutover complete.
5. Keep the production custom domain attached only to `artifacts-vza-net-prod`.

The legacy Worker is not a deployment fallback and must be removed from Cloudflare before the cutover is complete.

Use this smoke check with each workers.dev origin and the public hostname:

```sh
origin=https://artifacts-vza-net-ppe.artifacts-ppe-vza-net.workers.dev

test "$(curl -sS -o /dev/null -w '%{http_code}:%{size_download}' "$origin/")" = "200:0"
test "$(curl -sS -o /dev/null -w '%{http_code}:%{size_download}' -I "$origin/")" = "200:0"
test "$(curl -sS -o /dev/null -w '%{http_code}:%{size_download}' -X POST "$origin/")" = "405:0"
test "$(curl -sS -o /dev/null -w '%{http_code}:%{size_download}' "$origin/contract-probe")" = "404:0"
test "$(curl -sS -o /dev/null -w '%{http_code}' "$origin/qr-gov-br")" = "200"
test "$(curl -sS -o /dev/null -w '%{http_code}' "$origin/emojihose/")" = "200"
```

Repeat with the production workers.dev origin and then `https://artifacts.vza.net`.

## Rollback

Rollback stays in the production account. Revert the bad change on `main` and push the revert; the production workflow deploys the previous implementation to `artifacts-vza-net-prod`. If the custom-domain attachment is wrong while the workers.dev origin is healthy, fix the production configuration and redeploy.

After rollback, rerun the smoke checks against the production workers.dev origin and public hostname. Keep the QR and emojihose assets available during rollback.
