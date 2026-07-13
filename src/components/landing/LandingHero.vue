<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Boxes,
  Terminal,
  CheckCircle2,
  ClipboardList,
  PenTool,
  Blocks,
  Link2,
  Hammer,
  FlaskConical,
} from 'lucide-vue-next'
import AppDescriptionInput from '@/components/AppDescriptionInput.vue'

const router = useRouter()

const goBuild = () => {
  router.push('/build')
}

const handleLandingPromptSubmit = (
  description: string,
  name: string,
  done: (ok: boolean, errorMessage?: string) => void,
) => {
  router.push({
    path: '/build',
    query: { name, description },
  })
  done(true)
}

type FactoryStepState = 'done' | 'pass'

const factorySteps: Array<{
  icon: any
  title: string
  chip: string
  state: FactoryStepState
}> = [
  { icon: ClipboardList, title: 'Planning', chip: 'Complete', state: 'done' },
  { icon: PenTool, title: 'Structuring', chip: 'Complete', state: 'done' },
  { icon: Blocks, title: 'Building', chip: 'Complete', state: 'done' },
  { icon: Link2, title: 'Connecting', chip: 'Complete', state: 'done' },
  { icon: Hammer, title: 'Assembling', chip: 'Complete', state: 'done' },
  { icon: FlaskConical, title: 'Testing', chip: '313 / 313 passing', state: 'pass' },
]
</script>

<template>
  <section class="relative overflow-hidden">
    <div class="pointer-events-none absolute -inset-20 bg-[image:var(--grad-wave)] opacity-20 blur-3xl" />
    <div class="pointer-events-none absolute inset-0 landing-grid" />

    <div class="mx-auto w-full max-w-6xl px-4 pb-14 pt-40 md:pb-20 md:pt-28">
      <!-- Central prompt box -->
      <div class="mb-40">
        <div class="mx-auto max-w-3xl">
          <div
            class="mb-5 pb-1 text-center text-4xl font-semibold leading-[1.25] tracking-tight text-transparent md:text-5xl bg-clip-text bg-[image:var(--grad-wave)]"
          >
            Start with your app idea
          </div>
          <div class="hero-prompt">
            <AppDescriptionInput
              submitLabel="Continue to Builder"
              @submit="handleLandingPromptSubmit"
            />
          </div>
        </div>
      </div>

      <div class="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <h1 class="mt-5 text-balance text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Describe your app. Get the codebase.
          </h1>
          <p class="mt-4 max-w-xl text-pretty text-lg text-text-dim">
            Work with the AI on a plan. We build it on our servers — assembled from pre-tested building blocks and
            checked by a generated test suite against a real database. What comes out is yours: backend and frontend
            repos, tests, API docs, ready to deploy.
          </p>

          <div class="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" class="btn btn-primary start-building-btn" @click="goBuild">
              Open Builder (Beta)
              <ArrowRight :size="16" />
            </button>

            <a
              href="#demos"
              class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-6 py-3 text-base font-extrabold text-text transition hover:bg-white/10"
            >
              <Boxes :size="18" class="text-neon-teal" />
              See the live demos
            </a>
          </div>

          <div class="mt-8 flex flex-wrap items-center gap-3 text-sm text-text-dim">
            <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
              <CheckCircle2 :size="16" class="text-emerald-400" />
              Both repos are yours
            </span>
            <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
              <CheckCircle2 :size="16" class="text-emerald-400" />
              Tested before it's done
            </span>
            <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
              <CheckCircle2 :size="16" class="text-emerald-400" />
              Payments, email &amp; AI built in
            </span>
          </div>
        </div>

        <!-- HERO VISUAL: Factory Console, ending green -->
        <div class="relative">
          <div class="absolute -inset-6 -z-10 rounded-[32px] bg-[image:var(--grad-wave)] opacity-25 blur-2xl" />

          <div class="console-card glass">
            <div class="console-top">
              <div class="console-title">
                <Terminal :size="16" class="text-neon-teal" />
                <span>Factory Console</span>
              </div>
              <div class="console-pill">Autonomous</div>
            </div>

            <div class="grid gap-4 p-6">
              <div class="console-panel rounded-2xl p-4">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-extrabold uppercase tracking-[0.16em] text-text-dim">Factory Output</div>
                  <div class="text-xs font-extrabold uppercase tracking-[0.16em] text-neon-teal">pipeline</div>
                </div>

                <div class="mt-4 space-y-3 text-[13px] leading-relaxed">
                  <div
                    v-for="(step, idx) in factorySteps"
                    :key="idx"
                    class="term-line step-row"
                    :class="{ 'step-row-pass': step.state === 'pass' }"
                    :style="{ animationDelay: idx * 140 + 'ms' }"
                  >
                    <div class="step-icon" :class="{ 'step-icon-pass': step.state === 'pass' }">
                      <component :is="step.icon" :size="16" />
                    </div>
                    <div class="step-main">
                      <div class="step-head">
                        <div class="step-title">{{ step.title }}</div>
                        <div class="step-chip" :class="step.state === 'pass' ? 'pass' : 'done'">
                          {{ step.chip }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.start-building-btn {
  border-radius: 10px;
  padding: 0.42rem 0.9rem;
  font-size: 0.875rem;
}

.hero-prompt :deep(.input-footer .btn.btn-primary) {
  border-radius: 10px;
  padding: 0.42rem 0.9rem;
  font-size: 0.875rem;
}

.hero-prompt :deep(.input-footer .btn.btn-primary svg) {
  width: 16px !important;
  height: 16px !important;
}

.landing-grid {
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(650px circle at 50% 20%, black 40%, transparent 70%);
  opacity: 0.18;
}

.console-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--input-bg);
  border: 1px solid var(--border);
  box-shadow: var(--glass-shadow);
}

.console-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: var(--grad-wave);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: 1;
}

.console-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: transparent;
}

.console-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.console-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.console-panel {
  border: 1px solid var(--border);
  background: var(--glass-bg);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.term-line {
  opacity: 0;
  transform: translateY(6px);
  animation: termIn 650ms ease forwards;
}

@keyframes termIn {
  to {
    opacity: 1;
    transform: translateY(0px);
  }
}

.step-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
}

.step-row-pass {
  border-color: rgba(52, 211, 153, 0.35);
  background: rgba(16, 185, 129, 0.06);
}

.step-icon {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--neon-teal);
}

.step-icon-pass {
  color: rgb(52 211 153);
  border-color: rgba(52, 211, 153, 0.4);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.25);
}

.step-main {
  flex: 1;
  min-width: 0;
}

.step-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.step-title {
  font-weight: 900;
  letter-spacing: -0.01em;
  color: var(--text);
}

.step-chip {
  flex: 0 0 auto;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-dim);
}

.step-chip.done {
  color: rgb(52 211 153);
}

.step-chip.pass {
  color: rgb(52 211 153);
  border-color: rgba(52, 211, 153, 0.4);
  animation: passPulse 2.4s ease-in-out infinite;
}

@keyframes passPulse {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(52, 211, 153, 0);
  }
  50% {
    box-shadow: 0 0 14px rgba(52, 211, 153, 0.35);
  }
}

@media (max-width: 640px) {
  .console-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .step-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .step-chip {
    white-space: normal;
  }
}

@media (prefers-reduced-motion: reduce) {
  .term-line {
    animation: none !important;
    opacity: 1;
    transform: none !important;
  }

  .step-chip.pass {
    animation: none !important;
  }
}
</style>
