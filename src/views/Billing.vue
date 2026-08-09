<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowUpRight, CreditCard, ExternalLink, Loader2 } from 'lucide-vue-next'
import TierBadge from '../components/TierBadge.vue'
import { useBilling } from '../composables/useBilling'
import { cancelSubscription, openBillingPortal, verifyCheckoutSession } from '../services/billing-api'

/** Balance, plan, and the one link that manages the subscription. Card management is
 *  deliberately Stripe's hosted portal: card details must never touch our origin, and
 *  Stripe already handles proration, dunning and invoice history correctly. */
const route = useRoute()
const { billing, load, refresh, loading } = useBilling()
const portalBusy = ref(false)
const failed = ref<string | null>(null)

/** Returning from Checkout, the webhook may not have landed yet, so the first read can
 *  still show the old balance. Refresh once on arrival rather than showing a stale
 *  number next to "payment successful". */
const justPaid = computed(() => route.query.checkout === 'success')

const settling = ref(false)
const settleFailed = ref(false)

/**
 * Returning from Checkout. A single delayed refresh assumed the webhook always wins the
 * race; when it does not, the page said "payment received" beside a stale balance with
 * no way forward. Now we ASK Stripe directly (idempotent), then poll a few times with
 * backoff, and admit it if the balance still has not moved.
 */
async function settleReturn() {
  const sessionId = String(route.query.session_id ?? '')
  settling.value = true
  settleFailed.value = false
  const before = billing.value?.credits ?? 0
  try {
    if (sessionId) await verifyCheckoutSession(sessionId)
  } catch (e) {
    console.error('[billing] verify failed', e)
  }
  for (const wait of [800, 1600, 3000, 5000]) {
    await new Promise((r) => setTimeout(r, wait))
    await refresh()
    if ((billing.value?.credits ?? 0) !== before) {
      settling.value = false
      return
    }
  }
  settling.value = false
  settleFailed.value = true
}

onMounted(async () => {
  await load()
  if (justPaid.value) await settleReturn()
})

const expiry = computed(() => {
  const iso = billing.value?.nextExpiryAt
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
})

const cancelBusy = ref(false)
const cancelConfirm = ref(false)
const cancelled = ref(false)

async function doCancel() {
  if (cancelBusy.value) return
  cancelBusy.value = true
  failed.value = null
  try {
    await cancelSubscription()
    cancelled.value = true
    cancelConfirm.value = false
    await refresh()
  } catch (e) {
    failed.value = "We couldn't cancel just now. Please try again, or email admin@conceptual-ai.app."
    console.error('[billing] cancel failed', e)
  } finally {
    cancelBusy.value = false
  }
}

async function manage() {
  if (portalBusy.value) return
  portalBusy.value = true
  failed.value = null
  try {
    const { url } = await openBillingPortal()
    window.location.assign(url)
  } catch (e) {
    failed.value =
      "We couldn't open the billing portal. If you don't have a subscription yet, choose a plan first."
    console.error('[billing] portal failed', e)
  } finally {
    portalBusy.value = false
  }
}
</script>

