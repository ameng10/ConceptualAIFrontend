<template>
  <div class="relative min-h-screen bg-bg text-text">
    <div
      class="pointer-events-none absolute inset-0 bg-[image:var(--grad-neon)] opacity-20"
      aria-hidden="true"
    />

    <div class="relative mx-auto w-full max-w-3xl px-4 py-16">
      <div class="rounded-2xl border border-glass-border bg-glass-bg p-6 sm:p-10">
        <div class="flex items-start justify-between gap-6">
          <div>
            <h1 class="text-2xl font-black tracking-tight sm:text-3xl">Contact</h1>
            <p class="mt-2 text-sm text-text-dim">
              Email us and we’ll get back to you.
            </p>
          </div>

          <!-- Plain anchor: the landing page is static HTML outside the SPA router. -->
          <a
            href="/"
            class="shrink-0 rounded-xl border border-glass-border bg-glass-bg px-3 py-2 text-sm font-semibold transition hover:bg-white/5"
          >
            Back to home
          </a>
        </div>

        <div class="mt-8 space-y-3 text-sm">
          <a
            class="block rounded-xl border border-glass-border bg-glass-bg px-4 py-3 transition hover:bg-white/5"
            href="mailto:admin@conceptual-ai.app"
          >
            admin@conceptual-ai.app
          </a>
          <a
            class="block rounded-xl border border-glass-border bg-glass-bg px-4 py-3 transition hover:bg-white/5"
            href="mailto:ameng10@mit.edu"
          >
            ameng10@mit.edu
          </a>
          <a
            class="block rounded-xl border border-glass-border bg-glass-bg px-4 py-3 transition hover:bg-white/5"
            href="mailto:rdlee@mit.edu"
          >
            rdlee@mit.edu
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
