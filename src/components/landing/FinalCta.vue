<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, BookOpen, LifeBuoy, ExternalLink } from 'lucide-vue-next'
import { getDemo } from './demos'

const router = useRouter()

const goBuild = () => {
  router.push('/build')
}

const deskmindUrl = computed(() => getDemo('deskmind')?.liveUrl ?? null)
</script>

<template>
  <section class="mx-auto w-full max-w-6xl px-4 pb-14">
    <div class="relative overflow-hidden rounded-3xl border border-glass-border bg-glass-bg p-8 shadow-glass backdrop-blur-2xl">
      <div class="absolute -inset-10 -z-10 bg-[image:var(--grad-wave)] opacity-30 blur-2xl" />
      <div class="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Start with a prompt. Keep the code.</div>
          <h3 class="mt-2 text-2xl font-black tracking-tight md:text-3xl">Open the builder and start your first app.</h3>
          <p class="mt-2 max-w-xl text-text-dim">Free during beta.</p>
        </div>
        <button type="button" class="btn btn-primary" @click="goBuild">
          Open Builder
          <ArrowRight :size="18" />
        </button>
      </div>

      <!-- Support is itself a demo -->
      <div class="support-strip">
        <LifeBuoy :size="16" class="text-neon-teal shrink-0" />
        <span>
          Have a question? Our support desk is <strong>Deskmind</strong> — an app this platform built. Same one as in
          the gallery.
        </span>
        <a
          v-if="deskmindUrl"
          :href="deskmindUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="support-link"
        >
          Open support
          <ExternalLink :size="13" />
        </a>
        <span v-else class="support-soon">Launching soon</span>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3 text-sm text-text-dim">
        <router-link
          to="/library"
          class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2 transition hover:bg-white/10 hover:text-text"
        >
          <BookOpen :size="16" class="text-neon-teal" />
          Docs
        </router-link>
        <router-link
          to="/contact"
          class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2 transition hover:bg-white/10 hover:text-text"
        >
          Contact
        </router-link>
        <router-link
          to="/posts"
          class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2 transition hover:bg-white/10 hover:text-text"
        >
          Community
        </router-link>
        <a
          href="https://arxiv.org/pdf/2508.14511"
          target="_blank"
          rel="noreferrer"
          class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2 transition hover:bg-white/10 hover:text-text"
        >
          About the method
          <ExternalLink :size="13" />
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.support-strip {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-dim);
  font-size: 0.9rem;
}

.support-strip strong {
  color: var(--text);
}

.support-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: auto;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: var(--input-bg);
  color: var(--text);
  font-weight: 700;
  font-size: 0.8rem;
  text-decoration: none;
  transition: var(--transition);
}

.support-link:hover {
  border-color: var(--primary);
}

.support-soon {
  margin-left: auto;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  border: 1px dashed var(--glass-border);
  font-size: 0.78rem;
  font-weight: 700;
}
</style>
