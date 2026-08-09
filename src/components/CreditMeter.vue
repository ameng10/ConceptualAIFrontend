<script setup lang="ts">
import { computed } from 'vue'
import { Coins } from 'lucide-vue-next'
import { useBilling } from '../composables/useBilling'

defineProps<{ collapsed?: boolean }>()

const { billing, credits, isLow, isEmpty, frozen } = useBilling()

/** What the number MEANS, in one line, on hover. The split matters because the two
 *  balances expire differently and a single total hides that. */
const detail = computed(() => {
  const b = billing.value
  if (!b) return ''
  if (b.frozen) return 'Account on hold pending review'
  const parts: string[] = []
  if (b.subscriptionCredits > 0) parts.push(`${b.subscriptionCredits} from your plan`)
  if (b.purchasedCredits > 0) parts.push(`${b.purchasedCredits} purchased`)
  if (parts.length === 0) return 'No credits — buy some to start building'
  return parts.join(' · ')
})

const tone = computed(() => {
  if (frozen.value) return 'frozen'
  if (isEmpty.value) return 'empty'
  if (isLow.value) return 'low'
  return 'ok'
})
</script>

<template>
  <router-link
    v-if="billing"
    to="/billing"
    class="credit-meter"
    :class="[tone, { collapsed }]"
    :title="detail"
    :aria-label="`${credits} credits. ${detail}`"
  >
    <Coins :size="15" class="meter-icon" aria-hidden="true" />
    <template v-if="!collapsed">
      <span class="meter-value">{{ credits }}</span>
      <span class="meter-unit">{{ credits === 1 ? 'credit' : 'credits' }}</span>
    </template>
  </router-link>
</template>

<style scoped>
.credit-meter {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 999px;
  border: 1px solid var(--meter-border);
  background: var(--meter-bg);
  color: var(--meter-fg);
  text-decoration: none;
  font-size: 0.8125rem;
  line-height: 1;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.credit-meter:hover {
  border-color: var(--meter-fg);
  transform: translateY(-1px);
}

.credit-meter.collapsed {
  justify-content: center;
  padding: 0.375rem;
}

.meter-value {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.meter-unit {
  color: var(--text-dim);
  font-size: 0.75rem;
}

.meter-icon { flex: none; }

/* Healthy balance is deliberately unobtrusive — it is a status, not a call to action. */
.ok {
  --meter-fg: var(--text);
  --meter-bg: color-mix(in srgb, var(--text) 6%, transparent);
  --meter-border: var(--border);
}

/* Below the minimum build charge: they cannot start anything, so it earns attention.
   Uses the existing "parked on you" amber rather than inventing a colour. */
.low {
  --meter-fg: var(--await);
  --meter-bg: var(--await-bg);
  --meter-border: color-mix(in srgb, var(--await) 40%, transparent);
}
.low .meter-unit { color: var(--await); opacity: 0.8; }

.empty {
  --meter-fg: var(--await);
  --meter-bg: var(--await-bg);
  --meter-border: color-mix(in srgb, var(--await) 55%, transparent);
}
.empty .meter-unit { color: var(--await); opacity: 0.8; }

/* A hold is not a nudge — it is a stop. Error red, matching every other blocked state. */
.frozen {
  --meter-fg: var(--error);
  --meter-bg: color-mix(in srgb, var(--error) 14%, transparent);
  --meter-border: color-mix(in srgb, var(--error) 45%, transparent);
}
.frozen .meter-unit { color: var(--error); opacity: 0.8; }
</style>
