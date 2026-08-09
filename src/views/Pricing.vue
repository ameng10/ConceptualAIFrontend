<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowUpRight, Check, Coins, Loader2 } from 'lucide-vue-next'
import TierBadge from '../components/TierBadge.vue'
import { useBilling } from '../composables/useBilling'
import {
  fetchPublicPricing,
  type PublicPricing,
  cancelSubscription,
  startCreditCheckout,
  startPlanCheckout,
  type Tier,
} from '../services/billing-api'

/**
 * The pricing page.
 *
 * It exists because the Billing policy points at it for the four material terms of the
 * deal — price, included credits, per-app size limit and weekly planning turns — and
 * until now none of them were published anywhere. A policy that references a page that
 * does not exist reads in the customer's favour in any dispute.
 *
 * The ladder is fetched from the server rather than hardcoded, so this page cannot
 * drift from what the gates actually enforce.
 */
const { billing, load, refresh, tier: currentTier } = useBilling()
/** The ladder comes from the PUBLIC endpoint so the page works logged out. The
 *  authenticated read is layered on top only to highlight the visitor's current plan. */
const publicPricing = ref<PublicPricing | null>(null)
const loadError = ref<string | null>(null)
const busyTier = ref<Tier | null>(null)
const buyingCredits = ref(false)
const failed = ref<string | null>(null)
import PurchaseConsent from '@/components/PurchaseConsent.vue'

const creditQty = ref(10)

/** Gates every purchase button on this page — see PurchaseConsent.vue. */
const acknowledged = ref(false)

/** The published label for a tier, from the ladder the server sent. */
function tierLabel(t: Tier): string {
  return tiers.value.find((x) => x.tier === t)?.label ?? t
}

/** Set when a plan change was applied in place, so the page can say so. */
const planChanged = ref<Tier | null>(null)
/** An emptied number input yields null, which the server rejects. Snap it back rather
 *  than posting a request that can only be refused. */
function normalizeQty() {
  const n = Number(creditQty.value)
  creditQty.value = Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1
}

onMounted(async () => {
  try {
    publicPricing.value = await fetchPublicPricing()
  } catch (e) {
    loadError.value = "We couldn't load prices just now. Please refresh."
    console.error('[pricing] failed to load ladder', e)
  }
  // Best-effort: only decides which card is marked "Your plan".
  load()
})

const tiers = computed(() => publicPricing.value?.tiers ?? [])
const creditPrice = computed(() => publicPricing.value?.creditPriceUsd ?? null)
const creditTotal = computed(() =>
  creditPrice.value === null
    ? null
    : `$${(creditQty.value * creditPrice.value).toFixed(2).replace(/\.00$/, '')}`,
)

const cancelled = ref(false)

async function choose(t: Tier) {
  // Cancelling is not a purchase, so it needs no acknowledgement.
  if (busyTier.value || (t !== 'free' && !acknowledged.value)) return
  busyTier.value = t
  failed.value = null
  cancelled.value = false
  try {
    if (t === 'free') {
      // Choosing Free IS cancelling — there is nothing to buy and no redirect.
      await cancelSubscription()
      cancelled.value = true
      await refresh()
      return
    }
    const { url, changed, error } = await startPlanCheckout(t)
    if (changed) {
      // Applied in place on the existing subscription — no Stripe page to visit.
      planChanged.value = t
      await refresh()
      return
    }
    if (!url) throw new Error(error || 'checkout unavailable')
    window.location.assign(url)
  } catch (e) {
    failed.value = t === 'free'
      ? "We couldn't cancel just now. Please try again, or email admin@conceptual-ai.app."
      : "We couldn't open checkout just now. Nothing was charged — please try again."
    console.error('[pricing] plan change failed', e)
  } finally {
    busyTier.value = null
  }
}

async function buyCredits() {
  if (buyingCredits.value || !acknowledged.value) return
  buyingCredits.value = true
  failed.value = null
  try {
    const { url, error } = await startCreditCheckout(creditQty.value)
    if (!url) throw new Error(error || 'checkout unavailable')
    window.location.assign(url)
  } catch (e) {
    failed.value = "We couldn't open checkout just now. Nothing was charged — please try again."
    console.error('[pricing] credit checkout failed', e)
  } finally {
    buyingCredits.value = false
  }
}
</script>

