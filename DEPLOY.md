## Deployment

This version is designed for Vercel plus a remote Browserless browser.

### Vercel

Deploy this repo to Vercel as a normal project.

Vercel uses:

- `index.html` for the frontend
- `api/prices.js` for `/api/prices`
- `api/health.js` for `/api/health`

### Required environment variables

Set one of these in Vercel:

- `BROWSERLESS_WS_URL`
- or `BROWSERLESS_TOKEN`

Optional:

- `BROWSERLESS_BASE_URL`
  - default: `wss://production-sfo.browserless.io`
- `NADIR_FUNCTION_TIMEOUT_MS`

Examples:

- `BROWSERLESS_WS_URL = wss://production-sfo.browserless.io?token=YOUR_TOKEN`
- or:
  - `BROWSERLESS_TOKEN = YOUR_TOKEN`
  - `BROWSERLESS_BASE_URL = wss://production-sfo.browserless.io`

### What to test after deploy

Open:

- `/api/health`
- `/api/prices`

Expected `/api/health`:

- `ok: true`
- `browserlessConfigured: true`

Expected `/api/prices`:

- `provider: "nadirdoviz-browserless"`
- `rows.goldKgUsd`
- `rows.goldKgEur`
- `rows.silvOns`
- `rows.silvKgUsd`
- `rows.silvKgEur`

### Notes

- There is no Render, Netlify, or Docker requirement in this version.
- Browser execution happens through Browserless, not inside the Vercel function runtime.
- `server.js` is no longer the deployment path for Vercel.
