<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowUpRight, Coins, Loader2, ShieldAlert, Sparkles, TrendingUp } from 'lucide-vue-next'
import TierBadge from './TierBadge.vue'
import { useBilling } from '../composables/useBilling'
import type { Tier } from '../services/billing-api'

/**
 * The refusal interstitial. Renders the server's DECISION — it never recomputes one.
 *
 * Guiding rule: a refusal is a bad moment, so it must leave the user knowing what
 * happened, that they were not charged, and what the CHEAPEST way forward is. The
 * expensive option must never be the only one on offer.
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

const props = defineProps<{ refusal: BillingRefusal; busy?: boolean; failed?: string | null }>()
import PurchaseConsent from './PurchaseConsent.vue'

/** The Art. 16(m) acknowledgement. Both money buttons in this dialog are purchase entry
 *  points in their own right, so they need it exactly as /pricing does — a refused user
 *  buying from here must not reach Stripe on a weaker consent than one who came the long
 *  way round. See PurchaseConsent.vue for why it cannot live on Stripe's checkbox. */
const acknowledged = ref(false)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'buy', credits: number): void
  (e: 'upgrade', tier: Tier): void
}>()

const { billing } = useBilling()
const headingEl = ref<HTMLElement | null>(null)
const dialogEl = ref<HTMLElement | null>(null)
const headingId = `refusal-h-${Math.random().toString(36).slice(2, 8)}`

const shortfall = computed(() => Math.max(0, props.refusal.shortfall ?? 0))

/** Pluralised in a computed, NOT with an inline span: `.cta` is a flex row, so a
 *  `<span>s</span>` becomes its own flex item with a gap before it — rendering
 *  "7 credit  s" and reading aloud as "credit s". */
const creditWord = computed(() => (shortfall.value === 1 ? 'credit' : 'credits'))

/** Price comes from the server or not at all. A hardcoded fallback would put an
 *  invented number on a button that starts a charge, pixel-identical to the real one. */
const priceUsd = computed(() => billing.value?.creditPriceUsd ?? null)
const shortfallCost = computed(() =>
  priceUsd.value === null
    ? null
    : `$${(shortfall.value * priceUsd.value).toFixed(2).replace(/\.00$/, '')}`,
)

const suggested = computed(() => {
  const t = props.refusal.suggestedTier
  if (!t) return null
  return billing.value?.tiers.find((x) => x.tier === t) ?? null
})

const fillPct = computed(() => {
  const need = props.refusal.credits ?? 0
  const have = props.refusal.balance ?? 0
  if (need <= 0) return 100
  return Math.max(2, Math.min(100, (have / need) * 100))
})

/** Honest ratio. The number now sits OUTSIDE the bar, so the floor only has to keep a
 *  sliver visible (2%) instead of reserving room for text (18%) — at ceiling 3 against
 *  400 credits the old floor drew a bar 24x wider than the truth. */
const ceilingPct = computed(() => {
  const need = props.refusal.credits ?? 0
  const ceil = props.refusal.ceiling ?? 0
  if (need <= 0 || ceil <= 0) return 2
  return Math.max(2, Math.min(100, (ceil / need) * 100))
})

