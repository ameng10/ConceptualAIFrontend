# Deploy Your App

This guide puts your generated app online so other people can use it.

Your app has two halves:

- a **backend** — a Deno server that serves the API under `/api` (port `8000` locally)
- a **frontend** — a Vite/React app that builds to a static `dist/` folder

The backend is already a Deno program, so [Deno Deploy](https://deno.com/deploy) runs it with no conversion and no container build, and hosts the static frontend too. This guide uses Deno Deploy throughout. Your app also ships a `Dockerfile`, so any container host works if you prefer one.

**Before you start:** get it [running locally](./run-generated-app-locally.md) first. Deploying a build you have never run turns two problems into one confusing problem.

Official references: [Deno Deploy docs](https://docs.deno.com/deploy/) · [Build configuration](https://docs.deno.com/deploy/reference/builds/) · [Environment variables](https://docs.deno.com/deploy/reference/env_vars_and_contexts/)

> The dashboard is **app.deno.com**. The old Deploy Classic dashboard at `dash.deno.com` shut down on July 20, 2026 — if you find a guide that references it, or a `docs.deno.com/deploy/manual/...` link, it is out of date.

## The shape of it

You create **two apps** on Deno Deploy from one repository — one for the backend, one for the frontend.

Deploy the backend first, because the frontend has to be built with the backend's URL baked in.

## Step 0 — Get a database

Your backend needs a database before it can start. MongoDB Atlas has a free tier that is fine for a first deployment; Postgres and Turso work too, with no code changes.

Set that up now: **[Choose Your Database](./choose-your-database.md)**.

One thing that specifically matters here: **Deno Deploy has no fixed outbound IP addresses**, on any plan. If your database restricts access by IP, you cannot allowlist "the app's IP" — there isn't one. On Atlas that means adding `0.0.0.0/0` to Network Access and relying on your database username, password, and TLS for security. The database guide covers this and the alternatives.

## Step 1 — Deploy the backend

1. Push the generated backend and frontend to GitHub. (**GitHub Export** on the finished-project page does this for you, as two repositories.)
2. At [app.deno.com](https://app.deno.com), create an app from your repository and set the **working directory** to the backend folder.
3. Configure the build. There is no framework preset — this is a plain Deno app:

   | Field | Value |
   |---|---|
   | App type | **Dynamic** |
   | Install command | *(leave empty — Deno apps need none)* |
   | Build command | `deno task build` |
   | Entrypoint | `src/main.ts` |

   **The entrypoint is a file, not a task.** It is the same path you would hand to `deno run` locally. Entering `deno task start` here does not work — tasks are for local runs and Docker.

   `deno task build` regenerates the `src/concepts/concepts.ts` and `src/syncs/syncs.ts` import barrels. Skip it and the app boots with stale or missing imports.

   You do not set a port. Deno Deploy serves whatever the app's `Deno.serve` binds.

4. Add the environment variables. **There is no `.env` file on Deno Deploy** — every value comes from the dashboard.

   | Variable | Value |
   |---|---|
   | `MONGODB_URL` | your Atlas connection string (or the Postgres/Turso equivalents — see the [database guide](./choose-your-database.md)) |
   | `DB_NAME` | the database name |
   | `JWT_SECRET` | a long random secret, at least 32 characters — `openssl rand -base64 32` |
   | `REQUESTING_ALLOWED_DOMAIN` | your frontend's public URL, once you know it (this is CORS) |

   Plus one entry for each outside integration your app uses. **Your app's own `.env.template` is the authoritative list** — it is generated for your specific app and contains exactly the variables it reads, and the generated `README.md` explains each one. See [Outside Integrations](./integrations.md) for what each service needs and where to get keys.

5. Deploy. Copy the app's public URL — your API lives at `<backend-url>/api`.

## Step 2 — Deploy the frontend

1. Create a **second** app from the same repository, with the **working directory** set to the frontend folder.
2. Configure it as a static site:

   | Field | Value |
   |---|---|
   | App type | **Static** |
   | Install command | `npm install` |
   | Build command | `npm run build` |
   | Static directory | `dist` |
   | Single page app mode | **Enabled** |

   **Single page app mode is not optional.** The frontend routes on the client, so without it any URL other than `/` returns 404 — every deep link, refresh, and shared link breaks.

3. Set `VITE_API_URL` to your backend's API URL, for example `https://your-backend.deno.dev/api`.

   This is read **at build time**, not at runtime — Vite compiles it into the bundle. Change it and you must redeploy for the change to take effect. Point it at the `/api` path, not the backend root.

4. Deploy.

## Step 3 — Connect the two

1. Set `REQUESTING_ALLOWED_DOMAIN` on the **backend** to the frontend's public URL, and redeploy the backend.
2. Confirm `VITE_API_URL` on the **frontend** ends in `/api`.
3. Open the frontend and register an account. If the browser console shows CORS errors, step 1 is not right yet.

## API keys, safely

Your generated app may call outside services — an AI provider, Stripe, email, storage. Those keys are **yours**: you create them, they live in your app's environment, and usage is billed to your account. We never see them.

A few rules that prevent most incidents:

- **Never commit a key.** Not to `.env`, not to `.env.template`, not to a config file. `.env` is already in `.gitignore` — keep it that way. Real values go in the Deno Deploy dashboard.
- **Use restricted keys where the provider offers them.** Stripe restricted keys (`rk_live_...`) scoped to just what your app does are much safer than a full secret key. Most providers have an equivalent.
- **Separate test and production keys.** Use the provider's test mode while you are still checking things, and swap to live keys only when the app is ready.
- **Set spending limits and alerts** in the provider dashboard, especially for AI providers. A generated app with a loop in it can spend real money quickly, and that bill is yours.
- **Rotate anything that leaked.** If a key ends up in a screenshot, a commit, or a chat message, revoke it — do not just delete the message.
- **Nothing secret belongs in the frontend.** Anything starting with `VITE_` is compiled into JavaScript that anyone can read. `VITE_API_URL` is fine; an API key never is. Secrets belong on the backend.

## Pre-deploy checklist

- [ ] The app runs locally
- [ ] Database is reachable from anywhere your app might run (`0.0.0.0/0` on Atlas)
- [ ] No secrets committed to git
- [ ] Backend: entrypoint `src/main.ts`, build command `deno task build`, install command empty
- [ ] Backend env vars set — everything in your app's `.env.template`
- [ ] Frontend: Static, SPA mode on, static directory `dist`
- [ ] `VITE_API_URL` points at `<backend-url>/api`
- [ ] `REQUESTING_ALLOWED_DOMAIN` set to the frontend URL

## Common mistakes

**Entrypoint set to `deno task start`.** It must be the file `src/main.ts`.

**Build command left empty on the backend.** Without `deno task build`, the import barrels are stale and the app fails to boot.

**Single page app mode off.** The home page works, every other URL 404s.

**`VITE_API_URL` changed without redeploying.** It is baked in at build time.

**`VITE_API_URL` pointing at the backend root** instead of `<backend-url>/api`. Every request 404s.

**CORS errors.** `REQUESTING_ALLOWED_DOMAIN` on the backend does not match the frontend's URL.

**Database connection timeouts in production but not locally.** Almost always the IP allowlist — see Step 0.

**Frontend build fails with `failed to load config from .../vite.config.ts`, `Import "path" not a dependency`, or `require is not defined`.** Deno Deploy runs npm scripts under Deno, which is stricter than Node: config files must import Node built-ins with the `node:` prefix (`import path from "node:path"`) and use ESM imports rather than `require()`. Apps generated after July 9, 2026 already ship compatible configs; an older export may need this fixed by hand.

## Other ways to deploy

- **From your machine, no GitHub.** The Deno CLI can create and deploy an app directly from a local folder — see [`deno deploy`](https://docs.deno.com/runtime/reference/cli/deploy/). Useful for a quick first deploy.
- **Any container host.** Your backend ships a `Dockerfile`; build it and run it wherever you like. You still need the same environment variables, and the frontend still needs to be built and served as static files with an SPA fallback.

## After deploy

Test in an incognito window, so you are not relying on a logged-in session:

- Register a new account and log in
- Walk the main flow of your app end to end
- Try bad input and confirm errors are handled
- If your app uses outside integrations, test each one now — this is the first time they are running for real rather than mocked

If something fails, go to [Troubleshooting](./troubleshooting.md).

## Custom domains

Both apps get a `.deno.net` URL by default. You can attach your own domain to either from the Deno Deploy dashboard. If you point a custom domain at the frontend, update `REQUESTING_ALLOWED_DOMAIN` on the backend to match, and redeploy the frontend if `VITE_API_URL` changed.
