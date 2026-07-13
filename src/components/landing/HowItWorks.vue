<script setup lang="ts">
const steps = [
  {
    num: '1',
    title: 'Shape the plan',
    body: 'Describe the app in your own words. The AI turns it into a plan you can read and edit — nothing gets built until you’re happy with it.',
  },
  {
    num: '2',
    title: 'We build it',
    body: 'On our servers, on our AI keys: building blocks assemble, the connections between them are generated, and a test suite runs against a real database. You watch the progress live.',
  },
  {
    num: '3',
    title: 'It’s yours',
    body: 'A full-stack app — Deno backend, React frontend, tests, OpenAPI docs, Dockerfile. Preview it live, export both repos to GitHub, deploy anywhere. Iterate any time in plain language: we patch our copy, re-run the suite, and re-export both repos — with a diff receipt showing exactly what changed and what didn’t. Edits in your own repos stay yours.',
  },
]
</script>

<template>
  <section id="how" class="mx-auto w-full max-w-6xl px-4 py-14">
    <div>
      <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">How it works</div>
      <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Three steps. One of them is yours.</h2>
      <p class="mt-3 max-w-2xl text-lg text-text-dim">
        You shape what gets built; the machine does the building and the checking; you keep the result.
      </p>
    </div>

    <div class="mt-8">
      <div class="how-flow">
        <template v-for="(step, idx) in steps" :key="step.num">
          <div class="how-step glass">
            <div class="how-kicker"><span class="how-stepnum">{{ step.num }}</span><span>Step</span></div>
            <div class="how-title">{{ step.title }}</div>
            <div class="how-body">{{ step.body }}</div>
          </div>
          <div v-if="idx < steps.length - 1" class="how-connector" aria-hidden="true" />
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.how-flow {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.how-step {
  padding: 1.5rem;
  border-radius: 16px;
}

.how-kicker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-dim);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.5rem;
}

.how-stepnum {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--primary);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
}

.how-title {
  margin-top: 8px;
  font-weight: 900;
  letter-spacing: -0.02em;
  font-size: 18px;
  color: var(--text);
}

.how-body {
  margin-top: 8px;
  color: var(--text-dim);
  font-size: 14.5px;
  line-height: 1.6;
}

.how-connector {
  display: none;
}

@media (min-width: 900px) {
  .how-flow {
    grid-template-columns: 1fr 54px 1fr 54px 1fr;
    align-items: stretch;
    gap: 12px;
  }

  .how-connector {
    display: block;
    align-self: center;
    height: 2px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(45, 212, 191, 0.2), rgba(59, 130, 246, 0.35), rgba(45, 212, 191, 0.2));
    opacity: 0.9;
  }
}
</style>
