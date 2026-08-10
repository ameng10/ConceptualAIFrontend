<script setup lang="ts">
/**
 * The settings SHELL: a header, a tab rail, and whichever section the URL names.
 *
 * This used to be three glass panels stacked in one file, with Billing and Pricing living
 * as separate top-level pages reachable only from the sidebar. Everything about the account
 * is one surface now — and each section keeps its own URL, so a link to billing is still a
 * link to billing rather than "settings, scroll down".
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CreditCard, Github, KeyRound, Tag, User } from 'lucide-vue-next'

const route = useRoute()

const tabs = [
  // Ordered by how often someone comes here for it: money first, identity after.
  { label: 'Billing', to: '/settings/billing', icon: CreditCard },
  { label: 'Plans', to: '/settings/plans', icon: Tag },
  { label: 'Account', to: '/settings/account', icon: KeyRound },
  { label: 'Profile', to: '/settings/profile', icon: User },
  { label: 'Integrations', to: '/settings/integrations', icon: Github },
]

const activeLabel = computed(
  () => tabs.find((t) => route.path.startsWith(t.to))?.label ?? 'Settings',
)
</script>

<template>
  <div class="settings-view">
    <div class="container fade-in">
      <header class="header">
        <h1 class="animated-gradient-text">Settings</h1>
        <p class="subtitle">{{ activeLabel }}</p>
      </header>

      <nav class="tab-rail" aria-label="Settings sections">
        <router-link
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="tab"
          v-slot="{ isActive }"
        >
          <span class="tab-inner" :class="{ active: isActive }">
            <component :is="tab.icon" :size="16" />
            <span>{{ tab.label }}</span>
          </span>
        </router-link>
      </nav>

      <router-view />
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* Tighter than the old 3rem: the tab rail costs vertical space, and the sections below
     it are what people came for. */
  padding: 2rem 1rem 3rem;
}

.container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.header { text-align: left; }
h1 { font-size: 1.75rem; margin: 0; font-weight: 900; letter-spacing: -0.02em; }
.subtitle { margin: 0.25rem 0 0; color: var(--text-dim); font-size: 0.9375rem; }

.tab-rail {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.tab { text-decoration: none; }

.tab-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-dim);
  transition: background 0.15s ease, color 0.15s ease;
}

.tab-inner:hover { background: var(--surface); color: var(--text); }

.tab-inner.active {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--primary);
}
</style>
