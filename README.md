# Wedding Invite (React + Vite)

Mobile-first SPA invitation with routes `/`, `/protocol` and `/results`.

## Local run

```bash
npm install
npm run dev
```

For local development, Yandex Forms requests go through Vite proxy:
- frontend calls `/api/yandex-forms/surveys/:id/...`
- Vite forwards to `https://api.forms.yandex.net/v1/surveys/:id/...`

## Environment variables

Copy `.env.example` to `.env` and fill values:

- `VITE_YANDEX_FORMS_SURVEY_ID`
- `VITE_YANDEX_FORMS_NAME_SLUG`
- `VITE_YANDEX_FORMS_CONFIRMATION_SLUG`
- `VITE_YANDEX_FORMS_PROXY_URL` (for production)
- optional `VITE_YANDEX_FORMS_KEY` (if your public form link contains `?key=...`)
- optional `VITE_YANDEX_FORMS_ORG_ID` (needed for answers API in some orgs)
- optional `VITE_YANDEX_FORMS_CLOUD_ORG_ID`

`VITE_YANDEX_FORMS_OAUTH_TOKEN` is local-only. Do not expose production tokens in frontend env.

## Production architecture

GitHub Pages is static-only and cannot run backend code.

Production setup in this repo:
1. Frontend deploys to GitHub Pages via `.github/workflows/deploy.yml`.
2. Forms proxy deploys to Cloudflare Worker via `.github/workflows/deploy-forms-proxy.yml`.
3. Frontend uses Worker URL from `VITE_YANDEX_FORMS_PROXY_URL`.

## Configure GitHub Pages deploy

In repository **Variables** (`Settings -> Secrets and variables -> Actions -> Variables`), set:

- `VITE_YANDEX_FORMS_SURVEY_ID`
- `VITE_YANDEX_FORMS_NAME_SLUG`
- `VITE_YANDEX_FORMS_CONFIRMATION_SLUG`
- `VITE_YANDEX_FORMS_PROXY_URL` (Worker URL)
- optional `VITE_YANDEX_FORMS_KEY`
- optional `VITE_YANDEX_FORMS_ORG_ID`
- optional `VITE_YANDEX_FORMS_CLOUD_ORG_ID`

Push to `main` to deploy Pages.

## Configure Cloudflare Worker deploy

Worker source: `proxy-worker/`.

Set GitHub **Secrets**:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `YANDEX_FORMS_OAUTH_TOKEN` (recommended; worker uses this token for upstream submit)
- optional `YANDEX_FORMS_ORG_ID` (recommended for `/results` API)

Then run workflow `Deploy Yandex Forms Proxy` or push changes under `proxy-worker/**`.

After first deploy, copy Worker URL (for example `https://wedding-yandex-forms-proxy.<subdomain>.workers.dev`) into repo variable `VITE_YANDEX_FORMS_PROXY_URL`.

## Worker CORS and duplicate protection

Allowed origins are configured in `proxy-worker/wrangler.toml` (`ALLOWED_ORIGINS`).

Server-side duplicate blocking is optional and uses Cloudflare KV:

1. Create KV namespace:

```bash
cd proxy-worker
npx wrangler kv namespace create SUBMIT_DEDUP_KV
```

2. Copy returned namespace id.
3. In `proxy-worker/wrangler.toml` fill:

```toml
[[kv_namespaces]]
binding = "SUBMIT_DEDUP_KV"
id = "<YOUR_KV_NAMESPACE_ID>"
```

4. Deploy worker again.

Behavior with KV enabled:
- Dedup key is computed by `survey_id + normalized field value`.
- Field name defaults to `name` and is configured by `SUBMIT_DEDUP_FIELD_NAME`.
- Repeat submit returns `409 duplicate_submission`.
- TTL configured by `SUBMIT_DEDUP_TTL_SECONDS` (default 1 year).

## Results page

`/results` loads responses from `GET /surveys/:id/answers` and renders table:
- column 1: name (`VITE_YANDEX_FORMS_NAME_SLUG`)
- column 2: decision (`VITE_YANDEX_FORMS_CONFIRMATION_SLUG`)

If API returns `Требуется организация`, set org header via:
- Worker secret `YANDEX_FORMS_ORG_ID` (preferred)
- or frontend `VITE_YANDEX_FORMS_ORG_ID`
