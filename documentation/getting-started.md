# Getting Started

This is the whole path: describe an app, approve one review, let it build, test it, then take the code.

You need an app idea and roughly **30 to 90 minutes** for a full run. You do **not** need an AI key — we supply the AI that builds your app. You do not need a database or any other account until you want to *run* what was built.

## Step 1 — Describe your app

Write what you want in plain language. Three things make a description work:

- **Who the users are.** "Students and teachers." "Hosts and guests."
- **What each of them can do.** "Students add tasks and mark them done. Teachers post announcements."
- **What happens when they act.** "When a booking is made, a message thread opens between the guest and the host."

A good example:

> Build a school task app where students can add tasks, mark them done, and teachers can post announcements. Teachers can see every student's task list; students only see their own.

You do not need to describe screens, database tables, or technology. Describe behavior.

## Step 2 — Approve the review

A few minutes later you land at the one gate in the process. It shows three things together:

- **The plan** — the features and user roles we understood from your description.
- **The concept design** — the building blocks your app will be made from. Some are pulled from our tested library; some are generated for your app specifically. See [Concepts and Syncs](./concepts-and-syncs.md).
- **A credit quote** — what the build will cost, priced from the size of that design. Nothing is charged until you approve all three together.

**Read the plan before you approve.** This is the cheapest moment to change anything. Look for features you wanted that are missing, features you did not ask for, and wrong assumptions about who can do what.

Two ways to change it:

- **Modify plan** — re-runs the whole review. Use it for scope: "Add password reset, and separate student and teacher roles."
- **Modify design** — re-runs just the concept design and the quote. Use it for structure: "Split notifications and messaging into separate concepts."

Be specific. "Make it better" produces nothing useful; "keep read-state in messaging only" produces a change.

Repeat until it looks right, then approve. **Approving starts the build.**

## Step 3 — Wait for the build

After you approve, everything is automatic. There are no further buttons to press — the pipeline designs, implements, wires, tests, and assembles your app on its own, and the status page shows progress.

Rough timing, which varies a lot with app size:

- Small apps finish in well under an hour.
- Large apps can take a couple of hours, most of it in wiring the API and generating the frontend.

If a build stops making progress for four hours, its sandbox is reclaimed and the run is treated as failed. Work already finished is saved — you resume from the last completed stage rather than starting over. See [Troubleshooting](./troubleshooting.md).

## Step 4 — Preview it

When the build finishes, **Live Preview** starts a temporary hosted copy of your app: real frontend, real backend, real database, opened in your browser from a link.

What to know:

- A preview lasts **15 minutes** and you can have **one at a time**.
- Building or iterating on the project stops the current preview, so the preview always matches the latest build.
- Stopping a preview takes a moment — the button stays disabled while cleanup finishes.

**Outside integrations are mocked in previews.** Payments, email, Slack, Discord, storage, calendars, and analytics all run against built-in fakes. Checkout will not charge a card and no email will arrive — by design, since a preview never receives live credentials. **AI is the exception:** AI-backed features run for real. To test a real integration, deploy with your own keys. See [Outside Integrations](./integrations.md).

Previews are for looking, not for launching. For real use, [deploy the app](./deploy-with-deno-deploy.md).

## Step 5 — Take the code

Two ways to get your application:

- **Download the code** — a zip of both projects, backend and frontend.
- **GitHub Export** — pushes the backend and frontend to two repositories in your own GitHub account. Choose the repo names and whether they are private or public.

Either way the code is yours. It includes the test suite, an `openapi.yaml` describing every endpoint, a `Dockerfile`, and a generated `README.md` written for your specific app — the README lists exactly the environment variables your app needs, which is more reliable than any general guide.

## Step 6 — Run it, then deploy it

1. **[Run it locally](./run-generated-app-locally.md)** first. You need a database URL and a JWT secret; it takes a few minutes and catches most problems.
2. **[Deploy it](./deploy-with-deno-deploy.md)** when local works.

## Step 7 — Iterate

**Modify this app** takes plain-language feedback on the finished application and regenerates only what your change touches:

> Add a dark mode toggle and let users edit their profile.

Depending on the change, this re-plans and rebuilds the affected concepts and endpoints, or regenerates just the frontend. Everything untouched is carried over unchanged — not regenerated, not re-rolled.

You get proof of that. Every iteration ships an **Iteration Receipt** alongside the code:

- `ITERATION_RECEIPT.md` — a readable summary of what changed.
- `receipt.json` — every file with a before and after hash, marked `unchanged`, `regenerated`, `added`, or `removed`. `unchanged` means byte-identical.
- `scripts/verify_receipt.ts` — re-hashes the exported repository against the receipt. Run `deno run --allow-read scripts/verify_receipt.ts`; no dependencies, no network.

So "we only touched these files" is a claim you can check yourself.

## What to test before you trust it

Whether in a preview or locally:

- Can a new user register and log in?
- Do the core pages load?
- Do create, edit, and delete work for your main feature?
- Do errors show clearly on bad input?
- If your app uses AI, does the output actually cover the scope you asked for — not just return something?

Generated code is written by AI and can contain bugs. We guarantee you get a working, delivered application; we do not guarantee it is defect-free. Review it before real users touch it.

## Next

- [Concepts and Syncs](./concepts-and-syncs.md) — how your app is structured, and how to steer it
- [Outside Integrations](./integrations.md) — what your app can connect to
- [Troubleshooting](./troubleshooting.md) — when something goes wrong
