# Deploy Your Generated App with Deno Deploy

This guide helps you publish your generated app online so anyone can use it.

Your generated app has two parts:

- a **backend** — a Deno server (runs on port `8000`, serves the API under `/api`)
- a **frontend** — a static Vite/React app (a `dist/` folder after you build it)

Because the backend is already a Deno program, [Deno Deploy](https://deno.com/deploy) is the natural host for both parts.

Back to docs home: [ConceptualAI User Documentation](./README.md)

## Why Deno Deploy?

- The generated backend is Deno, so it runs on Deno Deploy with no conversion or container build.
- Git-based deploys and simple environment-variable management.
- Can also serve the built static frontend, so both parts live on one platform.

Official docs:

- Deno Deploy: https://docs.deno.com/deploy/
- Deploying from GitHub: https://docs.deno.com/deploy/manual/git-integration/
- Environment variables: https://docs.deno.com/deploy/manual/environment-variables/

## Recommended model

Create **two Deno Deploy projects** from one repository:

- a `backend` project (the API server)
- a `frontend` project (the built static site)

Deploy the backend first so you know its public URL, then point the frontend at it.

## Step 1 — Deploy the backend

1. Push your generated backend + frontend code to GitHub.
2. In the Deno Deploy dashboard, create a project from your repo and select the **backend** folder.
3. Set the entry point to the backend's start command. The generated backend starts with:
   - `deno task start` (see the backend `deno.json` `tasks`)
4. Add the backend environment variables:
   - `MONGODB_URL`
   - `DB_NAME`
   - `JWT_SECRET`
   - If your app uses AI features, also `AI_PROVIDER`, `AI_MODEL`, and the matching provider key (e.g. `GEMINI_API_KEY`). See [AI Capabilities in Generated Apps](./generated-app-ai-capabilities.md).
   - Set `REQUESTING_ALLOWED_DOMAIN` to your frontend's public URL once you know it (CORS).
5. Deploy, then copy the backend's public URL (your API will be at `<backend-url>/api`).

## Step 2 — Deploy the frontend

1. Build the frontend locally or in CI: `npm install` then `npm run build` (produces `dist/`).
2. Set `VITE_API_URL` to your deployed backend's API URL **before building**, for example:
   - `VITE_API_URL=https://your-backend.deno.dev/api`
   - `VITE_API_URL` is read at build time, so rebuild whenever it changes.
3. Create a second Deno Deploy project that serves the static `dist/` output.
4. Deploy the frontend.

## Step 3 — Connect the two

1. Confirm `VITE_API_URL` on the frontend points at the backend's `/api` URL.
2. Confirm the backend `REQUESTING_ALLOWED_DOMAIN` allows the frontend's domain.
3. Redeploy whichever side you changed.

## Pre-deploy checklist

- Local app works first ([Run Your Generated App Locally](./run-generated-app-locally.md)).
- No secrets committed to git.
- Backend env vars set in Deno Deploy (`MONGODB_URL`, `DB_NAME`, `JWT_SECRET`, plus any AI vars).
- `VITE_API_URL` set to the deployed backend URL **before** building the frontend.

## Common mistakes

- Building the frontend before the backend URL is known (then forgetting to rebuild).
- Forgetting to set production env vars in Deno Deploy.
- CORS errors because `REQUESTING_ALLOWED_DOMAIN` doesn't include the frontend domain.
- Pointing `VITE_API_URL` at the backend root instead of the `/api` path.

## After deploy

Test from an incognito window:

- Register / log in
- The core flow for your main feature
- Error handling (invalid input, missing data)

If anything fails, use: [Troubleshooting](./troubleshooting.md)
