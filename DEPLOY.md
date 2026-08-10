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
- pretty URLs → their static HTML pages:
  `/terms`, `/privacy`, `/refunds`, `/pricing`, `/alternatives`,
  `/case-studies`, and `/case-studies/{deskmind,atelier,commons,stride,shopfront}`
- existing files → served from `dist/` (includes `robots.txt`, `sitemap.xml`,
  `og-card.png`, all copied from `public/`)
- any other extension-less path → `dist/app.html` (the SPA)

### Adding a public page: THREE places, or it 404s

A new static page has to be registered in all three, and the failure is
asymmetric — miss the rollup input and it is simply absent from `dist/`; miss
either route map and the URL falls through to `app.html`, which sends
`robots: noindex`, so the page returns 200 while being invisible to search
engines and answer engines:

1. `vite.config.ts` → `build.rollupOptions.input` (so it is emitted at all)
2. `vite.config.ts` → the dev-middleware pretty-URL map (so `npm run dev` matches prod)
3. `serve.ts` → `PRETTY_PAGES` (production)

Then add it to `public/sitemap.xml`. Never list a URL there that resolves to
`app.html`: that asks a crawler to index a page carrying `noindex`, which is
why `/pricing` had to become static HTML rather than staying a Vue route.

**Marketing pages are static on purpose.** The SPA shell is `noindex` and
renders nothing without JavaScript, so anything that needs to be found —
prices, comparisons, case studies — cannot live on a client-side route.

## Recreate checklist

1. Create the app from this GitHub repo in the Deploy dashboard.
2. If build config was auto-detected as a static site, click **Edit build
   config** and set the four values from the table above.
3. Verify after first deploy: `/` shows the landing, `/terms` renders,
   `/build` loads the SPA (not a 404/blank), and a deep SPA link like
   `/project/does-not-exist` still boots the app shell.
4. Verify the indexable surface, since a Static app serves these but routes
   every pretty URL to the SPA shell — they return 200 either way, so check
   the CONTENT, not the status code:

   ```bash
   for p in / /pricing /alternatives /case-studies /case-studies/deskmind \
            /terms /privacy /refunds /robots.txt /sitemap.xml /og-card.png; do
     echo "$p $(curl -s -o /dev/null -w '%{http_code}' https://conceptual-ai.app$p)" \
          "noindex:$(curl -s https://conceptual-ai.app$p | grep -c 'content=\"noindex\"')"
   done
   ```

   Every line must read `200` with `noindex:0`. A pretty URL showing
   `noindex:1` means it fell through to `app.html` — the routing regressed.