<template>
  <div class="pricing">
    <header class="page-head">
      <h1>Plans and credits</h1>
      <p class="lede">
        Every build is quoted in credits before it runs, and that quote is what you pay.
        A plan adds a monthly credit allowance and raises the size of app you can build.
      </p>
    </header>

    <p v-if="loadError" class="failed">{{ loadError }}</p>
    <p v-if="cancelled" class="cancelled">
      Your plan is cancelled. You keep access and your remaining plan credits until the
      end of the current billing period, and you won't be charged again.
    </p>
    <p v-if="failed" class="failed">{{ failed }}</p>
    <p v-if="planChanged" class="cancelled">
      Your plan is now <strong>{{ tierLabel(planChanged) }}</strong>. The change took
      effect immediately and the difference is prorated onto your next invoice.
    </p>

    <PurchaseConsent v-model="acknowledged" class="consent glass" />

    <!-- Credits first: you do not need a subscription to start, and saying so up front
         is more honest than leading with the most expensive option. -->
    <section class="credits-card glass">
      <div class="credits-copy">
        <h2><Coins :size="18" /> Buy credits</h2>
        <p>
          No subscription needed. Credits last 12 months from your most recent payment
          and are spent when you approve a build.
        </p>
        <!-- Said BEFORE the purchase. On Free the only buildable size is the minimum, so
             buying 100 credits without knowing that is money that cannot be spent. -->
        <p v-if="billing && billing.tier === 'free'" class="ceiling-warn">
          On Free you can build apps up to
          <strong>{{ billing.maxCreditsPerApp }} credits</strong>. Credits alone don't
          raise that — a plan does.
        </p>
      </div>
      <div class="credits-buy">
        <label class="qty">
          <span class="qty-label">Credits</span>
          <input v-model.number="creditQty" type="number" min="1" max="1000" @blur="normalizeQty" />
        </label>
        <button
          class="btn btn-primary"
          :disabled="buyingCredits || !acknowledged"
          @click="buyCredits"
        >
          <Loader2 v-if="buyingCredits" :size="17" class="spin" />
          <span>Buy {{ creditQty }} {{ creditQty === 1 ? 'credit' : 'credits' }}</span>
          <span v-if="creditTotal" class="total">{{ creditTotal }}</span>
        </button>
        <p v-if="creditPrice !== null" class="unit">${{ creditPrice }} per credit</p>
      </div>
    </section>

    <section class="tiers">
      <article
        v-for="t in tiers"
        :key="t.tier"
        class="tier-card glass"
        :class="{ current: billing !== null && t.tier === currentTier }"
      >
        <div class="tier-top">
          <TierBadge :tier="t.tier" size="md" />
          <span v-if="billing !== null && t.tier === currentTier" class="current-pill">Your plan</span>
        </div>

        <p class="price">
          <template v-if="t.monthlyPriceUsd === 0">Free</template>
          <template v-else>
            <span v-if="t.priceFrom" class="from">from </span>${{ t.monthlyPriceUsd }}<span class="per">/mo</span>
          </template>
        </p>

        <ul class="features">
          <li>
            <Check :size="15" />
            <span>
              Apps up to
              <strong>{{ t.maxCreditsPerApp === null ? 'any size' : `${t.maxCreditsPerApp} credits` }}</strong>
            </span>
          </li>
          <li>
            <Check :size="15" />
            <span>
              <strong>{{ t.includedCredits === 0 ? 'No' : t.includedCredits }}</strong>
              credits included each month
            </span>
          </li>
          <li>
            <Check :size="15" />
            <span>
              <strong>{{ t.plansPerWeek === null ? 'Unlimited' : t.plansPerWeek }}</strong>
              planning turns per week
            </span>
          </li>
        </ul>

        <button
          v-if="t.selfServe && t.monthlyPriceUsd > 0 && t.tier !== currentTier"
          class="btn btn-primary"
          :disabled="busyTier !== null || !acknowledged"
          @click="choose(t.tier)"
        >
          <Loader2 v-if="busyTier === t.tier" :size="17" class="spin" />
          <span>Choose {{ t.label }}</span>
        </button>
        <!-- On a paid plan, the Free card is how you leave. -->
        <button
          v-else-if="t.tier === 'free' && billing?.subscriptionStatus"
          class="btn btn-ghost"
          :disabled="busyTier !== null"
          @click="choose('free')"
        >
          <Loader2 v-if="busyTier === 'free'" :size="17" class="spin" />
          <span>Cancel my plan</span>
        </button>
        <a
          v-else-if="!t.selfServe"
          class="btn btn-ghost"
          :href="`mailto:admin@conceptual-ai.app?subject=${t.label} plan`"
        >
          <span>Contact us</span>
          <ArrowUpRight :size="16" />
        </a>
        <p v-else-if="t.monthlyPriceUsd === 0" class="no-cta">
          No payment method needed
        </p>
      </article>
    </section>

    <!-- The acknowledgement Stripe's checkout cannot carry. Sits above the buttons it
         gates, so it is read before anything is bought rather than after. -->

    <!-- AUTO-RENEWAL DISCLOSURE. This has to be clear and conspicuous BEFORE billing
         details are taken — ROSCA and a number of US state statutes require it, and
         burying it in the Terms does not satisfy that. It sits directly under the
         buttons that start a subscription. -->
    <section class="renewal glass">
      <h2>Before you subscribe</h2>
      <ul>
        <li>
          <strong>Plans renew automatically.</strong> Your card is charged the same
          amount on the same day each month until you cancel. We email you before each
          renewal.
        </li>
        <li>
          <strong>Cancel any time</strong> from your billing page or by emailing
          <a href="mailto:admin@conceptual-ai.app">admin@conceptual-ai.app</a>.
          Cancellation takes effect at the end of the current billing period and stops
          all future charges.
        </li>
        <li>
          <strong>Monthly credits do not roll over.</strong> Each payment resets that
          month's allowance; whatever is unused expires at the end of the period.
          Credits you buy outright are separate and last 12 months.
        </li>
        <li>
          <strong>Purchases are final.</strong> Approving a build charges it, and a run
          that has started is charged even if you cancel it. If a build fails to
          deliver we re-run it free. See the
          <a href="/refunds">Billing &amp; Refund Policy</a>.
        </li>
      </ul>
      <p class="mor">
        Payments are processed by Stripe, which acts as the merchant of record and
        appears on your statement. Your purchase receipt comes from them.
      </p>
    </section>
  </div>
