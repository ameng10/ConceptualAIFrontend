<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Boxes,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BookOpen,
  ClipboardList,
  PenTool,
  Blocks,
  Link2,
  Hammer,
} from 'lucide-vue-next'
import { authState } from '@/services/api'
import AppDescriptionInput from '@/components/AppDescriptionInput.vue'

const router = useRouter()

const isSignedIn = computed(() => authState.isSignedIn())

const headerRef = ref<HTMLElement | null>(null)
const heroRef = ref<HTMLElement | null>(null)
const heroPromptRef = ref<HTMLElement | null>(null)
const landingAlt = ref(false)

let scrollTicking = false
const updateLandingBackground = () => {
  const heroHeight = heroRef.value?.offsetHeight ?? 0
  const threshold = Math.max(420, heroHeight - 120)
  landingAlt.value = window.scrollY > threshold
}

const onScroll = () => {
  if (scrollTicking) return
  scrollTicking = true
  window.requestAnimationFrame(() => {
    scrollTicking = false
    updateLandingBackground()
  })
}

const goBuild = () => {
  router.push('/build')
}

const goLogin = () => {
  router.push({ path: '/login', query: { redirect: '/build' } })
}

const primaryCtaLabel = computed(() => 'Start Building (Beta)')

const demoVideoUrl = '/demos/simplesocialv2.mp4'

const handleLandingPromptSubmit = (
  description: string,
  name: string,
  done: (ok: boolean, errorMessage?: string) => void,
) => {
  // Keep UX minimal: take the user into the existing /build flow,
  // while preserving what they typed (including through login redirect).
  router.push({
    path: '/build',
    query: {
      name,
      description,
    },
  })
  done(true)
}

type FactoryStepState = 'done' | 'running' | 'queued'

const factorySteps: Array<{
  icon: any
  title: string
  description: string
  state: FactoryStepState
}> = [
  {
    icon: ClipboardList,
    title: 'Planning',
    description: 'Turn your prompt into a detailed agent plan.',
    state: 'done',
  },
  {
    icon: PenTool,
    title: 'Designing',
    description: 'Convert the plan into Concepts.',
    state: 'done',
  },
  {
    icon: Blocks,
    title: 'Implementing',
    description: 'Reuse library Concepts or generate custom Concepts as needed.',
    state: 'running',
  },
  {
    icon: Link2,
    title: 'Generating Syncs',
    description: 'Create API endpoints + glue code that ties Concepts to user flows.',
    state: 'queued',
  },
  {
    icon: Hammer,
    title: 'Assembling',
    description: 'Assemble backend + generate frontend from endpoints + a detailed app graph.',
    state: 'queued',
  },
]

onMounted(() => {
  document.documentElement.classList.add('landing-slide')
  updateLandingBackground()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', updateLandingBackground, { passive: true } as any)
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('landing-slide')
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', updateLandingBackground as any)
})
</script>