<template>
  <div class="billing">
    <header class="page-head">
      <h1>Billing</h1>
    </header>

    <p v-if="justPaid && !settleFailed" class="paid">
      <Loader2 v-if="settling" :size="15" class="spin" />
      {{ settling ? 'Payment received — confirming your balance…' : 'Payment received — thank you.' }}
    </p>
    <p v-else-if="settleFailed" class="warn-note">
      Your payment went through, but the balance hasn't updated yet. This usually clears
      within a minute or two and nothing is lost.
      <button class="inline-btn" @click="settleReturn">Check again</button>
      — or email <a href="mailto:admin@conceptual-ai.app">admin@conceptual-ai.app</a>.
    </p>
    <p v-if="route.query.checkout === 'cancelled'" class="note-banner">
      Checkout cancelled — you haven't been charged.
    </p>

    <p v-if="billing?.inGrace" class="warn-note">
      <strong>Your last payment failed.</strong> We're retrying your card. You keep your
      plan's limits for a few days
      <template v-if="billing.graceEndsAt">
        (until {{ new Date(billing.graceEndsAt).toLocaleDateString() }})</template>,
      then the account drops to Free until payment succeeds.
      <button class="inline-btn" :disabled="portalBusy" @click="manage">Update card</button>
    </p>
    <p v-else-if="billing?.cancelAtPeriodEnd" class="note-banner">
      Your plan is cancelled and ends
      <template v-if="billing.currentPeriodEnd">
        on {{ new Date(billing.currentPeriodEnd).toLocaleDateString() }}</template>.
      You keep access and your remaining plan credits until then.
    </p>
    <p v-if="failed" class="failed">{{ failed }}</p>

    <div v-if="loading && !billing" class="loading"><Loader2 :size="20" class="spin" /> Loading…</div>

    <template v-else-if="billing">
      <section v-if="billing.frozen" class="hold glass">
        <h2>Your account is on hold</h2>
        <p>
          A refund or payment dispute is under review, so builds are paused. Your
          projects and credits are intact. Email
          <a href="mailto:admin@conceptual-ai.app">admin@conceptual-ai.app</a> and we'll
          sort it out.
        </p>
      </section>

      <div class="cards">
        <section class="card glass">
          <h2>Credits</h2>
          <p class="big">{{ billing.credits }}</p>
          <ul class="split">
            <li>
              <span>From your plan</span>
              <strong>{{ billing.subscriptionCredits }}</strong>
            </li>
            <li>
              <span>Purchased</span>
              <strong>{{ billing.purchasedCredits }}</strong>
            </li>
          </ul>
          <p v-if="expiry" class="note">Soonest to expire: {{ expiry }}</p>
          <p class="note">
            Plan credits reset each period and don't roll over. Purchased credits last
            12 months from your most recent payment.
          </p>
          <router-link class="btn btn-primary" to="/pricing">
            <span>Buy credits</span>
            <ArrowUpRight :size="16" />
          </router-link>
        </section>

        <section class="card glass">
          <h2>Plan</h2>
          <p class="plan-row">
            <TierBadge :tier="billing.tier" size="md" />
          </p>
          <ul class="split">
            <li>
              <span>Largest app</span>
              <strong>
                {{ billing.maxCreditsPerApp === null ? 'Any size' : `${billing.maxCreditsPerApp} credits` }}
              </strong>
            </li>
            <li>
              <span>Planning turns this week</span>
              <strong>
                {{ billing.plansUsed }}<template v-if="billing.plansLimit !== null"> / {{ billing.plansLimit }}</template>
              </strong>
            </li>
            <li v-if="billing.includedCredits > 0">
              <span>Credits each month</span>
              <strong>{{ billing.includedCredits }}</strong>
            </li>
          </ul>

          <template v-if="billing.subscriptionStatus">
            <button class="btn btn-ghost" :disabled="portalBusy" @click="manage">
              <Loader2 v-if="portalBusy" :size="16" class="spin" />
              <CreditCard v-else :size="16" />
              <span>Manage subscription</span>
              <ExternalLink :size="14" />
            </button>
            <p class="note">
              Renews automatically each month until cancelled. Update your card or see
              invoices in the portal.
            </p>

            <p v-if="cancelled" class="cancel-done">
              Cancelled. You keep access and your remaining plan credits until the end of
              this billing period, and you won't be charged again.
            </p>
            <template v-else-if="!cancelConfirm">
              <button class="link-danger" @click="cancelConfirm = true">Cancel plan</button>
            </template>
            <div v-else class="confirm">
              <p class="note">
                Cancel at the end of this billing period? You keep access and your
                remaining plan credits until then. Credits you bought outright are not
                affected.
              </p>
              <div class="confirm-actions">
                <button class="btn btn-ghost" @click="cancelConfirm = false">Keep plan</button>
                <button class="btn btn-danger" :disabled="cancelBusy" @click="doCancel">
                  <Loader2 v-if="cancelBusy" :size="16" class="spin" />
                  <span>Cancel plan</span>
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <router-link class="btn btn-primary" to="/pricing">
              <span>See plans</span>
              <ArrowUpRight :size="16" />
            </router-link>
            <p class="note">You don't have a subscription. Credits work without one.</p>
          </template>
        </section>
      </div>

      <p class="links">
        <a href="/refunds">Billing &amp; Refund Policy</a>
        <span aria-hidden="true">·</span>
        <a href="/terms">Terms of Service</a>
      </p>
    </template>
  </div>
</template>

<style scoped>
.billing { max-width: 56rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
.page-head h1 { margin: 0 0 1.5rem; font-size: 2rem; font-weight: 900; letter-spacing: -0.02em; }

.loading { display: flex; align-items: center; gap: 0.5rem; color: var(--text-dim); }

.paid, .failed {
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  margin-bottom: 1.25rem;
  font-size: 0.875rem;
}
.paid {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
  color: var(--text);
}
.failed {
  background: color-mix(in srgb, var(--error) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 35%, transparent);
  color: var(--error);
}

.warn-note, .note-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  margin-bottom: 1.25rem;
  font-size: 0.875rem;
  line-height: 1.5;
}
.warn-note {
  background: var(--await-bg);
  border: 1px solid color-mix(in srgb, var(--await) 40%, transparent);
}
.note-banner {
  background: color-mix(in srgb, var(--text) 6%, transparent);
  border: 1px solid var(--border);
  color: var(--text-dim);
}
.inline-btn {
  border: none;
  background: none;
  padding: 0;
  color: var(--primary);
  font-size: 0.875rem;
  text-decoration: underline;
  cursor: pointer;
}

.hold { padding: 1.25rem; margin-bottom: 1.25rem; border-color: color-mix(in srgb, var(--error) 40%, transparent); }
.hold h2 { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 800; color: var(--error); }
.hold p { margin: 0; font-size: 0.875rem; line-height: 1.55; color: var(--text-dim); }
.hold a { color: var(--primary); }

.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); gap: 1rem; }
.card { display: grid; gap: 0.875rem; align-content: start; padding: 1.5rem; }
.card h2 { margin: 0; font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-dim); }
.big { margin: 0; font-size: 2.75rem; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
.plan-row { margin: 0; }

.split { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.5rem; }
.split li { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.875rem; color: var(--text-dim); }
.split strong { color: var(--text); font-variant-numeric: tabular-nums; }

.note { margin: 0; font-size: 0.78125rem; line-height: 1.5; color: var(--text-dim); }

.link-danger {
  justify-self: start;
  border: none;
  background: none;
  padding: 0;
  color: var(--text-dim);
  font-size: 0.8125rem;
  text-decoration: underline;
  cursor: pointer;
}
.link-danger:hover { color: var(--error); }

.confirm { display: grid; gap: 0.75rem; }
.confirm-actions { display: flex; gap: 0.5rem; }
.confirm-actions .btn { flex: 1; }
.btn-danger {
  background: var(--error);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-weight: 800;
  cursor: pointer;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.cancel-done {
  margin: 0;
  padding: 0.625rem 0.75rem;
  border-radius: 0.625rem;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 32%, transparent);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.links { margin: 1.5rem 0 0; display: flex; gap: 0.625rem; justify-content: center; font-size: 0.8125rem; color: var(--text-dim); }
.links a { color: var(--text-dim); }
.links a:hover { color: var(--primary); }

.btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 2.75rem; text-decoration: none; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
