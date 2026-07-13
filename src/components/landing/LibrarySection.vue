<script setup lang="ts">
import { Blocks, FileCode2, GitBranch } from 'lucide-vue-next'

// Names must match real library blocks — don't invent aspirational ones.
const conceptBlocks = [
  'Authenticating',
  'Sessioning',
  'Profiling',
  'Posting',
  'Commenting',
  'Liking',
  'Following',
  'Subscribing',
  'Purchasing',
  'Emailing',
  'Notifying',
  'MediaHosting',
  'Researching',
  'WebSearching',
  'AdminAuthenticating',
]

const providerUtils = ['stripe', 'github', 'email', 'ai', 'websearch', 'google', 'admin']
</script>

<template>
  <section id="library" class="mx-auto w-full max-w-6xl px-4 py-14">
    <div>
      <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">The building blocks</div>
      <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">A library, not a black box.</h2>
      <p class="mt-3 max-w-3xl text-lg text-text-dim">
        Apps here aren't improvised token-by-token. They're assembled from a versioned library of building blocks —
        each one human-authored, individually tested, and already shipped inside earlier apps. The AI spends its
        generation on the connections between blocks, not on reinventing auth or billing.
      </p>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-2">
      <!-- The catalog -->
      <div class="lib-card glass">
        <div class="lib-head">
          <Blocks :size="18" class="text-neon-teal" />
          <span>Concepts — the behaviors</span>
        </div>
        <div class="chip-cloud">
          <span v-for="name in conceptBlocks" :key="name" class="lib-chip">{{ name }}</span>
          <span class="lib-chip more">40 versioned blocks &amp; counting</span>
        </div>
        <div class="lib-head mt-5">
          <GitBranch :size="18" class="text-neon-teal" />
          <span>Provider utils — the integrations</span>
        </div>
        <div class="chip-cloud">
          <span v-for="name in providerUtils" :key="name" class="lib-chip util">{{ name }}</span>
        </div>
      </div>

      <!-- The ingestion mechanic -->
      <div class="lib-card glass">
        <div class="lib-head">
          <FileCode2 :size="18" class="text-neon-teal" />
          <span>Adding a provider is one file</span>
        </div>
        <pre class="lib-code"><code>library/utils/&lt;provider&gt;/&lt;provider&gt;.ts

  real strategy   — calls the provider, keys from env
  mock strategy   — runs in tests &amp; previews, no keys
  .env.template   — every variable it needs, documented</code></pre>
        <p class="lib-body">
          An integration is a single TypeScript utils module with a live strategy and a mandatory mock. Publish it to
          the library once, and every app built afterward can be assembled with it — same tests, same receipts.
        </p>
        <p class="lib-body dim">
          Today the library grows through our own pipeline — Stripe, GitHub, email, AI, and web research all entered
          this way. Community contributions are on the roadmap, and the ingestion path they'll use is the one we
          already run.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lib-card {
  padding: 1.4rem 1.5rem;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.lib-head {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.chip-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.lib-chip {
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: 700;
}

.lib-chip.util {
  color: var(--neon-teal);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.lib-chip.more {
  border-style: dashed;
  color: var(--text);
}

.lib-code {
  margin: 0;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  border: 1px solid rgba(45, 212, 191, 0.18);
  background: #020617;
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.7;
  overflow-x: auto;
}

.lib-body {
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.6;
}

.lib-body.dim {
  color: var(--text-dim);
}
</style>