<template>
  <div class="landing min-h-screen text-text" :class="{ 'landing-alt': landingAlt }">
    <!-- HEADER (minimal, premium) -->
    <header ref="headerRef" class="sticky top-0 z-50 border-b border-glass-border bg-glass-bg/80 backdrop-blur-xl">
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-sm font-black tracking-tight text-text transition hover:border-glass-border hover:bg-white/5"
            @click="router.push('/')"
          >
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-xl">
              <img src="/favicon.svg" alt="Conceptual" class="h-6 w-6" />
            </span>
            <span>ConceptualAI</span>
          </button>

          <nav class="hidden items-center gap-1 md:flex" aria-label="Primary">
            <a
              href="#how"
              class="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-text-dim transition hover:border-glass-border hover:bg-white/5 hover:text-text"
            >
              How it Works
            </a>
            <a
              href="#own"
              class="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-text-dim transition hover:border-glass-border hover:bg-white/5 hover:text-text"
            >
              Own the Code
            </a>
            <a
              href="#moat"
              class="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-text-dim transition hover:border-glass-border hover:bg-white/5 hover:text-text"
            >
              The Moat
            </a>
          </nav>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="!isSignedIn"
            type="button"
            class="hidden rounded-2xl border border-glass-border bg-white/5 px-4 py-2 text-sm font-semibold text-text transition hover:bg-white/10 md:inline-flex"
            @click="goLogin"
          >
            Sign in
          </button>

          <button type="button" class="btn btn-primary start-building-btn" @click="goBuild">
            {{ primaryCtaLabel }}
            <ArrowRight :size="16" />
          </button>
        </div>
      </div>
    </header>

    <!-- 1) HERO -->
    <section ref="heroRef" class="relative overflow-hidden snap-section">
      <div class="pointer-events-none absolute -inset-20 bg-[image:var(--grad-wave)] opacity-20 blur-3xl" />
      <div class="pointer-events-none absolute inset-0 landing-grid" />

      <div class="mx-auto w-full max-w-6xl px-4 pb-14 pt-40 md:pb-20 md:pt-28">
        <!-- Central prompt box (Lovable/Base44-style entry point) -->
        <div ref="heroPromptRef" class="mb-40">
          <div class="mx-auto max-w-3xl">
            <div
              class="mb-5 pb-1 text-center text-4xl font-semibold leading-[1.25] tracking-tight text-transparent md:text-5xl bg-clip-text bg-[image:var(--grad-wave)]"
            >
              Create using ConceptualAI
            </div>
            <div class="hero-prompt">
              <AppDescriptionInput @submit="handleLandingPromptSubmit" />
            </div>
          </div>
        </div>

        <div id="hero-main" class="snap-section grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h1 class="mt-5 text-balance text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Your Personal Autonomous Software Factory.
            </h1>
            <p class="mt-4 max-w-xl text-pretty text-lg text-text-dim">
              Don't settle for locked-in templates. Type an idea, and our AI pipeline architects, writes, and tests a
              production-ready Web App (React + Deno + MongoDB) that you own 100%.
            </p>

            <div class="mt-7 flex flex-wrap items-center gap-3">
              <button type="button" class="btn btn-primary start-building-btn" @click="goBuild">
                {{ primaryCtaLabel }}
                <ArrowRight :size="16" />
              </button>

              <a
                href="#how"
                class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-6 py-3 text-base font-extrabold text-text transition hover:bg-white/10"
              >
                <Boxes :size="18" class="text-neon-teal" />
                See how it works
              </a>
            </div>

            <div class="mt-8 flex flex-wrap items-center gap-3 text-sm text-text-dim">
              <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
                <CheckCircle2 :size="16" class="text-emerald-400" />
                No vendor lock‑in
              </span>
              <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
                <CheckCircle2 :size="16" class="text-emerald-400" />
                Docker sandbox testing
              </span>
              <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
                <CheckCircle2 :size="16" class="text-emerald-400" />
                Standard stack export
              </span>
            </div>
          </div>

          <!-- HERO VISUAL: Factory Console (visual removed per request) -->
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

              <div class="grid gap-4 p-6 md:grid-cols-5">
                <div class="md:col-span-5">
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
                        :style="{ animationDelay: idx * 140 + 'ms' }"
                      >
                        <div class="step-icon">
                          <component :is="step.icon" :size="16" />
                        </div>
                        <div class="step-main">
                          <div class="step-head">
                            <div class="step-title">{{ step.title }}</div>
                            <div
                              class="step-chip"
                              :class="{
                                done: step.state === 'done',
                                running: step.state === 'running',
                                queued: step.state === 'queued',
                              }"
                            >
                              {{
                                step.state === 'done'
                                  ? 'Complete'
                                  : step.state === 'running'
                                    ? 'Testing…'
                                    : 'Waiting for previous process'
                              }}
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
      </div>
    </section>

    <!-- 2) HOW IT WORKS (horizontal flow) -->
    <section id="how" class="snap-section mx-auto w-full max-w-6xl px-4 py-14">
      <div>
        <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">How it works</div>
        <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">An Autonomous Assembly Line</h2>
        <p class="mt-3 max-w-2xl text-lg text-text-dim">
          Planning → Designing → Implementing → Generating Syncs → Assembling. Built to feel like a real engineering system, not a template builder.
        </p>
      </div>

      <div class="mt-8">
        <div class="how-flow">
          <div class="how-step glass">
            <div class="how-kicker"><span class="how-stepnum">1</span><span>Step</span></div>
            <div class="how-title">Planning</div>
            <div class="how-body">Takes your prompt and turns it into a detailed plan for the agents.</div>
          </div>

          <div class="how-connector" aria-hidden="true" />

          <div class="how-step glass">
            <div class="how-kicker"><span class="how-stepnum">2</span><span>Step</span></div>
            <div class="how-title">Designing</div>
            <div class="how-body">Turns the plan into Concepts.</div>
          </div>

          <div class="how-connector" aria-hidden="true" />

          <div class="how-step glass">
            <div class="how-kicker"><span class="how-stepnum">3</span><span>Step</span></div>
            <div class="how-title">Implementing</div>
            <div class="how-body">
              Creates implementation by reusing Concepts from the concept library or generating custom Concepts based on
              the library.
            </div>
          </div>

          <div class="how-connector" aria-hidden="true" />

          <div class="how-step glass">
            <div class="how-kicker"><span class="how-stepnum">4</span><span>Step</span></div>
            <div class="how-title">Generating Syncs</div>
            <div class="how-body">Creates API endpoints and the glue code that ties Concepts together based on user flows.</div>
          </div>

          <div class="how-connector" aria-hidden="true" />

          <div class="how-step glass">
            <div class="how-kicker"><span class="how-stepnum">5</span><span>Step</span></div>
            <div class="how-title">Assembling</div>
            <div class="how-body">
              Assembles the backend and creates the frontend based on the API endpoints and a detailed app graph.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2.5) CONCEPTS & SYNCS (high-level) -->
    <section class="snap-section mx-auto w-full max-w-6xl px-4 py-14">
      <div>
        <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Concepts &amp; Syncs</div>
        <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Reusable building blocks. Reliable wiring.</h2>
        <p class="mt-3 max-w-2xl text-lg text-text-dim">
          Concepts capture what your product
          is. Syncs capture how parts of the system
          talk.
        </p>
      </div>

      <div class="mt-8 grid gap-4 md:grid-cols-2">
        <div class="glass rounded-3xl border border-glass-border bg-glass-bg p-6 shadow-glass backdrop-blur-2xl">
          <div class="text-xs font-extrabold uppercase tracking-[0.18em] text-text-dim">Concepts</div>
          <div class="mt-2 text-xl font-black tracking-tight">A typed “idea module”</div>
          <p class="mt-2 text-text-dim">
            A Concept is a reusable unit of domain logic: it defines data, invariants, and behaviors in one place so you
            can reuse it across features and projects.
          </p>
        </div>

        <div class="glass rounded-3xl border border-glass-border bg-glass-bg p-6 shadow-glass backdrop-blur-2xl">
          <div class="text-xs font-extrabold uppercase tracking-[0.18em] text-text-dim">Syncs</div>
          <div class="mt-2 text-xl font-black tracking-tight">The glue between Concepts</div>
          <p class="mt-2 text-text-dim">
            A Sync is an explicit integration point: it connects Concepts via clear inputs/outputs, generating the API
            endpoints and orchestration code that turns modules into a working app.
          </p>
        </div>
      </div>

      <div class="mt-6 text-sm text-text-dim">
        Based on ideas in
        <a
          class="font-semibold text-neon-teal underline decoration-[color:var(--border)] underline-offset-4 hover:decoration-[color:var(--primary)]"
          href="https://arxiv.org/pdf/2508.14511"
          target="_blank"
          rel="noreferrer"
        >
          arXiv:2508.14511
        </a>
        by Eagon Meng and Daniel Jackson.
      </div>
    </section>

    <!-- 2.75) DEMO -->
    <section class="snap-section mx-auto w-full max-w-6xl px-4 py-14">
      <div>
        <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Demo</div>
        <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">A real project, end to end.</h2>
        <p class="mt-3 max-w-2xl text-lg text-text-dim">
          Here’s a sample project prompt and what the generated app looks like.
        </p>
      </div>

      <div class="mt-8 grid gap-4 md:grid-cols-2 md:items-start">
        <div class="glass demo-input-card rounded-3xl p-6 shadow-glass backdrop-blur-2xl">
          <div class="demo-input-group">
            <div class="demo-group-label">Project Name</div>
            <div class="demo-ghost-input">SimpleSocialV2</div>
          </div>

          <div class="demo-divider"></div>

          <div class="demo-input-group">
            <div class="demo-group-label">Requirements</div>
            <pre class="demo-ghost-textarea demo-prompt"><code>I would like a simple social media app where users can sign up with their email and a password, create a profile with a profile picture, a bio, a name, and a username/displayname. Users can posts images with text captions and users can issue friend requests to eachother. Users can accept or decline friend requests. In their feed, users see only the posts from people they are friends with, in a most recent sort. There is pagination here. Users have a my profile page where their posts are, and there is pagination here too and this is sorted by create date. Users can like posts and comment on posts. Users can message their friends through DMs. Users can send photos through DMs.</code></pre>
          </div>
        </div>

        <div class="glass rounded-3xl border border-glass-border bg-glass-bg p-6 shadow-glass backdrop-blur-2xl">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-xs font-extrabold uppercase tracking-[0.18em] text-text-dim">Video Demo</div>
              <div class="mt-2 text-xl font-black tracking-tight">SimpleSocialV2 walkthrough</div>
            </div>
          </div>

          <div class="mt-4 overflow-hidden rounded-2xl border border-glass-border bg-white/5">
            <div class="aspect-video">
              <video
                class="h-full w-full"
                controls
                autoplay
                muted
                loop
                playsinline
                preload="metadata"
                :src="demoVideoUrl"
              ></video>
            </div>
          </div>

          <div class="mt-3 text-sm text-text-dim">
            Upload your MP4 to <span class="text-text">public/demos/simplesocialv2.mp4</span> and it will appear here.
          </div>
        </div>
      </div>
    </section>

    <!-- 3) CODE YOU ACTUALLY OWN -->
    <section id="own" class="snap-section mx-auto w-full max-w-6xl px-4 py-14">
      <div class="grid gap-10 md:grid-cols-2 md:items-start">
        <div>
          <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Code you actually own</div>
          <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Standard tech. Raw repo. Zero hostage UX.</h2>
          <p class="mt-3 max-w-xl text-lg text-text-dim">
            We don't host your code in a walled garden. You get a raw, beautiful repository built on standard, scalable
            technologies.
          </p>

          <div class="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
              <CheckCircle2 :size="16" class="text-emerald-400" />
              Deno backend + MongoDB
            </span>
            <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
              <CheckCircle2 :size="16" class="text-emerald-400" />
              React/Vue frontend structure
            </span>
            <span class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-3 py-2">
              <CheckCircle2 :size="16" class="text-emerald-400" />
              Native DB control
            </span>
          </div>
        </div>

        <div class="code-window rounded-3xl border border-glass-border bg-glass-bg shadow-glass backdrop-blur-2xl">
          <div class="flex items-center gap-2 border-b border-glass-border px-4 py-3">
            <div class="h-2.5 w-2.5 rounded-full bg-[color:var(--error)]" />
            <div class="h-2.5 w-2.5 rounded-full bg-[color:var(--primary-glow)]" />
            <div class="h-2.5 w-2.5 rounded-full bg-[color:var(--primary)]" />
            <div class="ml-auto text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">repository</div>
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
    engine/
    syncs/
    tests/
    utils/
    concept_server.ts
    main.ts</code></pre>
            </div>

            <div class="repo-pane p-3">
              <div class="flex items-center justify-between">
                <div class="text-xs font-extrabold uppercase tracking-[0.16em] text-neon-teal">frontend/</div>
                <div class="text-xs font-extrabold uppercase tracking-[0.16em] text-text-dim">react/vue</div>
              </div>
              <pre class="mt-2 code-pre repo-tree"><code>frontend/
  public/
  src/
    assets/
    components/
    pages/
    router/
    styles/
    App.tsx
    main.tsx
  index.html
  package.json
  tsconfig.json
  vite.config.ts</code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4) COMPETITOR COMPARISON (The Moat) -->
    <section id="moat" class="snap-section mx-auto w-full max-w-6xl px-4 py-14">
      <div>
        <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">The Moat</div>
        <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">A real software factory beats a page builder.</h2>
      </div>

      <div class="mt-8 overflow-hidden rounded-3xl border border-glass-border bg-glass-bg shadow-glass backdrop-blur-2xl">
        <div class="grid grid-cols-4 border-b border-glass-border bg-white/5 px-4 py-3 text-sm font-black">
          <div class="col-span-1 text-text-dim">Capability</div>
          <div class="col-span-1">ConceptualAI</div>
          <div class="col-span-1 text-text-dim">Wix/Webflow</div>
          <div class="col-span-1 text-text-dim">Boilerplate Templates</div>
        </div>

        <div class="divide-y divide-glass-border">
          <div class="grid grid-cols-4 items-center gap-3 px-4 py-4">
            <div class="col-span-1 font-semibold">Own the Code?</div>
            <div class="col-span-1 flex items-center gap-2">
              <CheckCircle2 :size="18" class="text-emerald-400" />
              <span>Yes</span>
            </div>
            <div class="col-span-1 flex items-center gap-2 text-text-dim">
              <XCircle :size="18" class="text-red-400" />
              <span>No</span>
            </div>
            <div class="col-span-1 flex items-center gap-2 text-text-dim">
              <AlertTriangle :size="18" class="text-amber-400" />
              <span>Partial</span>
            </div>
          </div>

          <div class="grid grid-cols-4 items-center gap-3 px-4 py-4">
            <div class="col-span-1 font-semibold">Custom Complex Logic?</div>
            <div class="col-span-1 flex items-center gap-2">
              <CheckCircle2 :size="18" class="text-emerald-400" />
              <span>Yes</span>
            </div>
            <div class="col-span-1 flex items-center gap-2 text-text-dim">
              <XCircle :size="18" class="text-red-400" />
              <span>No</span>
            </div>
            <div class="col-span-1 flex items-center gap-2 text-text-dim">
              <AlertTriangle :size="18" class="text-amber-400" />
              <span>Depends</span>
            </div>
          </div>

          <div class="grid grid-cols-4 items-center gap-3 px-4 py-4">
            <div class="col-span-1 font-semibold">Auto-Fixing Compiler?</div>
            <div class="col-span-1 flex items-center gap-2">
              <CheckCircle2 :size="18" class="text-emerald-400" />
              <span>Yes</span>
            </div>
            <div class="col-span-1 flex items-center gap-2 text-text-dim">
              <XCircle :size="18" class="text-red-400" />
              <span>No</span>
            </div>
            <div class="col-span-1 flex items-center gap-2 text-text-dim">
              <AlertTriangle :size="18" class="text-amber-400" />
              <span>Manual</span>
            </div>
          </div>

          <div class="grid grid-cols-4 items-center gap-3 px-4 py-4">
            <div class="col-span-1 font-semibold">True DB Control?</div>
            <div class="col-span-1 flex items-center gap-2">
              <CheckCircle2 :size="18" class="text-emerald-400" />
              <span>Yes</span>
            </div>
            <div class="col-span-1 flex items-center gap-2 text-text-dim">
              <XCircle :size="18" class="text-red-400" />
              <span>No</span>
            </div>
            <div class="col-span-1 flex items-center gap-2 text-text-dim">
              <AlertTriangle :size="18" class="text-amber-400" />
              <span>Maybe</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 5) FOOTER CTA -->
    <section class="snap-section mx-auto w-full max-w-6xl px-4 pb-14">
      <div class="relative overflow-hidden rounded-3xl border border-glass-border bg-glass-bg p-8 shadow-glass backdrop-blur-2xl">
        <div class="absolute -inset-10 -z-10 bg-[image:var(--grad-wave)] opacity-30 blur-2xl" />
        <div class="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Stop writing boilerplate.</div>
            <h3 class="mt-2 text-2xl font-black tracking-tight md:text-3xl">Start architecting.</h3>
            <p class="mt-2 max-w-xl text-text-dim">Generate your first app for free.</p>
          </div>
          <button type="button" class="btn btn-primary" @click="goBuild">
            Generate your first app for free.
            <ArrowRight :size="18" />
          </button>
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
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
:global(html.landing-slide) {
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
  scroll-padding-top: 90px;
}

