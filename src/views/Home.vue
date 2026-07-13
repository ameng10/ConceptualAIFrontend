<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Sun, Moon } from 'lucide-vue-next'
import { authState } from '@/services/api'
import LandingHero from '@/components/landing/LandingHero.vue'
import DemoShowcase from '@/components/landing/DemoShowcase.vue'
import HowItWorks from '@/components/landing/HowItWorks.vue'
import ProofReceipts from '@/components/landing/ProofReceipts.vue'
import OwnershipSection from '@/components/landing/OwnershipSection.vue'
import IntegrationsWall from '@/components/landing/IntegrationsWall.vue'
import LibrarySection from '@/components/landing/LibrarySection.vue'
import CodingAgentSection from '@/components/landing/CodingAgentSection.vue'
import FaqSection from '@/components/landing/FaqSection.vue'
import FinalCta from '@/components/landing/FinalCta.vue'

const router = useRouter()

const isSignedIn = computed(() => authState.isSignedIn())

const landingAlt = ref(false)

// Swap the ambient background once the visitor scrolls past the hero.
const SCROLL_THRESHOLD = 560

let scrollTicking = false
const updateLandingBackground = () => {
  landingAlt.value = window.scrollY > SCROLL_THRESHOLD
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

const theme = ref<'dark' | 'light'>('dark')

const applyTheme = (value: 'dark' | 'light') => {
  theme.value = value
  document.documentElement.setAttribute('data-theme', value)
  try {
    localStorage.setItem('theme', value)
  } catch {
    // no-op
  }
}

const toggleTheme = () => {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

onMounted(() => {
  // Ensure theme is applied on marketing pages too.
  try {
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light' | null) || 'dark'
    applyTheme(savedTheme)
  } catch {
    applyTheme('dark')
  }

  updateLandingBackground()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="landing min-h-screen text-text" :class="{ 'landing-alt': landingAlt }">
    <!-- HEADER -->
    <header class="sticky top-0 z-50 border-b border-glass-border bg-glass-bg/80 backdrop-blur-xl">
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
              href="#demos"
              class="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-text-dim transition hover:border-glass-border hover:bg-white/5 hover:text-text"
            >
              Live Demos
            </a>
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
              href="#faq"
              class="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-text-dim transition hover:border-glass-border hover:bg-white/5 hover:text-text"
            >
              FAQ
            </a>
          </nav>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-2xl border border-glass-border bg-white/5 px-4 py-2 text-sm font-semibold text-text transition hover:bg-white/10"
            @click="toggleTheme"
            :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
          >
            <Sun v-if="theme === 'dark'" :size="18" />
            <Moon v-else :size="18" />
            <span>{{ theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>

          <button
            v-if="!isSignedIn"
            type="button"
            class="hidden rounded-2xl border border-glass-border bg-white/5 px-4 py-2 text-sm font-semibold text-text transition hover:bg-white/10 md:inline-flex"
            @click="goLogin"
          >
            Sign in
          </button>

          <button type="button" class="btn btn-primary start-building-btn" @click="goBuild">
            Open Builder (Beta)
            <ArrowRight :size="16" />
          </button>
        </div>
      </div>
    </header>

    <!-- 1) HERO — prompt box + proof-forward copy + console ending green -->
    <LandingHero />

    <!-- 2) THE GALLERY — five real apps, one prompt each -->
    <DemoShowcase />

    <!-- 3) THE RECEIPTS — test, diff & security receipts, scale stats -->
    <ProofReceipts />

    <!-- 4) HOW IT WORKS — three steps -->
    <HowItWorks />

    <!-- 5) OWNERSHIP — both repos, yours -->
    <OwnershipSection />

    <!-- 6) INTEGRATIONS — every badge links to the demo that proves it -->
    <IntegrationsWall />

    <!-- 7) THE LIBRARY — versioned blocks; one utils file adds a provider -->
    <LibrarySection />

    <!-- 8) THE OBVIOUS QUESTION — why not a coding agent -->
    <CodingAgentSection />

    <!-- 9) FAQ — Deno, self-hosting, secrets, databases, hand-edits -->
    <FaqSection />

    <!-- 10) FINAL CTA + support-is-a-demo + footer links -->
    <FinalCta />
  </div>
</template>

<style scoped>
.start-building-btn {
  border-radius: 10px;
  padding: 0.42rem 0.9rem;
  font-size: 0.875rem;
}

.landing {
  position: relative;
  isolation: isolate;
  overflow-x: hidden;
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
</style>
