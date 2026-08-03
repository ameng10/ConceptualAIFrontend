# Outside Integrations

Generated apps can talk to outside services — AI providers, Stripe, email, file storage, Slack, and more. This page lists every integration available, what each one needs from you, and what it costs.

You do not choose these directly. When your description implies a capability ("let users pay", "email them a receipt"), the design picks up the matching building block, and the integration comes with it.

## Two rules that save time

**1. Your app's own `.env.template` is the authoritative list.** It is generated for your specific app and contains exactly the variables that app reads — nothing more. The generated `README.md` explains each one, including setup steps for each integration. This page is the general reference; your app's files are the truth for your app.

**2. Every service integration falls back to a mock.** If you do not configure a service, your app still runs — the integration uses a built-in fake that behaves correctly and does nothing real. Nothing crashes for want of a key. The one exception is AI, which needs a real key to do anything.

## Integrations are mocked during builds and previews

Your app is generated and tested inside an isolated sandbox, and previews run the same way. **Neither ever receives live credentials for these services.**

That means during a build or a preview:

- Checkout flows complete, but no card is charged.
- Emails "send", but nothing arrives.
- Slack and Discord messages are logged, not posted.
- Uploads succeed against in-memory storage.

**AI is the exception** — AI-backed features run against real models during generation and preview, so you can actually judge their output.

The first time your integrations run for real is when **you** deploy with **your** keys. Test them then. See [Deploy Your App](./deploy-with-deno-deploy.md).

## Everything available

| Service | What it powers | Key variables | Free tier |
|---|---|---|---|
| **AI providers** — OpenAI, Anthropic, Google Gemini, xAI, Fireworks | Chat, classification, extraction, moderation, document-aware answering, planning, research | `AI_PROVIDER`, `AI_MODEL`, `<PROVIDER>_API_KEY` | Gemini has a free tier; others are paid |
| **Stripe** | Payments, checkout, subscriptions | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Free to integrate; per-transaction fees |
| **Email** — Zoho, Gmail, Outlook | Sending and receiving mail from a real mailbox | `EMAIL_PROVIDER`, `EMAIL_ADDRESS`, OAuth trio | Depends on your mailbox provider |
| **Slack** | Team alerts and notifications | `SLACK_WEBHOOK_URL` *or* `SLACK_BOT_TOKEN` + `SLACK_CHANNEL` | Yes |
| **Discord** | Team alerts and notifications | `DISCORD_WEBHOOK_URL` | Yes |
| **Cloudflare R2** (or any S3-compatible store) | File uploads and downloads | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | 10 GB free on R2 |
| **Cloudinary** | Image hosting, CDN delivery, transforms | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Yes |
| **Cal.com** or **Google Calendar** | Bookings and scheduling | `SCHEDULING_PROVIDER` + provider credentials | Yes on both |
| **PostHog** or **Plausible** | Product analytics | `ANALYTICS_PROVIDER`, `POSTHOG_API_KEY` / `PLAUSIBLE_DOMAIN` | Yes on both |
| **Tavily** or **Exa** | Web search | `WEBSEARCH_PROVIDER`, `TAVILY_API_KEY` / `EXA_API_KEY` | Yes on both |
| **Google OAuth** | "Sign in with Google" | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | Free |
| **GitHub OAuth** | Connecting a user's GitHub account | `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_CALLBACK_URL` | Free |
| **Operator login** | An admin account defined in the environment, not registered through the app | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | n/a |

Three more capabilities need no account at all — PDF generation, CSV import and export, and text extraction from PDF and DOCX files all run inside your app.

---

## AI providers

**Powers:** conversation, classification, extraction, moderation, document-aware answering, schedule assistance, and research.

This is the only integration with **no mock**. An AI feature without a key does not work.

```dotenv
AI_PROVIDER=gemini
AI_MODEL=gemini-flash-latest
GEMINI_API_KEY=your-key-here
```

