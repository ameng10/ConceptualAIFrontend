<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

const faqs = [
  {
    q: 'Why Deno on the backend?',
    a: "It's standard TypeScript with npm compatibility — a Node developer can read and extend it immediately. The runtime buys default-secure permissions and zero build ceremony, and the included Dockerfile means it runs anywhere a container runs: your VPS, Fly, Cloud Run, or Deno Deploy with the included guide.",
  },
  {
    q: 'Do I still need your servers after export?',
    a: 'No. The repos are self-contained: install Deno, put your database URL in .env, run the task. No proprietary runtime, no SDK between you and your backend, nothing phones home.',
  },
  {
    q: 'Where do secrets live?',
    a: 'In backend/.env on your infrastructure, filled in from a generated .env.template that documents every variable. The frontend bundle ships zero keys, and operators sign in with environment credentials — there is no admin signup route.',
  },
  {
    q: 'Which databases can it use?',
    a: "MongoDB, Postgres, or Turso — your pick at build time, and the same generated test suite runs green against each. Choosing a database is a dropdown, not a migration project.",
  },
  {
    q: "What if I've hand-edited my exported code?",
    a: 'Your edits live in your repos and stay yours. Platform iterations patch our copy, re-run the suite, and re-export — the diff receipt shows exactly which blocks changed, so pulling an iteration into your fork is a normal git merge, not archaeology.',
  },
]
</script>

<template>
  <section id="faq" class="mx-auto w-full max-w-6xl px-4 py-14">
    <div>
      <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Fair questions</div>
      <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Asked by people who read Dockerfiles.</h2>
    </div>

    <div class="mt-8 grid gap-3">
      <details v-for="faq in faqs" :key="faq.q" class="faq-item glass">
        <summary class="faq-q">
          <span>{{ faq.q }}</span>
          <ChevronDown :size="18" class="faq-chevron" />
        </summary>
        <p class="faq-a">{{ faq.a }}</p>
      </details>
    </div>
  </section>
</template>

<style scoped>
.faq-item {
  border-radius: 18px;
  padding: 0;
  overflow: hidden;
}

.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.3rem;
  cursor: pointer;
  font-weight: 800;
  letter-spacing: -0.01em;
  list-style: none;
  transition: var(--transition);
}

.faq-q::-webkit-details-marker {
  display: none;
}

.faq-q:hover {
  background: var(--input-bg);
}

.faq-chevron {
  flex: 0 0 auto;
  color: var(--text-dim);
  transition: transform 0.2s ease;
}

details[open] .faq-chevron {
  transform: rotate(180deg);
}

.faq-a {
  padding: 0 1.3rem 1.15rem;
  color: var(--text-dim);
  font-size: 0.92rem;
  line-height: 1.65;
  max-width: 70ch;
}
</style>
