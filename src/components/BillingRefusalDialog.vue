<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, Coins, Lock, ShieldAlert, TrendingUp } from 'lucide-vue-next'
import TierBadge from './TierBadge.vue'
import { useBilling } from '../composables/useBilling'
import type { Tier } from '../services/billing-api'

/**
 * The refusal interstitial. Renders the server's DECISION — it never recomputes one.
 *
 * The guiding rule: a refusal must leave the user knowing exactly what happened, exactly
 * what it costs to fix, and be one click from fixing it. "Insufficient credits" with an
 * OK button is the version that loses the customer.
 */
export interface BillingRefusal {
  reason:
    | 'insufficient_credits'
    | 'exceeds_tier_ceiling'
    | 'account_frozen'
    | 'plan_quota_exhausted'
  credits?: number
  balance?: number | null
  shortfall?: number | null
  tier: Tier
  ceiling?: number | null
  suggestedTier?: Tier | null
  used?: number
  limit?: number | null
  resetsAt?: string | null
}

const props = defineProps<{ refusal: BillingRefusal }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'buy', credits: number): void
  (e: 'upgrade', tier: Tier): void
}>()

const { billing } = useBilling()

const priceUsd = computed(() => billing.value?.creditPriceUsd ?? 3)
const shortfall = computed(() => Math.max(0, props.refusal.shortfall ?? 0))
const shortfallCost = computed(() =>
  (shortfall.value * priceUsd.value).toFixed(2).replace(/\.00$/, ''),
)

const suggested = computed(() => {
  const t = props.refusal.suggestedTier
  if (!t) return null
  return billing.value?.tiers.find((x) => x.tier === t) ?? null
})

/** How full the "you have" bar is against the quote. Capped so a tiny balance against a
 *  huge quote still shows a visible sliver rather than nothing. */
const fillPct = computed(() => {
  const need = props.refusal.credits ?? 0
  const have = props.refusal.balance ?? 0
  if (need <= 0) return 100
  return Math.max(2, Math.min(100, (have / need) * 100))
})

