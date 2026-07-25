# Deno Deploy configuration (authoritative runbook)

Deno Deploy has no config-as-code file for app settings — they live in the
dashboard only. This file is the in-repo source of truth so a recreated or
misconfigured Deploy app doesn't silently regress (the known failure mode:
an app recreated as **Static** breaks every SPA route — `/build`, `/login`,
`/project/:id` — because only `serve.ts` knows the MPA/SPA routing split).

## App settings (dashboard → App Config)

| Setting         | Value                          |
|-----------------|--------------------------------|
| App type        | **Dynamic** (NOT Static)       |
| Entrypoint      | `serve.ts`                     |
| Install command | `npm install`                  |
| Build command   | `npm run build`                |

Notes:
- `npm run build` runs `vue-tsc && vite build` — type errors fail the deploy
  (intended). `build:deploy` (vite only) exists as a fallback if the Deploy
  builder's TypeScript version ever fights vue-tsc; prefer fixing the types.
- Deploy's builder runs npm scripts under Deno's task runner: configs must
  keep `node:` import prefixes and stay require-free ESM.
- Hosts use HYPHENS (no underscores) in subdomain names.

## Environment variables (dashboard only — Deploy ignores `.env`)

| Variable       | Purpose                                                        |
|----------------|----------------------------------------------------------------|
| `VITE_API_URL` | Build-time (read in `src/services/http.ts`): the deployed gateway origin, e.g. `https://<backend-app>.deno.net/api` (a trailing `/api` is stripped; call sites prefix `/api`). Unset ⇒ relative URLs through the Vite `/api` proxy (local dev only). |

`serve.ts` itself reads only `PORT` (local runs; Deploy manages its own
port). If a variable is ever added, list it here by NAME (never the value).

## Routing contract

`serve.ts` (production) and the dev middleware in `vite.config.ts` must stay
in sync:
- `/` → `dist/index.html` (static marketing landing — NOT an SPA route)
- `/terms`, `/privacy`, `/refunds` → their static HTML pages (pretty URLs)
- existing files → served from `dist/`
- any other extension-less path → `dist/app.html` (the SPA)

## Recreate checklist

1. Create the app from this GitHub repo in the Deploy dashboard.
2. If build config was auto-detected as a static site, click **Edit build
   config** and set the four values from the table above.
3. Verify after first deploy: `/` shows the landing, `/terms` renders,
   `/build` loads the SPA (not a 404/blank), and a deep SPA link like
   `/project/does-not-exist` still boots the app shell.
