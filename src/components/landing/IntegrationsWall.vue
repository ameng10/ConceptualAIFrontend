<script setup lang="ts">
import {
  CreditCard,
  Mail,
  Sparkles,
  Globe,
  CalendarCheck,
  MessagesSquare,
  ImageUp,
  ShieldCheck,
  KeyRound,
  Database,
  Github,
  Rocket,
} from 'lucide-vue-next'

const integrations = [
  {
    icon: CreditCard,
    label: 'Stripe payments & subscriptions',
    proof: 'See it in Shopfront & Commons',
    href: '#demos',
  },
  {
    icon: Mail,
    label: 'Two-way email — Gmail · Outlook · Zoho',
    proof: 'See it in Deskmind & Shopfront',
    href: '#demos',
  },
  {
    icon: Sparkles,
    label: 'AI features — classify · extract · moderate · RAG',
    proof: 'See it in Deskmind',
    href: '#demos',
  },
  {
    icon: Globe,
    label: 'Live web research with citations',
    proof: 'See it in Stride',
    href: '#demos',
  },
  {
    icon: CalendarCheck,
    label: 'Scheduling & reservations that can’t double-book',
    proof: 'See it in Atelier',
    href: '#demos',
  },
  {
    icon: MessagesSquare,
    label: 'Messaging, feeds & notifications',
    proof: 'See it in Atelier & Commons',
    href: '#demos',
  },
  {
    icon: ImageUp,
    label: 'File & media uploads',
    proof: 'In every demo',
    href: '#demos',
  },
  {
    icon: ShieldCheck,
    label: 'Admin operators — env-credentialed, no signup',
    proof: 'See it in Shopfront & Deskmind',
    href: '#demos',
  },
  {
    icon: KeyRound,
    label: 'Auth & sessions out of the box',
    proof: 'In every app',
    href: '#demos',
  },
  {
    icon: Database,
    label: 'MongoDB · Postgres · Turso',
    proof: 'Your database, your call',
    href: '#own',
  },
  {
    icon: Github,
    label: 'GitHub export — both repos',
    proof: 'Ownership, one click',
    href: '#own',
  },
  {
    icon: Rocket,
    label: 'Deno Deploy-ready',
    proof: 'Deploy guide included',
    href: '#own',
  },
]
</script>

<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-14">
    <div>
      <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">Real integrations</div>
      <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Apps that do real business.</h2>
      <p class="mt-3 max-w-3xl text-lg text-text-dim">
        Payments that settle, email that sends, AI that's part of the product, research with sources. Every badge
        below links to a live demo that proves it — nothing here is a roadmap item.
      </p>
    </div>

    <div class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <a
        v-for="item in integrations"
        :key="item.label"
        :href="item.href"
        class="int-card glass"
      >
        <div class="int-icon">
          <component :is="item.icon" :size="18" />
        </div>
        <div class="int-text">
          <div class="int-label">{{ item.label }}</div>
          <div class="int-proof">{{ item.proof }} ↗</div>
        </div>
      </a>
    </div>
  </section>
</template>

<style scoped>
.int-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.1rem;
  border-radius: 18px;
  text-decoration: none;
  color: var(--text);
}

.int-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.int-icon {
  flex: 0 0 auto;
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

.int-text {
  min-width: 0;
}

.int-label {
  font-weight: 800;
  font-size: 0.9rem;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.int-proof {
  margin-top: 0.15rem;
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
