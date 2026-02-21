<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Sparkles,
  ChevronDown,
  ArrowRight,
  Play,
  Zap,
  Wand2,
  Boxes,
  ShieldCheck,
  Terminal,
  Layers,
  XCircle,
  CheckCircle2,
} from 'lucide-vue-next'
import { authState } from '@/services/api'

const router = useRouter()
const isSignedIn = ref(authState.isSignedIn())

const goBuild = () => {
  router.push('/build')
}

const goLogin = () => {
  router.push({ path: '/login', query: { redirect: '/build' } })
}

const ctaLabel = computed(() => (isSignedIn.value ? 'Start Building' : 'Start Building'))
</script>

<template>
  <div class="min-h-screen text-text">
    <!-- NAV -->
    <header class="sticky top-0 z-50 border-b border-glass-border bg-glass-bg backdrop-blur-xl">
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="group inline-flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-sm font-black tracking-tight text-text transition hover:border-glass-border hover:bg-white/5"
            @click="router.push('/')"
          >
            <Sparkles :size="18" class="text-neon-teal drop-shadow" />
            <span>ConceptualAI</span>
          </button>

          <nav class="hidden items-center gap-1 md:flex" aria-label="Primary">
            <div class="group relative">
              <button
                type="button"
                class="inline-flex items-center rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-text-dim transition hover:border-glass-border hover:bg-white/5 hover:text-text"
                aria-haspopup="menu"
              >
                Product
                <ChevronDown
                  :size="16"
                  class="ml-1 inline-block text-text-dim transition-transform group-hover:rotate-180"
                />
              </button>
              <div
                class="invisible absolute left-0 mt-2 w-64 translate-y-1 rounded-2xl border border-glass-border bg-glass-bg p-2 opacity-0 shadow-glass backdrop-blur-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
                role="menu"
              >
                <button
                  type="button"
                  class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-text transition hover:bg-white/5"
                  role="menuitem"
                  @click="goBuild"
                >
                  Start building
                </button>
                <a
                  href="#features"
                  class="block rounded-xl px-3 py-2 text-sm font-semibold text-text transition hover:bg-white/5"
                  role="menuitem"
                >
                  Features
                </a>
                <a
                  href="#how"
                  class="block rounded-xl px-3 py-2 text-sm font-semibold text-text transition hover:bg-white/5"
                  role="menuitem"
                >
                  How it works
                </a>
              </div>
            </div>

            <a
              href="#features"
              class="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-text-dim transition hover:border-glass-border hover:bg-white/5 hover:text-text"
            >
              Features
            </a>
            <a
              href="#how"
              class="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-text-dim transition hover:border-glass-border hover:bg-white/5 hover:text-text"
            >
              How it Works
            </a>
          </nav>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="hidden rounded-2xl border border-glass-border bg-white/5 px-4 py-2 text-sm font-semibold text-text transition hover:bg-white/10 md:inline-flex"
            @click="goLogin"
          >
            Sign in
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-2xl bg-[image:var(--grad-neon)] px-4 py-2 text-sm font-black text-[#042f2e] shadow-glass transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
            @click="goBuild"
          >
            {{ ctaLabel }}
            <ArrowRight :size="18" />
          </button>
        </div>
      </div>
    </header>

    <!-- HERO -->
    <section class="relative">
      <div class="mx-auto w-full max-w-6xl px-4 pb-10 pt-12 md:pt-16">
        <div class="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div
              class="inline-flex items-center gap-2 rounded-full border border-glass-border bg-white/5 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-neon-teal"
            >
              <Zap :size="14" />
              Autonomous AI Software Factory
            </div>

            <h1 class="mt-5 text-balance text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Backends built with little-to no bugs
            </h1>
            <p class="mt-4 max-w-xl text-pretty text-lg text-text-dim">
              Describe your app. Our autonomous AI agents will plan, build, and deploy it for you in minutes.
              No more gluing APIs together.
            </p>

            <div class="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-2xl bg-[image:var(--grad-neon)] px-6 py-3 text-base font-black text-[#042f2e] shadow-glass transition hover:-translate-y-0.5 hover:brightness-110"
                @click="goBuild"
              >
                Build Your First App
                <ArrowRight :size="18" />
              </button>

              <a
                href="#how"
                class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-6 py-3 text-base font-extrabold text-text transition hover:bg-white/10"
              >
                <Play :size="18" />
                Watch Demo
              </a>
            </div>

            <div class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-glass-border bg-white/5 p-4">
                <div class="text-sm font-black">Concept Architecture</div>
                <div class="mt-1 text-sm text-text-dim">Hardened modules, assembled.</div>
              </div>
              <div class="rounded-2xl border border-glass-border bg-white/5 p-4">
                <div class="text-sm font-black">Autonomous Agents</div>
                <div class="mt-1 text-sm text-text-dim">Planner → Builder → Verifier.</div>
              </div>
              <div class="rounded-2xl border border-glass-border bg-white/5 p-4">
                <div class="text-sm font-black">Sandboxed Tests</div>
                <div class="mt-1 text-sm text-text-dim">Runs before you ship.</div>
              </div>
            </div>
          </div>

          <!-- Hero Visual -->
          <div class="relative">
            <div
              class="absolute -inset-6 -z-10 rounded-[32px] bg-[image:var(--grad-wave)] opacity-25 blur-2xl"
            />

            <div
              class="rounded-3xl border border-glass-border bg-glass-bg shadow-glass backdrop-blur-2xl"
            >
              <div class="flex items-center gap-2 border-b border-glass-border px-4 py-3">
                <div class="h-2.5 w-2.5 rounded-full bg-[color:var(--error)]" />
                <div class="h-2.5 w-2.5 rounded-full bg-[color:var(--primary-glow)]" />
                <div class="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]" />
                <div class="ml-auto flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">
                  <Terminal :size="14" />
                  Factory Output
                </div>
              </div>

              <div class="space-y-4 p-5">
                <div class="rounded-2xl border border-glass-border bg-white/5 p-4">
                  <div class="text-xs font-extrabold uppercase tracking-[0.16em] text-text-dim">Prompt</div>
                  <div class="mt-2 font-mono text-sm">
                    <span class="text-neon-teal">&gt;</span>
                    Build an Airbnb clone
                    <span class="ml-1 inline-block h-4 w-2 bg-neon-teal align-[-0.15em] animate-caret" />
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border border-glass-border bg-white/5 p-4">
                    <div class="flex items-center gap-2 text-sm font-black">
                      <Wand2 :size="18" class="text-neon-teal" />
                      Plan
                    </div>
                    <div class="mt-2 text-sm text-text-dim">
                      Clarify specs, generate a concept graph, define APIs.
                    </div>
                  </div>
                  <div class="rounded-2xl border border-glass-border bg-white/5 p-4">
                    <div class="flex items-center gap-2 text-sm font-black">
                      <Boxes :size="18" class="text-neon-teal" />
                      Assemble
                    </div>
                    <div class="mt-2 text-sm text-text-dim">
                      Snap together hardened backend Concepts.
                    </div>
                  </div>
                  <div class="rounded-2xl border border-glass-border bg-white/5 p-4">
                    <div class="flex items-center gap-2 text-sm font-black">
                      <ShieldCheck :size="18" class="text-neon-teal" />
                      Verify
                    </div>
                    <div class="mt-2 text-sm text-text-dim">
                      Execute + test in secure sandboxes.
                    </div>
                  </div>
                  <div class="rounded-2xl border border-glass-border bg-white/5 p-4">
                    <div class="flex items-center gap-2 text-sm font-black">
                      <Rocket :size="18" class="text-neon-teal" />
                      Deliver
                    </div>
                    <div class="mt-2 text-sm text-text-dim">
                      Download a full-stack ZIP or deploy instantly.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- FEATURES -->
    <section id="features" class="mx-auto w-full max-w-6xl px-4 py-14">
      <div class="flex flex-col gap-2">
        <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Features</div>
        <h2 class="text-3xl font-black tracking-tight md:text-4xl">Why ConceptualAI wins.</h2>
        <p class="max-w-2xl text-lg text-text-dim">
          A software factory that assembles hardened Concepts instead of stitching brittle snippets.
        </p>
      </div>

      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <div class="group rounded-3xl border border-glass-border bg-glass-bg p-6 shadow-glass backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10">
          <div class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-glass-border bg-white/5">
            <Zap :size="20" class="text-neon-teal" />
          </div>
          <div class="mt-4 text-lg font-black">Autonomous Agents</div>
          <p class="mt-2 text-text-dim">
            A full engineering team in your browser. From Planner to Verifier, watch them work.
          </p>
        </div>

        <div class="group rounded-3xl border border-glass-border bg-glass-bg p-6 shadow-glass backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10">
          <div class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-glass-border bg-white/5">
            <Layers :size="20" class="text-neon-teal" />
          </div>
          <div class="mt-4 text-lg font-black">Concept Architecture</div>
          <p class="mt-2 text-text-dim">
            We don't write from scratch. We assemble hardened “Concepts” for perfectly structured code.
          </p>
        </div>

        <div class="group rounded-3xl border border-glass-border bg-glass-bg p-6 shadow-glass backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10">
          <div class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-glass-border bg-white/5">
            <ShieldCheck :size="20" class="text-neon-teal" />
          </div>
          <div class="mt-4 text-lg font-black">Sandboxed Verification</div>
          <p class="mt-2 text-text-dim">
            Code is executed and tested in secure Docker environments before you ever see it.
          </p>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section id="how" class="mx-auto w-full max-w-6xl px-4 py-14">
      <div class="grid gap-10 md:grid-cols-2 md:items-start">
        <div>
          <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">How it works</div>
          <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">The factory pipeline.</h2>
          <p class="mt-3 max-w-xl text-lg text-text-dim">
            From prompt → plan → assembly → generation → delivery. Always structured, always testable.
          </p>
        </div>

        <ol class="relative space-y-4 border-l border-glass-border pl-6">
          <li class="relative rounded-3xl border border-glass-border bg-white/5 p-5 shadow-glass">
            <span class="absolute -left-[11px] top-6 h-5 w-5 rounded-full bg-[image:var(--grad-neon)]" />
            <div class="text-sm font-black">Prompt</div>
            <div class="mt-1 text-text-dim">Tell us what you want.</div>
          </li>
          <li class="relative rounded-3xl border border-glass-border bg-white/5 p-5 shadow-glass">
            <span class="absolute -left-[11px] top-6 h-5 w-5 rounded-full bg-[image:var(--grad-neon)]" />
            <div class="text-sm font-black">Plan</div>
            <div class="mt-1 text-text-dim">AI clarifies the specs.</div>
          </li>
          <li class="relative rounded-3xl border border-glass-border bg-white/5 p-5 shadow-glass">
            <span class="absolute -left-[11px] top-6 h-5 w-5 rounded-full bg-[image:var(--grad-neon)]" />
            <div class="text-sm font-black">Design</div>
            <div class="mt-1 text-text-dim">We select the right backend Concepts.</div>
          </li>
          <li class="relative rounded-3xl border border-glass-border bg-white/5 p-5 shadow-glass">
            <span class="absolute -left-[11px] top-6 h-5 w-5 rounded-full bg-[image:var(--grad-neon)]" />
            <div class="text-sm font-black">Sync</div>
            <div class="mt-1 text-text-dim">We wire the backend Concepts together.</div>
          </li>
          <li class="relative rounded-3xl border border-glass-border bg-white/5 p-5 shadow-glass">
            <span class="absolute -left-[11px] top-6 h-5 w-5 rounded-full bg-[image:var(--grad-neon)]" />
            <div class="text-sm font-black">Assemble</div>
            <div class="mt-1 text-text-dim">We assemble the backend Concepts into a cohesive system and integrate the frontend.</div>
          </li>
          <li class="relative rounded-3xl border border-glass-border bg-white/5 p-5 shadow-glass">
            <span class="absolute -left-[11px] top-6 h-5 w-5 rounded-full bg-[image:var(--grad-neon)]" />
            <div class="text-sm font-black">Deploy</div>
            <div class="mt-1 text-text-dim">Download your full-stack ZIP or test instantly in your IDE.</div>
          </li>
        </ol>
      </div>
    </section>

    <!-- DIFFERENTIATOR -->
    <section class="mx-auto w-full max-w-6xl px-4 py-14">
      <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Differentiator</div>
      <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">A better way to ship.</h2>

      <div class="mt-8 grid gap-4 md:grid-cols-2">
        <div class="rounded-3xl border border-glass-border bg-white/5 p-6 shadow-glass">
          <div class="flex items-center gap-2 text-sm font-black">
            <XCircle :size="18" class="text-[color:var(--error)]" />
            The Old Way
          </div>
          <ul class="mt-4 space-y-3 text-text-dim">
            <li class="flex items-start gap-2">
              <span class="mt-1 h-2 w-2 rounded-full bg-[color:var(--error)]" />
              Writing snippets
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 h-2 w-2 rounded-full bg-[color:var(--error)]" />
              Debugging manual code
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 h-2 w-2 rounded-full bg-[color:var(--error)]" />
              Weeks of gluing APIs
            </li>
          </ul>
        </div>

        <div class="rounded-3xl border border-glass-border bg-white/5 p-6 shadow-glass">
          <div class="flex items-center gap-2 text-sm font-black">
            <CheckCircle2 :size="18" class="text-neon-teal" />
            ConceptualAI
          </div>
          <ul class="mt-4 space-y-3 text-text-dim">
            <li class="flex items-start gap-2">
              <span class="mt-1 h-2 w-2 rounded-full bg-neon-teal" />
              Full-Stack Generation
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 h-2 w-2 rounded-full bg-neon-teal" />
              Self-Healing Sandboxes
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 h-2 w-2 rounded-full bg-neon-teal" />
              Concept Reusability
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="mx-auto w-full max-w-6xl px-4 pb-14">
      <div
        class="relative overflow-hidden rounded-3xl border border-glass-border bg-glass-bg p-8 shadow-glass backdrop-blur-xl"
      >
        <div class="absolute -inset-10 -z-10 bg-[image:var(--grad-wave)] opacity-30 blur-2xl" />
        <div class="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Ready?</div>
            <h3 class="mt-2 text-2xl font-black tracking-tight md:text-3xl">Ready to hire your AI engineering team?</h3>
            <p class="mt-2 max-w-xl text-text-dim">
              Start building with Concept Architecture and ship production-ready structure faster.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-2xl bg-[image:var(--grad-neon)] px-6 py-3 text-base font-black text-[#042f2e] shadow-glass transition hover:-translate-y-0.5 hover:brightness-110"
            @click="goBuild"
          >
            Start Building
            <ArrowRight :size="18" />
          </button>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="border-t border-glass-border bg-glass-bg">
      <div class="mx-auto w-full max-w-6xl px-4 py-10">
        <div class="grid gap-8 md:grid-cols-3">
          <div class="md:col-span-1">
            <div class="inline-flex items-center gap-2 text-sm font-black">
              <Sparkles :size="16" class="text-neon-teal" />
              ConceptualAI
            </div>
            <div class="mt-2 text-sm text-text-dim">Also known as ConceptHub.</div>
          </div>

          <div>
            <div class="text-sm font-black">Product</div>
            <div class="mt-3 flex flex-col gap-2 text-sm text-text-dim">
              <a href="#features" class="hover:text-text">Features</a>
              <a href="#how" class="hover:text-text">How it works</a>
            </div>
          </div>

          <div>
            <div class="text-sm font-black">Company</div>
            <div class="mt-3 flex flex-col gap-2 text-sm text-text-dim">
              <a href="#" class="hover:text-text">About</a>
              <router-link to="/contact" class="hover:text-text">Contact</router-link>
              <router-link to="/posts" class="hover:text-text">Community</router-link>
              <router-link to="/library" class="hover:text-text">Docs</router-link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
