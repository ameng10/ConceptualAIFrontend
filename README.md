# ConceptualAI (frontend)

Vue 3 + Vite app for **ConceptualAI**, built by Davis Lee and Anthony Meng.

## Backend

- **Repository:** [github.com/rdavislee/ConceptualAI](https://github.com/rdavislee/ConceptualAI)

## License

This project is released under the [MIT License](LICENSE).

Copyright (c) 2026 Davis Lee and Anthony Meng.

## Development

```bash
npm install
npm run dev
```

User-facing documentation is in the [`documentation/`](./documentation/) folder.
Deploy settings and the routing contract are in [`DEPLOY.md`](./DEPLOY.md).

### Public pages vs the app

The marketing surface is static HTML at the repo root (`index.html`,
`pricing.html`, `alternatives.html`, `case-studies.html`, `case-study-*.html`,
plus the legal pages). The Vue app is a separate entry point, `app.html`, which
carries `robots: noindex` and renders nothing without JavaScript — so anything
that has to be findable must be a static page, not a client-side route. Adding
one means registering it in three places; see the routing contract in
[`DEPLOY.md`](./DEPLOY.md).

`case-study-*.html` are **generated** from the demo cards in `index.html` so the
published prompt on each page stays byte-identical to the one that built the app.
Edit the card, not the case study.

### Checks

```bash
node scripts/check_pricing_parity.mjs
```

`pricing.html` states prices as text (a crawler or an answer engine reading
JavaScript-rendered numbers is not something to rely on), which duplicates the
ladder that lives in the backend's `src/utils/billing.ts`. A stale number here
is a published price we would have to honour, so this derives the table from
`TIERS` and compares it cell by cell — **by position**, so reordering a column
means moving the guard's expected array with it.

It prints `SKIP` rather than passing when the backend repo isn't checked out
beside this one, and it is deliberately not a deploy gate: Deploy builds this
repo alone and cannot see `billing.ts`. Run it whenever either side of the
ladder moves.