| Provider | `AI_PROVIDER` | Key variable | Get a key |
|---|---|---|---|
| Google Gemini (default) | `gemini` | `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| OpenAI | `openai` | `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| xAI | `xai` | `XAI_API_KEY` | [console.x.ai](https://console.x.ai/) |
| Fireworks | `fireworks` | `FIREWORKS_API_KEY` | [fireworks.ai](https://fireworks.ai/) |

`AI_MODEL` overrides the per-provider default for whichever provider is selected.

**This is the integration most likely to cost you real money.** Usage is billed to your provider account, and an app that calls a model in a loop can spend quickly. Before you deploy anything AI-heavy: check the provider's pricing page, set a spending limit and usage alerts in their dashboard, and start with a small, fast model.

AI output is probabilistic. It varies between runs and can be wrong. Test whether it covers the scope you asked for, not just whether it returns something.

## Stripe — payments

**Powers:** one-off purchases and subscriptions, via Stripe's hosted Checkout with signature-verified webhooks.

```dotenv
STRIPE_SECRET_KEY=rk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://your-app.com/?checkout=success
STRIPE_CANCEL_URL=https://your-app.com/?checkout=cancel
```

- **Use a restricted key** (`rk_test_...` / `rk_live_...`) scoped to Checkout Sessions rather than a full `sk_` secret key. A plain secret key works, but grants far more than the app needs.
- **Start in test mode.** Stripe's test cards let you walk the whole flow without money moving. Swap to live keys only when you are ready.
- `STRIPE_WEBHOOK_SECRET` comes from the webhook endpoint you register in the Stripe dashboard, pointing at your deployed backend. Without it, incoming events cannot be verified and are rejected — which is correct behavior, not a bug.
- Set the success and cancel URLs to your deployed frontend, or customers land nowhere after paying.

Stripe is free to integrate; you pay per transaction. See [stripe.com/pricing](https://stripe.com/pricing).

## Email

**Powers:** sending and receiving mail from a real mailbox — Zoho, Gmail, or Outlook.

```dotenv
EMAIL_PROVIDER=zoho
EMAIL_ADDRESS=hello@yourdomain.com
EMAIL_OAUTH_CLIENT_ID=...
EMAIL_OAUTH_CLIENT_SECRET=...
EMAIL_OAUTH_REFRESH_TOKEN=...
```

This is a mailbox integration, not a send-only relay: the app can read replies as well as send.

Getting the refresh token is a one-time step. Register an OAuth client in your provider's console, then run:

```bash
deno task email:auth
```

It walks you through authorizing the mailbox and prints the refresh token to paste into `.env`. Zoho also needs `EMAIL_ZOHO_REGION`; Outlook needs `EMAIL_GRAPH_TENANT`.

## Slack and Discord — team alerts

**Powers:** posting notifications into a channel.

The simplest setup for either is an incoming webhook — one URL, one channel, no OAuth:

```dotenv
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

For Slack, a bot token can post to any channel the bot has joined, rather than the single channel a webhook is bound to:

```dotenv
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL=#alerts
```

**Both webhook URLs are secrets** — the token is embedded in the URL. Anyone with the URL can post to your channel. Treat them like passwords.

## File storage — Cloudflare R2 or S3

**Powers:** file uploads and downloads, using presigned URLs so large files never pass through your backend.

```dotenv
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=my-app-uploads
```

R2 gives 10 GB of storage free and charges no egress fees, which makes it a good default. Any S3-compatible endpoint works — set `R2_ENDPOINT` to point elsewhere. Create the API token with Object Read & Write permissions. `STORAGE_MAX_FILE_MB` caps upload size.

## Cloudinary — images

**Powers:** image hosting with signed uploads, CDN delivery, and on-the-fly transforms (resize, crop, format).

```dotenv
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

All three come from the Cloudinary console dashboard. The API secret signs uploads server-side and is never exposed to the browser. Use Cloudinary when you want image transforms; use R2 when you just need to store files.

## Scheduling — Cal.com or Google Calendar

**Powers:** bookings, availability, and calendar events.

```dotenv
SCHEDULING_PROVIDER=calcom
CALCOM_API_KEY=cal_...
CALCOM_WEBHOOK_SECRET=...
```

or

```dotenv
SCHEDULING_PROVIDER=google
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_CALENDAR_REFRESH_TOKEN=...
GOOGLE_CALENDAR_ID=primary
```

If `SCHEDULING_PROVIDER` is unset, the provider is inferred from whichever credentials are present. The Google refresh token is minted once with `deno task calendar:auth`. `CALCOM_BASE_URL` points at a self-hosted Cal instance if you run one.

## Analytics — PostHog or Plausible

**Powers:** product analytics — events, funnels, retention.

```dotenv
ANALYTICS_PROVIDER=posthog
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com
```

or

```dotenv
ANALYTICS_PROVIDER=plausible
PLAUSIBLE_DOMAIN=myapp.com
```

Use `https://eu.i.posthog.com` for PostHog's EU cloud, or your own URL if self-hosting. Plausible is cookie-free and lighter on privacy obligations; PostHog does more. Both have free tiers.

## Web search — Tavily or Exa

**Powers:** searching the live web, and research features that combine search with AI.

```dotenv
WEBSEARCH_PROVIDER=tavily
TAVILY_API_KEY=tvly-...
```

or

```dotenv
WEBSEARCH_PROVIDER=exa
EXA_API_KEY=...
```

Both offer free tiers — [tavily.com](https://tavily.com), [exa.ai](https://exa.ai). `WEBSEARCH_MAX_RESULTS` sets the default results per query.

## Sign in with Google

**Powers:** Google OAuth 2.0 / OpenID Connect sign-in.

```dotenv
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=https://your-app.com/api/auth/google/callback
APP_MASTER_KEY=...
```

Create the client in Google Cloud Console → Credentials → OAuth client → Web application. **The redirect URI must match exactly** — including scheme, host, port, and path — or Google refuses the sign-in. Locally that is usually `http://localhost:5173/api/auth/google/callback`.

## Connect a GitHub account

**Powers:** letting your app's users connect their GitHub account, with tokens held server-side.

```dotenv
GITHUB_APP_CLIENT_ID=...
GITHUB_APP_CLIENT_SECRET=...
GITHUB_APP_CALLBACK_URL=https://your-app.com/api/auth/github/callback
APP_MASTER_KEY=...
```

### About `APP_MASTER_KEY`

Google sign-in and GitHub connections both derive their encryption keys from **one shared** `APP_MASTER_KEY` — a base64-encoded 32-byte value. Generate it once:

```bash
deno run src/utils/github.ts --gen-key
```

Use the same value everywhere the app runs, and **back it up**. Losing it invalidates every stored connection.

## Operator login

**Powers:** an admin account defined in the environment rather than registered through the app.

```dotenv
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=<long random password>
```

Leave `ADMIN_PASSWORD` unset and **admin login is disabled entirely** — there is no default password and no fallback account. That is deliberate. Never set `ADMIN_MODE=mock` in production: it makes any submitted credentials authenticate.

## No account needed

These run inside your app with no external service:

- **PDF generation** — invoices, receipts, reports.
- **CSV import and export** — parsing, writing, and column mapping.
- **Text extraction** — pulling text out of plain text, PDF, and DOCX uploads.

## Keeping keys safe

- Real values live in `.env` locally, and in your host's dashboard in production. Never in `.env.template`, never in git.
- Anything prefixed `VITE_` is compiled into the frontend bundle and readable by anyone. Never put a secret there.
- Prefer restricted or least-privilege keys wherever the provider offers them.
- Set spending limits and alerts, especially on AI providers.
- If a key is exposed, revoke it. Deleting the message it appeared in does nothing.

You own these keys and the bills they generate. See the [Terms of Service](./terms-of-service.md) and the [Billing & Refund Policy](./billing-and-credits.md).