const resetsIn = computed(() => {
  if (!props.refusal.resetsAt) return null
  const ms = new Date(props.refusal.resetsAt).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return 'shortly'
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return `in ${days} day${days === 1 ? '' : 's'}`
  const hours = Math.max(1, Math.round(ms / 3_600_000))
  return `in ${hours} hour${hours === 1 ? '' : 's'}`
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="dialog" role="dialog" aria-modal="true">
      <!-- ── Not enough credits ─────────────────────────────────────────── -->
      <template v-if="refusal.reason === 'insufficient_credits'">
        <header class="head">
          <span class="icon-wrap amber"><Coins :size="20" /></span>
          <div>
            <h2>You need {{ shortfall }} more credit<span v-if="shortfall !== 1">s</span></h2>
            <p class="sub">Your plan and design are saved. Nothing has been charged.</p>
          </div>
        </header>

        <div class="gauge">
          <div class="gauge-track">
            <div class="gauge-fill" :style="{ width: fillPct + '%' }" />
          </div>
          <div class="gauge-legend">
            <span><strong>{{ refusal.balance }}</strong> you have</span>
            <span><strong>{{ refusal.credits }}</strong> this build costs</span>
          </div>
        </div>

        <button class="cta primary" @click="emit('buy', shortfall)">
          <Coins :size="17" />
          Buy exactly {{ shortfall }} credit<span v-if="shortfall !== 1">s</span>
          <span class="cta-price">${{ shortfallCost }}</span>
        </button>

        <p class="footnote">
          Credits are ${{ priceUsd }} each and last 12 months. You can also
          <router-link to="/pricing" @click="emit('close')">take a plan</router-link>
          for a monthly allowance.
        </p>
      </template>

      <!-- ── App is bigger than the tier allows ─────────────────────────── -->
      <template v-else-if="refusal.reason === 'exceeds_tier_ceiling'">
        <header class="head">
          <span class="icon-wrap violet"><TrendingUp :size="20" /></span>
          <div>
            <h2>This app is bigger than your plan builds</h2>
            <p class="sub">Nothing has been charged. Your design is saved.</p>
          </div>
        </header>

        <div class="size-compare">
          <div class="size-row">
            <span class="size-label">This app</span>
            <span class="size-bar over"><span class="size-num">{{ refusal.credits }}</span></span>
          </div>
          <div class="size-row">
            <span class="size-label">
              <TierBadge :tier="refusal.tier" /> builds up to
            </span>
            <span
              class="size-bar within"
              :style="{ width: Math.max(18, ((refusal.ceiling ?? 0) / (refusal.credits || 1)) * 100) + '%' }"
            >
              <span class="size-num">{{ refusal.ceiling }}</span>
            </span>
          </div>
        </div>

        <div v-if="suggested" class="upgrade-card">
          <div class="upgrade-head">
            <TierBadge :tier="suggested.tier" size="md" />
            <span class="upgrade-price">
              <template v-if="suggested.priceFrom">from </template>${{ suggested.monthlyPriceUsd }}<span class="per">/mo</span>
            </span>
          </div>
          <ul class="upgrade-points">
            <li>
              Builds apps up to
              <strong>{{ suggested.maxCreditsPerApp ?? 'any size' }}</strong>
              <template v-if="suggested.maxCreditsPerApp"> credits</template>
            </li>
            <li><strong>{{ suggested.includedCredits }}</strong> credits included every month</li>
            <li>
              <strong>{{ suggested.plansPerWeek ?? 'Unlimited' }}</strong> planning turns per week
            </li>
          </ul>
          <button
            v-if="suggested.selfServe"
            class="cta primary"
            @click="emit('upgrade', suggested.tier)"
          >
            Upgrade to {{ suggested.label }}
            <ArrowUpRight :size="17" />
          </button>
          <a v-else class="cta primary" href="mailto:admin@conceptual-ai.app?subject=Unlimited plan">
            Contact us about {{ suggested.label }}
            <ArrowUpRight :size="17" />
          </a>
        </div>

        <p class="footnote">
          Or trim the design — removing concepts lowers the size. More credits will not
          lift this limit; the plan is what raises it.
        </p>
      </template>

      <!-- ── Weekly planning quota ──────────────────────────────────────── -->
      <template v-else-if="refusal.reason === 'plan_quota_exhausted'">
        <header class="head">
          <span class="icon-wrap amber"><Lock :size="20" /></span>
          <div>
            <h2>You've used this week's planning turns</h2>
            <p class="sub">
              {{ refusal.used }} of {{ refusal.limit }} used<template v-if="resetsIn">
              · another frees up {{ resetsIn }}</template>
            </p>
          </div>
        </header>

        <p class="body">
          Creating a plan, changing one, answering its questions and iterating each use a
          turn. Planning runs our most expensive models, which is why it's metered
          separately from credits.
        </p>

        <router-link class="cta primary" to="/pricing" @click="emit('close')">
          See plans with more turns
          <ArrowUpRight :size="17" />
        </router-link>
      </template>

      <!-- ── Account on hold ────────────────────────────────────────────── -->
      <template v-else>
        <header class="head">
          <span class="icon-wrap red"><ShieldAlert :size="20" /></span>
          <div>
            <h2>Your account is on hold</h2>
            <p class="sub">A refund or payment dispute is under review.</p>
          </div>
        </header>
        <p class="body">
          Builds are paused until this is resolved. Your projects and credits are intact.
          Email us and we'll sort it out.
        </p>
        <a class="cta primary" href="mailto:admin@conceptual-ai.app?subject=Account on hold">
          Email admin@conceptual-ai.app
        </a>
      </template>

      <button class="dismiss" @click="emit('close')">Not now</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(8px);
  animation: fade 0.16s ease-out;
}

.dialog {
  width: 100%;
  max-width: 27rem;
  padding: 1.5rem;
  border-radius: var(--radius, 20px);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  box-shadow: var(--glass-shadow);
  animation: rise 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.head { display: flex; gap: 0.875rem; align-items: flex-start; }
.head h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.25;
}
.sub { margin: 0.3125rem 0 0; font-size: 0.8125rem; color: var(--text-dim); }
.body { margin: 1.125rem 0 0; font-size: 0.875rem; line-height: 1.55; color: var(--text-dim); }

.icon-wrap {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.375rem;
  height: 2.375rem;
  border-radius: 0.75rem;
}
.icon-wrap.amber { background: var(--await-bg); color: var(--await); }
.icon-wrap.violet { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
.icon-wrap.red { background: color-mix(in srgb, var(--error) 15%, transparent); color: var(--error); }

/* Credit gauge — the shortfall made visual, so the gap is felt before it is read. */
.gauge { margin: 1.375rem 0 1.125rem; }
.gauge-track {
  height: 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text) 9%, transparent);
  overflow: hidden;
}
.gauge-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--await), #fbbf24);
  transition: width 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
