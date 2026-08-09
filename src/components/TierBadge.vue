<script setup lang="ts">
import { computed } from 'vue'
import type { Tier } from '../services/billing-api'
import { TIER_STYLE } from '../composables/useBilling'

const props = withDefaults(
  defineProps<{ tier: Tier; size?: 'sm' | 'md'; title?: string }>(),
  { size: 'sm' },
)

const style = computed(() => TIER_STYLE[props.tier] ?? TIER_STYLE.free)
</script>

<template>
  <span
    class="tier-badge"
    :class="[style.className, `size-${size}`]"
    :title="title ?? `${style.label} plan`"
  >
    <span class="tier-dot" aria-hidden="true" />
    <span class="tier-label">{{ style.label }}</span>
  </span>
</template>

<style scoped>
.tier-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 999px;
  border: 1px solid var(--tier-border);
  background: var(--tier-bg);
  color: var(--tier-fg);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
  /* Sits next to a wordmark, so it must never fight it for attention. */
  text-transform: uppercase;
}

.size-sm {
  padding: 0.1875rem 0.4375rem;
  font-size: 0.5625rem;
}

.size-md {
  padding: 0.3125rem 0.6875rem;
  font-size: 0.6875rem;
}

.tier-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 999px;
  background: var(--tier-fg);
  box-shadow: var(--tier-glow);
  flex: none;
}

/* Free reads as "no plan yet" — deliberately quiet, so upgrading is visibly a
   step up rather than a lateral move. */
.tier-free {
  --tier-fg: var(--text-dim);
  --tier-bg: color-mix(in srgb, var(--text-dim) 10%, transparent);
  --tier-border: color-mix(in srgb, var(--text-dim) 22%, transparent);
  --tier-glow: none;
}

.tier-starter {
  --tier-fg: #2dd4bf;
  --tier-bg: rgba(45, 212, 191, 0.12);
  --tier-border: rgba(45, 212, 191, 0.32);
  --tier-glow: 0 0 6px rgba(45, 212, 191, 0.7);
}

.tier-studio {
  --tier-fg: #a78bfa;
  --tier-bg: rgba(167, 139, 250, 0.14);
  --tier-border: rgba(167, 139, 250, 0.34);
  --tier-glow: 0 0 6px rgba(167, 139, 250, 0.75);
}

.tier-pro {
  --tier-fg: #fbbf24;
  --tier-bg: rgba(251, 191, 36, 0.14);
  --tier-border: rgba(251, 191, 36, 0.36);
  --tier-glow: 0 0 7px rgba(251, 191, 36, 0.8);
}

/* Unlimited is the only prismatic one. It is the negotiated tier, so it should look
   unlike anything purchasable from a pricing card. */
.tier-unlimited {
  --tier-fg: #f8fafc;
  --tier-bg: linear-gradient(
    110deg,
    rgba(45, 212, 191, 0.22),
    rgba(167, 139, 250, 0.22),
    rgba(251, 191, 36, 0.22),
    rgba(45, 212, 191, 0.22)
  );
  --tier-border: rgba(248, 250, 252, 0.28);
  --tier-glow: 0 0 8px rgba(248, 250, 252, 0.55);
  background-size: 200% 100%;
  animation: tier-shift 7s linear infinite;
}

.tier-unlimited .tier-dot {
  background: linear-gradient(110deg, #2dd4bf, #a78bfa, #fbbf24);
}

@keyframes tier-shift {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

/* Respect reduced-motion: the badge still reads, it just stops moving. */
@media (prefers-reduced-motion: reduce) {
  .tier-unlimited {
    animation: none;
  }
}

[data-theme='light'] .tier-starter { --tier-fg: #0d9488; }
[data-theme='light'] .tier-studio { --tier-fg: #7c3aed; }
[data-theme='light'] .tier-pro { --tier-fg: #b45309; }
[data-theme='light'] .tier-unlimited { --tier-fg: #0f172a; }
</style>
