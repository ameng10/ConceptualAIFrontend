<script setup lang="ts">
import { CheckCircle2, Github, Database, FileCode2 } from 'lucide-vue-next'
</script>

<template>
  <section id="own" class="mx-auto w-full max-w-6xl px-4 py-14">
    <div class="grid gap-10 md:grid-cols-2 md:items-start">
      <div>
        <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Code you actually own</div>
        <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Both repos. Yours.</h2>
        <p class="mt-3 max-w-xl text-lg text-text-dim">
          Every build hands you two clean repositories — a Deno backend and a React frontend — with the tests, the
          OpenAPI spec, and a Dockerfile inside. Export straight to GitHub, run locally, deploy anywhere. No
          proprietary runtime. No SDK between you and your backend.
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
            <Github :size="16" class="text-neon-teal" />
            One-click GitHub export — both repos
          </span>
          <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
            <Database :size="16" class="text-neon-teal" />
            MongoDB · Postgres · Turso — your call
          </span>
          <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
            <FileCode2 :size="16" class="text-neon-teal" />
            Tests, OpenAPI docs &amp; Dockerfile included
          </span>
          <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
            <CheckCircle2 :size="16" class="text-emerald-400" />
            Run locally or deploy yourself
          </span>
        </div>
      </div>

      <div class="code-window rounded-3xl border border-glass-border bg-glass-bg shadow-glass backdrop-blur-2xl">
        <div class="flex items-center gap-2 border-b border-glass-border px-4 py-3">
          <div class="h-2.5 w-2.5 rounded-full bg-[color:var(--error)]" />
          <div class="h-2.5 w-2.5 rounded-full bg-[color:var(--await)]" />
          <div class="h-2.5 w-2.5 rounded-full bg-[color:var(--primary)]" />
          <div class="ml-auto text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">your repositories</div>
        </div>

        <div class="grid gap-3 p-4 md:grid-cols-2">
          <div class="repo-pane p-3">
            <div class="flex items-center justify-between">
              <div class="text-xs font-extrabold uppercase tracking-[0.16em] text-[color:var(--primary-glow)]">backend/</div>
              <div class="text-xs font-extrabold uppercase tracking-[0.16em] text-text-dim">deno</div>
            </div>
            <pre class="mt-2 code-pre repo-tree"><code>backend/
  src/
    concepts/
    syncs/
    main.ts
  tests/
  openapi.yaml
  Dockerfile
  .env.template
  deno.json</code></pre>
          </div>

          <div class="repo-pane p-3">
            <div class="flex items-center justify-between">
              <div class="text-xs font-extrabold uppercase tracking-[0.16em] text-neon-teal">frontend/</div>
              <div class="text-xs font-extrabold uppercase tracking-[0.16em] text-text-dim">react + vite</div>
            </div>
            <pre class="mt-2 code-pre repo-tree"><code>frontend/
  public/
  src/
    pages/
    components/
    App.tsx
    main.tsx
  package.json
  vite.config.ts</code></pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.code-pre {
  max-height: 320px;
  overflow: auto;
  padding: 12px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text);
  font-size: 12px;
  line-height: 1.55;
}

.repo-pane {
  position: relative;
  background: transparent;
  box-shadow: none;
}

.repo-tree {
  position: relative;
  font-size: 12.5px;
  line-height: 1.65;
  background: var(--glass-bg);
  background-image:
    radial-gradient(900px circle at 18% 0%, var(--grad-color-1), transparent 55%),
    radial-gradient(700px circle at 85% 10%, var(--grad-color-2), transparent 58%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(36px);
  -webkit-backdrop-filter: blur(36px);
}
</style>