const resetsIn = computed(() => {
  if (!props.refusal.resetsAt) return null
  const ms = new Date(props.refusal.resetsAt).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return 'shortly'
  // CEIL, not floor: a reset exactly 4 days away is "in 4 days", not "in 3".
  const days = Math.ceil(ms / 86_400_000)
  if (days > 1) return `in ${days} days`
  const hours = Math.max(1, Math.ceil(ms / 3_600_000))
  return hours >= 24 ? 'in 1 day' : `in ${hours} hour${hours === 1 ? '' : 's'}`
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  // Minimal focus trap. `aria-modal="true"` promises the rest of the page is inert;
  // without this, Tab walks straight back out into the page behind.
  if (e.key !== 'Tab' || !dialogEl.value) return
  const focusable = dialogEl.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

let previouslyFocused: HTMLElement | null = null
onMounted(() => {
  previouslyFocused = document.activeElement as HTMLElement | null
  headingEl.value?.focus()
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  previouslyFocused?.focus?.()
})
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div
      ref="dialogEl"
      class="modal glass fade-in refusal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="headingId"
    >
      <!-- ── Not enough credits ─────────────────────────────────────────── -->
      <template v-if="refusal.reason === 'insufficient_credits'">
        <header class="head">
          <span class="icon-wrap amber"><Coins :size="20" /></span>
          <div class="head-text">
            <h3 :id="headingId" ref="headingEl" tabindex="-1">
              You need {{ shortfall }} more {{ creditWord }}
            </h3>
            <p class="reassure">Nothing has been charged. Your plan and design are saved.</p>
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

        <div class="actions">
          <PurchaseConsent v-model="acknowledged" compact class="consent-gate" />
          <button
            class="btn btn-primary money"
            :disabled="busy || !acknowledged"
            @click="emit('buy', shortfall)"
          >
            <Loader2 v-if="busy" :size="17" class="spin" />
            <Coins v-else :size="17" />
            <span>Buy {{ shortfall }} {{ creditWord }}</span>
            <span v-if="shortfallCost" class="cta-price">{{ shortfallCost }}</span>
          </button>
          <p v-if="failed" class="failed">{{ failed }}</p>
          <p class="footnote">
            <template v-if="priceUsd !== null">Credits are ${{ priceUsd }} each and last 12 months. </template>
            A monthly plan includes credits and lifts your app-size limit —
            <router-link to="/pricing" @click="emit('close')">see plans</router-link>.
          </p>
        </div>
      </template>

      <!-- ── App is bigger than the tier allows ─────────────────────────── -->
      <template v-else-if="refusal.reason === 'exceeds_tier_ceiling'">
        <header class="head">
          <span class="icon-wrap violet"><TrendingUp :size="20" /></span>
          <div class="head-text">
            <h3 :id="headingId" ref="headingEl" tabindex="-1">
              This app is bigger than your plan builds
            </h3>
            <p class="reassure">Nothing has been charged. Your plan and design are saved.</p>
          </div>
        </header>

        <!-- The lesson comes BEFORE the comparison, at readable size. Without it the
             two bars teach "your plan is small", which a user can rationally answer by
             buying credits — the one thing that does not help. -->
        <p class="lesson">
          <Sparkles :size="15" />
          Buying more credits won't lift this limit. The size limit is what a plan
          raises.
        </p>

        <div class="size-compare">
          <div class="size-row">
            <span class="size-label">This app</span>
            <span class="size-track"><span class="size-bar over" /></span>
            <span class="size-num">{{ refusal.credits }}</span>
          </div>
          <div class="size-row">
            <span class="size-label">Your limit</span>
            <span class="size-track">
              <span class="size-bar within" :style="{ width: ceilingPct + '%' }" />
            </span>
            <span class="size-num">{{ refusal.ceiling }}</span>
          </div>
        </div>

        <div class="actions">
          <!-- Cheapest option FIRST. Trimming the design costs nothing, and burying it
               under a $299 button reads as a squeeze rather than as help. -->
          <button class="btn btn-ghost" @click="emit('close')">
            Trim the design instead
          </button>

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
              <li><strong>{{ suggested.includedCredits }}</strong> credits included each month</li>
              <li><strong>{{ suggested.plansPerWeek ?? 'Unlimited' }}</strong> planning turns per week</li>
            </ul>
            <PurchaseConsent
              v-if="suggested.selfServe"
              v-model="acknowledged"
              compact
              class="consent-gate"
            />
            <button
              v-if="suggested.selfServe"
              class="btn btn-primary money"
              :disabled="busy || !acknowledged"
              @click="emit('upgrade', suggested.tier)"
            >
              <Loader2 v-if="busy" :size="17" class="spin" />
              <span>Upgrade to {{ suggested.label }}</span>
              <ArrowUpRight v-if="!busy" :size="17" />
            </button>
            <a v-else class="btn btn-primary money" href="mailto:admin@conceptual-ai.app?subject=Unlimited plan">
              <span>Contact us about {{ suggested.label }}</span>
              <ArrowUpRight :size="17" />
            </a>
            <p class="renewal-note">Renews monthly until you cancel. Cancel any time.</p>
          </div>

          <!-- Ladder unavailable: still give a way forward rather than a dead end. -->
          <router-link v-else class="btn btn-primary money" to="/pricing" @click="emit('close')">
            <span>See plans that fit this app</span>
            <ArrowUpRight :size="17" />
          </router-link>

          <p v-if="failed" class="failed">{{ failed }}</p>
        </div>
      </template>

      <!-- ── Weekly planning quota ──────────────────────────────────────── -->
      <template v-else-if="refusal.reason === 'plan_quota_exhausted'">
        <header class="head">
          <span class="icon-wrap amber"><Sparkles :size="20" /></span>
          <div class="head-text">
            <h3 :id="headingId" ref="headingEl" tabindex="-1">
              You've used this week's planning turns
            </h3>
            <p class="reassure">
              Nothing has been charged. {{ refusal.used }} of {{ refusal.limit }} used<template
                v-if="resetsIn"
              >, another frees up {{ resetsIn }}</template>.
            </p>
          </div>
        </header>

        <p class="body">
          Creating a plan, changing one, answering its questions and iterating each use a
          turn. Planning runs our most expensive models, which is why it's counted
          separately from credits.
        </p>

        <div class="actions">
          <router-link class="btn btn-primary money" to="/pricing" @click="emit('close')">
            <span>See plans with more turns</span>
            <ArrowUpRight :size="17" />
          </router-link>
        </div>
      </template>

      <!-- ── Account on hold ────────────────────────────────────────────── -->
      <!-- Matched by NAME. A bare v-else labelled every unrecognised reason "your
           account is on hold", which would be a frightening and false thing to tell
           someone whose account is fine. -->
      <template v-else-if="refusal.reason === 'account_frozen'">
        <header class="head">
          <span class="icon-wrap red"><ShieldAlert :size="20" /></span>
          <div class="head-text">
            <h3 :id="headingId" ref="headingEl" tabindex="-1">Your account is on hold</h3>
            <p class="reassure">
              A refund or payment dispute is under review. Your projects and credits are
              intact.
            </p>
          </div>
        </header>

        <p class="body">
          Builds are paused while we look into it. Email us and we'll normally have it
          sorted within two business days — see the
          <a href="/refunds">Billing &amp; Refund Policy</a> for how reversals work.
        </p>

        <div class="actions">
          <a class="btn btn-ghost" href="mailto:admin@conceptual-ai.app?subject=Account on hold">
            Email admin@conceptual-ai.app
          </a>
        </div>
      </template>

      <!-- Genuine fallback: honest about not knowing, and still actionable. -->
      <template v-else>
        <header class="head">
          <span class="icon-wrap amber"><ShieldAlert :size="20" /></span>
          <div class="head-text">
            <h3 :id="headingId" ref="headingEl" tabindex="-1">We couldn't start this build</h3>
            <p class="reassure">Nothing has been charged. Your design is saved.</p>
          </div>
        </header>
        <p class="body">
          Something about your account blocked this build and we can't say more from
          here. Email us and we'll tell you exactly what happened.
        </p>
        <div class="actions">
          <a class="btn btn-ghost" href="mailto:admin@conceptual-ai.app?subject=Build blocked">
            Email admin@conceptual-ai.app
          </a>
        </div>
      </template>

      <button class="dismiss" @click="emit('close')">
        {{ refusal.reason === 'account_frozen' ? 'Close' : 'Not now' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Overlay matches the app's other modals: same scrim, same z-index (1000 — at 100 a
   ClarificationDialog rendered in the same template could paint over this one), and
   scrollable so a tall dialog is never clipped on a short viewport. */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 440px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}

.head { display: flex; gap: 1rem; align-items: flex-start; }
.head-text { min-width: 0; }
.head h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.3;
  outline: none;
}

/* "Nothing has been charged" is the user's first question. It leads the subtitle and
   is not dimmed into the background. */
.reassure {
  margin: 0.375rem 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text);
  opacity: 0.85;
}

