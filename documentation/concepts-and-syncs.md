# Concepts and Syncs

This explains how your app is built, and how to steer it. You do not need any of this to use ConceptualAI — but it is what the review gate is showing you, so it helps to know what you are looking at.

## Concepts

A **concept** is a self-contained unit of behavior with its own state and its own actions.

Think of concepts as small specialists. One manages authentication. Another manages posting. Another manages profiles. Each stays responsible for one coherent area and knows nothing about the others.

That independence is the whole point: a concept can be understood, tested, and reused on its own.

## Syncs

A **sync** is a coordination rule. It connects concepts without merging them into one tangled service.

When a request arrives, a sync checks conditions, calls actions across whichever concepts are involved, and shapes the response. The concepts never call each other directly — the sync does the wiring.

So `POST /posts` might be one sync that verifies a session (Sessioning), checks permissions (Accessing), and creates the post (Posting). Three specialists, one rule composing them.

## Why it is built this way

- **Modularity** — small parts instead of one large service.
- **Legibility** — you can read one concept and understand it completely.
- **Reuse** — the same concept works across different apps.
- **Safer iteration** — changing one concept does not ripple through unrelated behavior, which is what makes targeted regeneration possible.

## The concept library

Because concepts are self-contained, most are not specific to any single application. Authentication, posting, liking, tagging, scheduling, payments — these behave the same way across countless apps.

We maintain a **library of pre-built concepts** that are already implemented and tested. During design, your app's needs are matched against that library, and anything that fits is pulled in. Only genuinely app-specific behavior gets generated from scratch.

This matters because:

- **It is faster.** A library concept skips implementation and testing entirely.
- **It is better.** Library concepts have been refined across many projects and handle edge cases a one-off generation tends to miss — timing-safe password comparison, pagination with multiple sort modes, webhook signature verification.
- **It is consistent.** Every app using a given library concept gets the same reliable interface.
- **It composes.** Authenticating, Sessioning, and Profiling fit together cleanly because they were designed to.

Your app can mix library and custom concepts freely — they follow the same conventions.

## What you see at the review gate

The concept design shown next to your plan is this structure: which library concepts were matched, which custom ones will be generated, and how your features map onto them. The credit quote is priced from it — the actions and queries across those concepts.

It is worth a minute of reading, because it is the cheapest point to change anything.

### Reviewing it

Look for:

- Do the concept names match real ideas in your domain?
- Are unrelated responsibilities bundled together?
- Is there a clear home for user permissions?
- Would a feature you are likely to want next be blocked by this structure?

### Giving feedback that works

Be specific about structure. Vague requests produce nothing.

Weak:

> Make it better.

Strong:

> Split notifications and messaging into separate concepts. Keep read-state in messaging only.

More examples:

- "Use separate concepts for billing, invoicing, and subscription state."
- "Keep moderation logic separate from posting logic."
- "Require profile onboarding before a user can post."

Use **Modify design** for structural changes like these — it re-runs the design and the quote without redoing the whole plan. Use **Modify plan** when the *features* are wrong, not the structure.

## Where to intervene

If a generated app feels off, it is usually a concept boundary or a sync condition. In order of cost:

- **At the gate** — change the plan or the design. Cheapest and most effective.
- **After the build** — use **Modify this app** with plain-language feedback. The pipeline re-enters and regenerates only the concepts, syncs, and pages your change touches, leaving everything else byte-identical.
- **In your own editor** — the code is yours. Concepts are ordinary TypeScript classes and syncs are ordinary functions, both readable on their own.

## Proof of what changed

Every iteration ships a receipt with the code:

- `ITERATION_RECEIPT.md` — a readable summary.
- `receipt.json` — every file with before and after hashes, marked `unchanged`, `regenerated`, `added`, or `removed`.
- `scripts/verify_receipt.ts` — re-hashes the repository against the receipt.

`unchanged` means byte-identical: that file was carried over, not regenerated. Run `deno run --allow-read scripts/verify_receipt.ts` to confirm it yourself. No dependencies, no network — the claim is independently checkable.

## Where the ideas come from

Concept design comes from Daniel Jackson's work at MIT:

- *The Essence of Software* — [princeton.edu](https://press.princeton.edu/ideas/daniel-jackson-on-the-essence-of-software)
- *Software Abstractions* — [MIT Press](https://mitpress.mit.edu/9780262528900/software-abstractions)
- Concept and sync tutorial — [essenceofsoftware.com](https://essenceofsoftware.com/tutorials/concept-basics/sync)
- Paper artifacts — [DSpace@MIT](https://hdl.handle.net/1721.1/164199)

## Related

- [Getting Started](./getting-started.md)
- [Troubleshooting](./troubleshooting.md)
