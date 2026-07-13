<script setup lang="ts">
import { Blocks, FlaskConical, GitCompareArrows } from 'lucide-vue-next'

const answers = [
  {
    icon: Blocks,
    title: 'Assembled, not improvised',
    body: 'An agent writes your auth, billing, and bookings from scratch, every time, and hopes. Here those are versioned library blocks that have shipped before — generation is spent on the connections, not the foundations.',
  },
  {
    icon: FlaskConical,
    title: '"Done" has a definition',
    body: "An agent is done when it stops typing. A build here isn't done until its own generated test suite — hundreds of tests — passes against the real database you chose.",
  },
  {
    icon: GitCompareArrows,
    title: 'Iteration comes with proof',
    body: 'Ask an agent for one more feature and hope nothing broke. Ask here and get a diff receipt: what changed, what is byte-for-byte identical — including the billing.',
  },
]
</script>

<template>
  <section id="agents" class="mx-auto w-full max-w-6xl px-4 py-14">
    <div>
      <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">The obvious question</div>
      <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Why not just use a coding agent?</h2>
      <p class="mt-3 max-w-3xl text-lg text-text-dim">
        If you're technical enough to want two repos and a Dockerfile, you could point Claude Code or Cursor at a
        template. Three honest reasons this is different:
      </p>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <div v-for="answer in answers" :key="answer.title" class="agent-card glass">
        <div class="agent-icon">
          <component :is="answer.icon" :size="18" />
        </div>
        <div class="agent-title">{{ answer.title }}</div>
        <div class="agent-body">{{ answer.body }}</div>
      </div>
    </div>

    <p class="mt-5 text-sm text-text-dim">
      And if you love your coding agent: the export is a clean, tested repo it can keep working on. Plenty of people
      use both.
    </p>
  </section>
</template>

<style scoped>
.agent-card {
  padding: 1.4rem 1.5rem;
  border-radius: 18px;
}

.agent-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--neon-teal);
}

.agent-title {
  margin-top: 0.85rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  font-size: 1.05rem;
}

.agent-body {
  margin-top: 0.5rem;
  color: var(--text-dim);
  font-size: 0.9rem;
  line-height: 1.6;
}
</style>
