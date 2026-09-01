# artifacts.vza.net

This repository owns the Cloudflare Worker behind `artifacts.vza.net`. The service deliberately returns empty responses. There is no application payload or storage behind it.

## Response contract

The Worker matches the public endpoint behavior observed on 2026-08-13:

| Request | Status | Body |
| --- | ---: | --- |
| `GET /` | 200 | empty |
| `HEAD /` | 200 | empty |
| another method on `/` | 405 | empty |
| any method on another path | 404 | empty |

The probes covered `GET`, `HEAD`, `POST`, and `OPTIONS` on `/`, plus `GET` and `POST` on `/contract-probe`. The tests pin the resulting status and empty-body rules.

Authenticated inspection of the old `artifacts` Worker found no script body: the script download returned HTTP 204. It also had no bindings and used the standard runtime settings. That evidence is why this repository contains a small explicit handler rather than an attempt to reconstruct missing application code.

## Accounts and origins

| Environment | Cloudflare account ID | Worker | workers.dev origin |
| --- | --- | --- | --- |
| Source (retirement only) | `18ef3246e9f36d1560485ef53889c0ab` | `artifacts` | not used as a deployment fallback |
| Production | `97358a67fb6e05c67a44b04bdd9f7558` | `artifacts-vza-net-prod` | `https://artifacts-vza-net-prod.artifacts-vza-net-prod.workers.dev` |
| PPE | `b84c535427bb541a804d4055918a94ab` | `artifacts-vza-net-ppe` | `https://artifacts-vza-net-ppe.artifacts-ppe-vza-net.workers.dev` |

`wrangler.production.jsonc` and `wrangler.ppe.jsonc` contain the target account IDs and Worker names. Neither configuration refers to the source account.

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

## Offline QR reader artifact

`artifacts/qr-gov-br.html` is a standalone browser artifact. It is separate from the Cloudflare Worker and does not add a public route or change the empty-response contract. Keep it in the same directory as `artifacts/jsqr.js`, `artifacts/vio.js`, and `artifacts/qr-formats.js`.

Open `artifacts/qr-gov-br.html` locally, then choose, drop, or paste an image containing a QR code. The Brazilian Portuguese interface organizes readable payloads around three common cases:

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

`jsqr.js` is the vendored jsQR 1.4.0 browser decoder under Apache 2.0; its license is preserved in `artifacts/JSQR-LICENSE.txt`.

## GitHub environments and workflow inputs

Create these repository environments before the first deployment:

- `cloudflare-production`
  - variable `CLOUDFLARE_ACCOUNT_ID=97358a67fb6e05c67a44b04bdd9f7558`
  - secret `CLOUDFLARE_API_TOKEN` scoped to deploy Workers in that account
- `cloudflare-ppe`
  - variable `CLOUDFLARE_ACCOUNT_ID=b84c535427bb541a804d4055918a94ab`
  - secret `CLOUDFLARE_API_TOKEN` scoped to deploy Workers in that account

The workflows do not accept custom text inputs. GitHub's standard workflow `--ref` selection chooses the PPE revision. The production job refuses to run unless the selected ref is `main`. Each workflow checks its environment account ID against the account baked into the matching Wrangler configuration before it calls Wrangler.

A push to `main` deploys production. Operators can also rerun production explicitly:

```sh
gh workflow run deploy-production.yml \
  --repo pedropaulovc/artifacts-vza-net \
  --ref main
```

PPE is manual, so a branch or commit must be selected deliberately:

```sh
gh workflow run deploy-ppe.yml \
  --repo pedropaulovc/artifacts-vza-net \
  --ref <branch-or-commit>
```

## Cutover runbook

This repository does not change the public route by itself. The first production cutover is an operator action.

1. Deploy the intended revision to PPE and smoke-test the PPE workers.dev origin.
2. Merge that revision to `main`. Wait for the production deployment to finish, then smoke-test the production workers.dev origin.
3. In the production account, attach `artifacts.vza.net` to `artifacts-vza-net-prod`. Do not configure the source account as a fallback.
4. Run the same checks against `https://artifacts.vza.net` and confirm the DNS/TLS path reaches the production account.
5. Keep the old source Worker only for the agreed observation period. Once the target is stable, remove its obsolete route or custom-domain association, credentials, and `artifacts` service from account `18ef3246e9f36d1560485ef53889c0ab`.

Use this smoke check with each origin:

```sh
origin=https://artifacts-vza-net-ppe.artifacts-ppe-vza-net.workers.dev

test "$(curl -sS -o /dev/null -w '%{http_code}:%{size_download}' "$origin/")" = "200:0"
test "$(curl -sS -o /dev/null -w '%{http_code}:%{size_download}' -I "$origin/")" = "200:0"
test "$(curl -sS -o /dev/null -w '%{http_code}:%{size_download}' -X POST "$origin/")" = "405:0"
test "$(curl -sS -o /dev/null -w '%{http_code}:%{size_download}' "$origin/contract-probe")" = "404:0"
```

Repeat with the production origin and then `https://artifacts.vza.net` during cutover.

## Rollback

Rollback stays in the target production account. Revert the bad change on `main` and push the revert; the production workflow deploys the previous implementation to `artifacts-vza-net-prod`. If the custom-domain attachment is wrong while the workers.dev origin is healthy, fix or remove that attachment until it points to the target Worker. Do not send traffic back to account `18ef3246e9f36d1560485ef53889c0ab`.

After rollback, rerun all four smoke checks against the production workers.dev origin and the public hostname. Source cleanup must wait until the target deployment and public cutover have passed the agreed observation period.