</template>

<style scoped>
.pricing { max-width: 78rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }

.page-head { text-align: center; margin-bottom: 2rem; }
.page-head h1 { margin: 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.02em; }
.lede {
  max-width: 40rem;
  margin: 0.75rem auto 0;
  color: var(--text-dim);
  line-height: 1.6;
}

.cancelled {
  max-width: 34rem;
  margin: 0 auto 1.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
  text-align: center;
  font-size: 0.875rem;
}

.failed {
  max-width: 34rem;
  margin: 0 auto 1.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--error) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 35%, transparent);
  color: var(--error);
  text-align: center;
}

.credits-card {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  margin-bottom: 2rem;
}
.credits-copy { flex: 1 1 20rem; }
.credits-copy h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 800;
}
.credits-copy p { margin: 0.5rem 0 0; color: var(--text-dim); font-size: 0.875rem; line-height: 1.55; }

.ceiling-warn {
  margin: 0.625rem 0 0;
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  background: var(--await-bg);
  border: 1px solid color-mix(in srgb, var(--await) 35%, transparent);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text);
}

.credits-buy { display: grid; gap: 0.5rem; justify-items: stretch; min-width: 15rem; }
.qty { display: flex; align-items: center; gap: 0.625rem; }
.qty-label { font-size: 0.8125rem; color: var(--text-dim); }
.qty input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text);
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
}
.total {
  margin-left: 0.25rem;
  padding: 0.1875rem 0.5rem;
  border-radius: 999px;
  background: rgba(4, 18, 26, 0.2);
  font-size: 0.875rem;
}
.unit { margin: 0; font-size: 0.78125rem; color: var(--text-dim); text-align: center; }

.tiers {
  display: grid;
  /* EXPLICIT five columns, not auto-fit. auto-fit drops a card to the next row the
     moment the container is one pixel narrower than 5 x min-width + gaps, and the
     container here is the viewport minus the sidebar — so the breakpoint was luck.
     `minmax(0, 1fr)` lets the columns shrink instead of wrapping, which is what keeps
     Unlimited on the same row as the ladder it belongs to. */
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 2rem;
}

/* Below desktop, wrap deliberately rather than squeezing five unreadable columns. */
@media (max-width: 1180px) {
  .tiers { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
}
@media (max-width: 760px) {
  .tiers { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 480px) {
  .tiers { grid-template-columns: 1fr; }
}
.tier-card {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 0.875rem;
  padding: 1.25rem;
  min-width: 0;
}
.tier-card.current { border-color: var(--primary); }
.tier-top { display: flex; align-items: center; justify-content: space-between; gap: 0.375rem; flex-wrap: wrap; }
.current-pill {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary);
}
.price { margin: 0; font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; }
.from { font-size: 0.875rem; font-weight: 600; color: var(--text-dim); }
.per { font-size: 0.875rem; font-weight: 600; color: var(--text-dim); }

.features { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.5rem; align-content: start; }
.features li {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.875rem;
  color: var(--text-dim);
  line-height: 1.45;
}
.features svg { flex: none; margin-top: 0.125rem; color: var(--primary); }
.features strong { color: var(--text); }
.no-cta {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  font-size: 0.8125rem;
  color: var(--text-dim);
  text-align: center;
}

.consent {
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

.renewal { padding: 1.5rem; }
.renewal h2 { margin: 0 0 0.875rem; font-size: 1rem; font-weight: 800; }
.renewal ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.75rem; }
.renewal li { font-size: 0.875rem; line-height: 1.55; color: var(--text-dim); }
.renewal strong { color: var(--text); }
.renewal a { color: var(--primary); }
.mor {
  margin: 1rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.8125rem;
  color: var(--text-dim);
  line-height: 1.5;
}

.btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 2.75rem; text-decoration: none; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