.body { margin: 0; font-size: 0.875rem; line-height: 1.55; color: var(--text-dim); }
.body a { color: var(--primary); }

.icon-wrap {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
}
.icon-wrap.amber { background: var(--await-bg); color: var(--await); }
.icon-wrap.violet { background: var(--tone-violet-bg); color: var(--tone-violet); }
.icon-wrap.red { background: color-mix(in srgb, var(--error) 15%, transparent); color: var(--error); }

.lesson {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0;
  padding: 0.75rem 0.875rem;
  border-radius: 0.75rem;
  border: 1px solid var(--tone-violet-border);
  background: var(--tone-violet-bg);
  color: var(--text);
  font-size: 0.875rem;
  line-height: 1.45;
}
.lesson svg { flex: none; margin-top: 0.125rem; color: var(--tone-violet); }

.gauge { display: grid; gap: 0.5rem; }
.gauge-track {
  height: 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text) 9%, transparent);
  overflow: hidden;
}
.gauge-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--await), var(--tone-gold));
  transition: width 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
.gauge-legend {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78125rem;
  color: var(--text-dim);
}
.gauge-legend strong { color: var(--text); font-variant-numeric: tabular-nums; }

/* Both rows share one grid so the bars start at the same x and sit on one scale —
   two bars with different label treatments do not invite comparison. */
