# ConceptualAI User Documentation

Welcome. These docs are organized by skill level.

## Start Here

- **New user (recommended first):** [Beginner App-Building Guide](./getting-started-beginner.md)
- **If setup fails:** [Troubleshooting](./troubleshooting.md)
- **Timeout note:** sandboxed generation phases have a 4-hour max; if one exceeds that, treat it as broken and resume/retry from the last completed state.

## Generating an App

- You do **not** need to bring your own AI key to generate apps — the platform supplies the AI used during generation.
- [Test Your App Instantly with Previews](./previews.md)

## Setup Guides (for running your generated app)

- [Get a MongoDB Atlas Connection URL (Free Tier)](./get-mongodb-atlas-url.md)
- [Run Your Generated App Locally](./run-generated-app-locally.md)

## AI in Generated Apps

- [AI Capabilities in Generated Apps](./generated-app-ai-capabilities.md)
- Generated apps may include AI-backed features such as chat, extraction, moderation, planning, or document-aware assistance depending on the approved plan.
- If your generated app uses AI, you supply a provider key for that app: configure its backend `.env` with `AI_PROVIDER`, `AI_MODEL`, and the matching provider API key. See [Get an AI Provider Key](./get-ai-provider-key.md).

## Advanced Topics

- [Concepts and Syncs (Advanced)](./concepts-and-syncs.md)
- [Design Phase (Advanced)](./design-phase-advanced.md)

## Sharing Your App Online

- [Deploy Your Generated App with Deno Deploy](./deploy-with-deno-deploy.md)

## Legal

- [Terms of Service](./terms-of-service.md)

## Suggested Reading Order

1. [Beginner App-Building Guide](./getting-started-beginner.md)
2. [Test Your App Instantly with Previews](./previews.md)
3. [Get a MongoDB Atlas Connection URL (Free Tier)](./get-mongodb-atlas-url.md)
4. [AI Capabilities in Generated Apps](./generated-app-ai-capabilities.md) (only if your app uses AI)
5. [Run Your Generated App Locally](./run-generated-app-locally.md)
6. [Deploy Your Generated App with Deno Deploy](./deploy-with-deno-deploy.md)