.snap-section {
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.start-building-btn {
  border-radius: 10px;
  padding: 0.42rem 0.90rem;
  font-size: 0.875rem;
}

.hero-prompt :deep(.input-footer .btn.btn-primary) {
  border-radius: 10px;
  padding: 0.42rem 0.90rem;
  font-size: 0.875rem;
}

.hero-prompt :deep(.input-footer .btn.btn-primary svg) {
  width: 16px !important;
  height: 16px !important;
}

.demo-input-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--input-bg);
  border: 1px solid var(--border);
}

.demo-input-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #3b82f6 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: 1;
}

.demo-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.demo-group-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--neon-teal);
  text-shadow: 0 0 10px rgba(45, 212, 191, 0.2);
}

.demo-divider {
  width: 100%;
  height: 1px;
  background: var(--border);
  margin: 1.5rem 0;
}

.demo-ghost-input {
  width: 100%;
  color: var(--text);
  font-family: inherit;
  font-size: 1.25rem;
  font-weight: 700;
}

.demo-ghost-textarea {
  width: 100%;
  color: var(--text);
  font-family: inherit;
  font-size: 1.0625rem;
  line-height: 1.6;
}

.demo-prompt {
  max-height: 320px;
  overflow: auto;
  padding-right: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.demo-prompt code {
  font-family: inherit;
}

.accent-word {
  display: inline-block;
  padding: 0 0.15em;
  font-weight: 900;
  color: transparent;
  background-image: var(--grad-primary);
  -webkit-background-clip: text;
  background-clip: text;
}

.landing {
  position: relative;
  isolation: isolate;
}

.landing::before,
.landing::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
}

