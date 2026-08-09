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
  font-size: 0.6875rem;
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
  --tier-fg: var(--tone-violet);
  --tier-bg: var(--tone-violet-bg);
  --tier-border: var(--tone-violet-border);
  --tier-glow: 0 0 6px color-mix(in srgb, var(--tone-violet) 70%, transparent);
}

.tier-pro {
  --tier-fg: var(--tone-gold);
  --tier-bg: var(--tone-gold-bg);
  --tier-border: var(--tone-gold-border);
  --tier-glow: 0 0 7px color-mix(in srgb, var(--tone-gold) 65%, transparent);
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
}

.tier-unlimited .tier-dot {
  background: linear-gradient(110deg, #2dd4bf, #a78bfa, #fbbf24);
}

[data-theme='light'] .tier-badge { --tier-glow: none; }
[data-theme='light'] .tier-starter {
  --tier-fg: #0d9488;
  --tier-bg: rgba(13, 148, 136, 0.1);
  --tier-border: rgba(13, 148, 136, 0.28);
}
[data-theme='light'] .tier-unlimited {
  --tier-fg: #0f172a;
  --tier-border: rgba(15, 23, 42, 0.22);
}
</style>
