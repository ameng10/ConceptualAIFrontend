# Get an AI Provider Key (for Generated Apps)

You do **not** need an AI key to generate an app on ConceptualAI — the platform supplies the AI used during generation.

You only need a provider key if **your generated app itself includes AI-backed features** (chat, extraction, moderation, planning, document-aware assistants, etc.) and you want to run or deploy that app. The key authorizes your app's own AI calls and is billed to your provider account.

Back to main docs: [ConceptualAI User Documentation](./README.md)

## Which provider do you need?

Generated backends route AI calls through a shared helper (`src/utils/ai.ts`) and support multiple providers. Set `AI_PROVIDER` and `AI_MODEL` in the generated backend `.env`, then supply the matching key:

| Provider | `AI_PROVIDER` | Key variable | Get a key |
|----------|---------------|--------------|-----------|
| Google Gemini (default) | `gemini` | `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |
| OpenAI | `openai` | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| xAI | `xai` | `XAI_API_KEY` | https://console.x.ai/ |

The generated `.env.template` defaults to:

```env
AI_PROVIDER=gemini
AI_MODEL=gemini-flash-latest
GEMINI_API_KEY=your-key-here
```

## Steps (using Gemini as the example)

1. Sign in to Google AI Studio.
2. Open the API key page: https://aistudio.google.com/app/apikey
3. Create or copy an API key.
4. Paste it into your generated backend `.env` as `GEMINI_API_KEY`.
5. Store it securely — do not commit it to git or paste it into `.env.template`.

For other providers, follow the equivalent "create API key" flow on the provider's dashboard and set the matching variable from the table above.

## Cost note

This key bills **your** provider account for your app's AI usage.

- Check the provider's pricing page before running an AI-heavy app.
- Set usage alerts or budget limits in the provider dashboard.
- Use smaller/faster models during experimentation.

## Safety tips

- Never paste your key into public chat, screenshots, or source files.
- Never commit keys to `.env.template` or version control.
- Rotate your key if you think it was exposed.

## Next steps

- See what AI features look like and how to configure them: [AI Capabilities in Generated Apps](./generated-app-ai-capabilities.md)
- Continue with: [Get a MongoDB Atlas Connection URL (Free Tier)](./get-mongodb-atlas-url.md)
- Then: [Beginner App-Building Guide](./getting-started-beginner.md)
