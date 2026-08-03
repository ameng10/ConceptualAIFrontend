# ConceptualAI Documentation

ConceptualAI turns a plain-language description into a complete, tested web application — a Deno backend, a React frontend, a test suite, an OpenAPI specification, and documentation. You own the code.

**New here?** Read [Getting Started](./getting-started.md). It walks the whole path, from writing a description to deploying a live app.

## Build

- **[Getting Started](./getting-started.md)** — write a description, approve the plan, watch it build, preview it, iterate on it.
- **[Concepts and Syncs](./concepts-and-syncs.md)** — how your app is put together, and how to steer it at the design gate.

## Run and deploy

- **[Run Your Generated App Locally](./run-generated-app-locally.md)** — do this first. It is the fastest way to find problems.
- **[Deploy Your App](./deploy-with-deno-deploy.md)** — put it online with Deno Deploy: exact build settings, environment variables, and API-key handling.
- **[Choose Your Database](./choose-your-database.md)** — MongoDB by default; Postgres and Turso work with no code changes.
- **[Outside Integrations](./integrations.md)** — every external service your app can use, what each needs, and what it costs.

## When something breaks

- **[Troubleshooting](./troubleshooting.md)** — build problems, deploy problems, and how to debug a generated app.

## Legal

- **[Terms of Service](./terms-of-service.md)**
- **[Privacy Policy](./privacy-policy.md)**
- **[Billing & Refund Policy](./billing-and-credits.md)**

## Three things worth knowing up front

1. **You do not need an AI key to build an app.** We supply the AI that generates your application. You only supply keys if the app you generate uses outside services itself — and then those keys are yours, in your app's environment, billed to your account. See [Outside Integrations](./integrations.md).

2. **Previews mock every outside service.** A preview runs your app for real, but Stripe, email, Slack, storage, and the rest run against built-in fakes. Nothing charges a card or sends a message. AI is the exception — it runs live. Test integrations after you deploy with your own keys.

3. **We guarantee a delivered application, not a bug-free one.** Generated code is written by AI and can contain defects. Review and test it before you put it in front of real users. See the [Terms of Service](./terms-of-service.md).