.gauge-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-dim);
}
.gauge-legend strong { color: var(--text); font-variant-numeric: tabular-nums; }

/* Size comparison — two bars, same scale, so "too big" is obvious at a glance. */
.size-compare { margin: 1.375rem 0 1.125rem; display: grid; gap: 0.625rem; }
.size-row { display: grid; gap: 0.3125rem; }
.size-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-dim);
}
.size-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 1.75rem;
  padding: 0 0.625rem;
  border-radius: 0.5rem;
  font-variant-numeric: tabular-nums;
}
.size-bar.over {
  width: 100%;
  background: linear-gradient(90deg, rgba(167, 139, 250, 0.25), rgba(167, 139, 250, 0.45));
  border: 1px solid rgba(167, 139, 250, 0.4);
}
.size-bar.within {
  background: color-mix(in srgb, var(--text) 10%, transparent);
  border: 1px solid var(--border);
}
.size-num { font-weight: 800; font-size: 0.8125rem; }

.upgrade-card {
  margin-top: 1.125rem;
  padding: 1rem;
  border-radius: 0.875rem;
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--text) 4%, transparent);
}
.upgrade-head { display: flex; align-items: center; justify-content: space-between; }
.upgrade-price { font-weight: 800; font-size: 1.0625rem; }
.per { font-size: 0.75rem; font-weight: 600; color: var(--text-dim); }
.upgrade-points {
  margin: 0.875rem 0 1rem;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.4375rem;
  font-size: 0.8125rem;
  color: var(--text-dim);
}
.upgrade-points strong { color: var(--text); }

.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.16s ease, filter 0.16s ease;
}
.cta:hover { transform: translateY(-1px); filter: brightness(1.07); }
.cta.primary {
  margin-top: 1.125rem;
  background: linear-gradient(135deg, var(--primary), var(--primary-glow));
  color: #04121a;
}
.upgrade-card .cta.primary { margin-top: 0; }
.cta-price {
  margin-left: auto;
  padding: 0.1875rem 0.5rem;
  border-radius: 999px;
  background: rgba(4, 18, 26, 0.22);
  font-size: 0.8125rem;
}

.footnote {
  margin: 0.875rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-dim);
  text-align: center;
}
.footnote a { color: var(--primary); }

.dismiss {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.625rem;
  border: none;
  background: none;
  color: var(--text-dim);
  font-size: 0.8125rem;
  cursor: pointer;
  border-radius: 0.625rem;
}
.dismiss:hover { color: var(--text); background: color-mix(in srgb, var(--text) 6%, transparent); }

@keyframes fade { from { opacity: 0; } }
@keyframes rise { from { opacity: 0; transform: translateY(10px) scale(0.985); } }

@media (prefers-reduced-motion: reduce) {
  .overlay, .dialog { animation: none; }
  .gauge-fill { transition: none; }
  .cta:hover { transform: none; }
}
</style>