.size-compare { display: grid; gap: 0.625rem; }
.size-row {
  display: grid;
  grid-template-columns: 5.25rem 1fr 2.5rem;
  align-items: center;
  gap: 0.625rem;
}
.size-label { font-size: 0.78125rem; color: var(--text-dim); }
.size-track {
  height: 1.5rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--text) 7%, transparent);
  overflow: hidden;
}
.size-bar { display: block; height: 100%; border-radius: 0.5rem; }
.size-bar.over {
  width: 100%;
  background: linear-gradient(90deg, var(--tone-violet-bg), var(--tone-violet));
}
.size-bar.within { background: color-mix(in srgb, var(--text) 26%, transparent); }
.size-num {
  font-weight: 800;
  font-size: 0.875rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.actions { display: grid; gap: 0.75rem; }

/* The app's own primary button, not a bespoke one — a lookalike diverged badly in
   light theme, rendering flat green where every other primary is a gradient. */
.money {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 3rem;
  text-decoration: none;
}
.cta-price {
  margin-left: 0.25rem;
  padding: 0.1875rem 0.5rem;
  border-radius: 999px;
  background: rgba(4, 18, 26, 0.2);
  font-size: 0.875rem;
}
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.upgrade-card {
  display: grid;
  gap: 0.875rem;
  padding: 1rem;
  border-radius: 0.875rem;
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--text) 4%, transparent);
}
.upgrade-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.upgrade-price { font-weight: 800; font-size: 1.125rem; }
.per { font-size: 0.78125rem; font-weight: 600; color: var(--text-dim); }
.upgrade-points {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.4375rem;
  font-size: 0.875rem;
  color: var(--text-dim);
}
.upgrade-points strong { color: var(--text); }

/* Auto-renewal has to be visible at the point of commitment, not only in the Terms. */
.renewal-note {
  margin: 0;
  font-size: 0.78125rem;
  color: var(--text-dim);
  text-align: center;
}

.footnote {
  margin: 0;
  font-size: 0.78125rem;
  line-height: 1.5;
  color: var(--text-dim);
  text-align: center;
}
.footnote a { color: var(--primary); }

.failed {
  margin: 0;
  padding: 0.625rem 0.75rem;
  border-radius: 0.625rem;
  background: color-mix(in srgb, var(--error) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 35%, transparent);
  color: var(--error);
  font-size: 0.8125rem;
  text-align: center;
}

.dismiss {
  width: 100%;
  padding: 0.625rem;
  border: none;
  background: none;
  color: var(--text-dim);
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 0.625rem;
}
.dismiss:hover { color: var(--text); background: color-mix(in srgb, var(--text) 6%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .gauge-fill { transition: none; }
  .spin { animation: none; }
}

@media (max-width: 400px) {
  .modal { padding: 1.5rem; }
  .size-row { grid-template-columns: 4.25rem 1fr 2.25rem; }
}
</style>

<style scoped>
/* Sits directly above the button it gates, so it is read before the spend, not after. */
.consent-gate {
  margin-bottom: 0.875rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  background: color-mix(in srgb, var(--surface) 60%, transparent);
}
</style>
