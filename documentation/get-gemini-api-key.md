# Get a Gemini API Key

This key is required for pipeline-triggering generation actions.

Back to main docs: [ConceptualAI User Documentation](./README.md)

## Official links

- API key page: https://aistudio.google.com/app/apikey
- API key docs: https://ai.google.dev/gemini-api/docs/api-key
- Gemini quickstart: https://ai.google.dev/gemini-api/docs/quickstart
- Rate limits (official): https://ai.google.dev/gemini-api/docs/rate-limits
- Billing and paid tier setup (official): https://ai.google.dev/gemini-api/docs/billing

## Steps

1. Sign in to Google AI Studio.
2. Open the API key page.
3. Create or copy an API key.
4. Store it securely (do not commit it to git).

## Gemini rate-limit tiers (Google)

Google rate limits are tiered per project, and limits increase as your project moves up tiers.
The official docs define tiers as:

- **Free tier**: no paid billing account connected
- **Tier 1**: paid billing account connected
- **Tier 2**: higher spend/age qualification than Tier 1
- **Tier 3**: higher spend/age qualification than Tier 2

Important details:

- Limits are enforced by model and measured with metrics like RPM/TPM/RPD.
- Limits apply at the **project** level (not per individual key string).
- Tier eligibility rules can change, so check the official rate-limits page for current thresholds.

## How this maps to ConceptualAI's "tier" field

ConceptualAI currently requires a non-zero tier value in requests:

- Allowed: `1`, `2`, `3`
- Rejected: `0` (free tier)

Practical guidance:

1. If you are on paid billing but unsure, start with `1`.
2. If Google has approved your project for higher rate-limit tiers, use `2` or `3`.
3. If requests are throttled, verify your active limits in AI Studio and adjust tier/project settings.

## Safety tips

- Never paste your key into public chat/screenshots.
- Never commit keys to `.env.template` or source files.
- Rotate your key if you think it was exposed.

## How ConceptualAI handles your key

Security model (current behavior):

- Your Gemini API key is **not stored in ConceptualAI application databases**.
- The key is passed as an **environment variable** to temporary execution containers for generation tasks.
- Those containers are short-lived; when they are destroyed, their runtime environment (including that key variable) is discarded.
- You should still treat the key as sensitive and rotate it if you suspect exposure.

## Next steps

- Continue with: [Get a MongoDB Atlas Connection URL (Free Tier)](./get-mongodb-atlas-url.md)
- Then: [Beginner App-Building Guide](./getting-started-beginner.md)
