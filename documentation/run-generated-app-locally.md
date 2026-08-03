# Run Your Generated App Locally

Do this before you deploy. It takes a few minutes and catches most problems while they are still cheap to fix.

You need [Deno](https://deno.com/) for the backend, [Node.js](https://nodejs.org/) for the frontend, and a database URL.

## 1 — Get the code

Download the zip from the finished-project page, or use **GitHub Export** and clone the two repositories. You will have two folders: a backend and a frontend.

## 2 — Configure the backend

In the backend folder, copy `.env.template` to `.env` and fill it in:

```dotenv
MONGODB_URL=mongodb+srv://...
DB_NAME=myapp
JWT_SECRET=<at least 32 random characters>
```

- `MONGODB_URL` — where your database lives. Need one? [Choose Your Database](./choose-your-database.md). Postgres and Turso work too.
- `DB_NAME` — which database inside that server to use.
- `JWT_SECRET` — signs login tokens. Generate one with `openssl rand -base64 32`.

**Your `.env.template` is generated for your app**, so it lists exactly the variables your app needs — including one section per outside integration it uses. Anything you leave unset falls back to a built-in mock, except AI, which needs a real key. See [Outside Integrations](./integrations.md).

Keep `.env` out of git. It is already in `.gitignore`.

## 3 — Configure the frontend

In the frontend folder, copy `.env.example` to `.env`.

The default is already correct for local development:

```dotenv
VITE_API_URL=http://localhost:8000/api
```

Only change this when pointing at a deployed backend. Note it is read at **build time**, so a change needs a rebuild.

## 4 — Start the backend

From the backend folder:

```bash
deno task start
```

It serves on `http://localhost:8000`, with the API under `/api`. Wait for it to report that it is listening before starting the frontend — the frontend expects the API to answer.

If it fails immediately, the message is almost always about the database URL or a missing `JWT_SECRET`.

## 5 — Start the frontend

From the frontend folder, in a second terminal:

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

## 6 — Test it

Work through this list. It is the same list worth repeating after you deploy.

- Can a new user register?
- Can that user log in, and stay logged in across a refresh?
- Do the core pages load without console errors?
- Do create, edit, and delete work for your main feature?
- Do errors show clearly on invalid input, rather than failing silently?
- Are permissions right — can a user see or change something they should not?
- If your app uses AI, does the output actually cover the scope and constraints you asked for?

Generated code can contain bugs. Finding them here is the point of this step.

## 7 — Run the test suite

Your app ships with tests. From the backend folder:

```bash
deno task test
```

## 8 — Look at the API docs

The backend ships an `openapi.yaml` describing every endpoint. Paste it into any OpenAPI viewer to browse the full API, or read the generated `README.md`, which lists the endpoints alongside an explanation of your app's structure.

## Something broken?

[Troubleshooting](./troubleshooting.md) covers the common failures — database connections, auth, CORS — and how to debug generated code effectively.

## Ready to publish?

[Deploy Your App](./deploy-with-deno-deploy.md).