/* Default (top) background */
.landing::before {
  z-index: -2;
  background-color: var(--bg);
  background-image:
    radial-gradient(1100px circle at 28% 12%, var(--grad-color-1), transparent 58%),
    radial-gradient(900px circle at 82% 8%, var(--grad-color-2), transparent 62%);
  opacity: 1;
}

/* Scrolled background */
.landing::after {
  z-index: -1;
  background-color: var(--bg);
  background-image:
    radial-gradient(950px circle at 22% 32%, var(--grad-color-2), transparent 60%),
    radial-gradient(1200px circle at 78% 38%, var(--grad-color-1), transparent 64%),
    var(--grad-wave);
  opacity: 0;
  transition: opacity 420ms ease;
}

.landing.landing-alt::after {
  opacity: 0.22;
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

/* Gradient border ring (matches AppDescriptionInput "input-card" feel) */
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

.step-desc {
  margin-top: 0.25rem;
  color: var(--text-dim);
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

.step-chip.running {
  color: var(--neon-teal);
}

.step-chip.queued {
  color: var(--text-dim);
}

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

.repo-tree::before {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  top: 10px;
  height: 24px;
  border-radius: 14px;
  background: linear-gradient(90deg, transparent, var(--glass-border), transparent);
  opacity: 0.9;
  pointer-events: none;
}

.how-flow {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.how-step {
  padding: 1.25rem;
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
  font-size: 16px;
  color: var(--text);
}

.how-body {
  margin-top: 8px;
  color: var(--text-dim);
  font-size: 14px;
}

.how-connector {
  display: none;
}

@media (min-width: 900px) {
  .how-flow {
    grid-template-columns: 1fr 54px 1fr 54px 1fr 54px 1fr 54px 1fr;
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

@media (prefers-reduced-motion: reduce) {
  .term-line {
    animation: none !important;
    opacity: 1;
    transform: none !important;
  }
}
</style>
