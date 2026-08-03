# Troubleshooting

Grouped by where the problem happens: during the build, running the app, deploying it, or in the generated code itself.

---

## During the build

### It has been running a long time

Build time scales with app size. Small apps finish well under an hour; large ones can take a couple of hours, mostly in wiring the API and generating the frontend. The status page shows progress throughout.

A build is only treated as failed when its sandbox stops making progress for **four hours**, at which point it is reclaimed automatically.

What to do:

- Give it time before assuming it is stuck — a moving status is a working build.
- Do not start multiple runs for the same project. They compete rather than help.
- If a run does fail, resume rather than restart. Completed stages are saved, and your project returns to the last one that finished.
- If it keeps failing, try a smaller initial scope and iterate up.

### The build failed

You do not supply an AI key to build an app, so a failure is almost never a configuration problem on your side.

- Resume the run from the project page.
- If it fails again in the same place, simplify the scope and add the complex part back as an iteration.
- If builds fail consistently across different projects, that is a problem on our side — [tell us](mailto:admin@conceptual-ai.app).

Failed builds cost nothing. See the [Billing & Refund Policy](./billing-and-credits.md).

### The plan is missing features I asked for

Use **Modify plan** with specific feedback, naming the exact features and roles you need. Repeat until it is right. This is much cheaper than fixing it after the build.

### The structure looks wrong

Use **Modify design** instead — it re-runs the concept design and the quote without redoing the plan. See [Concepts and Syncs](./concepts-and-syncs.md#giving-feedback-that-works) for feedback that actually lands.

---

## Previews

### The preview will not start

- The project must have a **completed build**. This is by far the most common cause.
- You can have **one active preview at a time** — stop the existing one first.
- Previews last **15 minutes** and then expire on their own.
- Building or iterating stops the current preview, so it always matches the latest build.

### Payment / email / Slack does nothing in the preview

That is correct behavior. **Previews mock every outside integration.** No card is charged, no email is sent, no message is posted — a preview never receives live credentials.

AI is the exception and runs for real.

To test an integration properly, [deploy](./deploy-with-deno-deploy.md) with your own keys.

---

## Running it locally

### The backend will not start

- `.env` exists in the backend folder (copied from `.env.template`, not left as the template).
- `MONGODB_URL` is the full connection string, with `<username>` and `<password>` replaced by real values. Percent-encode special characters in the password.
- `DB_NAME` is set.
- `JWT_SECRET` is set and at least 32 characters.

### Database connection errors

- Your current IP is in the Atlas Network Access list.
- Username and password are right, and the password is URL-encoded if it contains reserved characters.
- The cluster is running, not paused.

Guide: [Choose Your Database](./choose-your-database.md).

### Login does not work, or sessions drop

- `JWT_SECRET` is set and long enough.
- The frontend's `VITE_API_URL` points at the backend.
- Changing `JWT_SECRET` invalidates every existing session — expected, and everyone must log in again.

### The frontend loads but no data appears

Open your browser's dev tools and check the network tab:

- **CORS error** → set `REQUESTING_ALLOWED_DOMAIN` on the backend to the frontend's origin.
- **404 on every request** → `VITE_API_URL` is missing the `/api` path.
- **Connection refused** → the backend is not running, or is on a different port.
- **401 on everything** → an auth problem; see above.

### An AI feature errors or returns nothing

- `AI_PROVIDER` and `AI_MODEL` are set.
- The key matches the provider — `GEMINI_API_KEY` when `AI_PROVIDER=gemini`.
- The key is valid, not revoked, and the account has quota left.
- The feature has enough context to work with. A document-aware feature with no documents has nothing to answer from.

Guide: [Outside Integrations](./integrations.md#ai-providers).

---

## Deploying

### It works locally but not deployed

Work down this list:

1. **Entrypoint is `src/main.ts`**, not `deno task start`. A task is not a valid entrypoint.
2. **Build command is `deno task build`.** Without it the import barrels are stale and the app cannot boot.
3. **Environment variables are set in the dashboard.** There is no `.env` file on Deno Deploy.
4. **`VITE_API_URL` points at `<backend-url>/api`** and the frontend was rebuilt after it changed — it is baked in at build time.
5. **`REQUESTING_ALLOWED_DOMAIN`** on the backend matches the frontend's URL.
6. **Single page app mode is on** for the frontend, or every URL except `/` returns 404.

### Database timeouts in production, but fine locally

The IP allowlist. Deno Deploy has no fixed outbound IP addresses, so allowlisting your laptop does nothing for the deployed app — it needs `0.0.0.0/0` on Atlas, or a private endpoint on a paid tier. See [Choose Your Database](./choose-your-database.md#about-the-ip-allowlist).

### Every URL except the home page 404s

Single page app mode is off on the frontend deployment.

### The frontend build fails on Deno Deploy

If you see `failed to load config from .../vite.config.ts`, `Import "path" not a dependency`, or `require is not defined`: Deno Deploy runs npm scripts under Deno, which is stricter than Node. Config files must import Node built-ins with the `node:` prefix (`import path from "node:path"`) and use ESM imports rather than `require()`. Apps generated after July 9, 2026 already ship compatible configs.

### An integration works in nothing but the mock

Real credentials are only present where you put them. Check that the variables are set **in the production dashboard**, not only in your local `.env`, and that `*_MODE` variables are not pinned to `mock`.

---

## Debugging the generated code

The code is yours, and it is ordinary TypeScript. Working through bugs with an AI coding assistant is effective, because the structure is small and self-contained.

A workflow that works well:

1. **Open both projects** — backend and frontend — in separate windows of an agentic editor.
2. **Run locally and click around.** Use the app the way a user would and note what breaks.
3. **Start with the frontend.** Copy any error from the browser console and the backend terminal, hand it to the assistant, describe the bug, and ask it to either fix the issue or tell you it looks like a backend problem.
4. **Hand off to the backend** if it says so, carrying the frontend assistant's findings across as context.
5. **Repeat.** Most issues resolve in a pass or two.

Two things make this easier than debugging typical generated code:

- **Concepts are isolated.** A bug is almost always inside one concept or one sync, not spread across the codebase.
- **The tests already exist.** Run `deno task test` after each fix to confirm nothing else broke.

## Still stuck?

- Report it on the [bug report feed](/posts) so other users can see it too.
- Email [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app).

## Last-resort recovery

1. Start from a smaller app description.
2. Get the plan right before approving.
3. Build, and confirm it runs locally.
4. Add the complicated parts back one at a time with **Modify this app**.
