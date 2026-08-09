import { computed, ref } from 'vue'
import { type BillingState, fetchBilling, type Tier } from '../services/billing-api'
import { getAccessToken } from '../services/auth-storage'

/**
 * Shared billing state.
 *
 * MODULE-LEVEL, not per-component: the sidebar chip, the pricing page and every refusal
 * dialog must show the same balance. Two components each fetching their own copy is how
 * a user ends up looking at "12 credits" in the corner while a dialog tells them they
 * have 4.
 */
const state = ref<BillingState | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let inFlight: Promise<void> | null = null

export function useBilling() {
  /** Fetch once; concurrent callers share the same request. */
  async function load(force = false): Promise<void> {
    if (!getAccessToken()) {
      state.value = null
      return
    }
    if (!force && state.value) return
    if (inFlight) return inFlight

    loading.value = true
    error.value = null
    inFlight = fetchBilling()
      .then((b) => {
        state.value = b
      })
      .catch((e: unknown) => {
        // A billing read failing must never block the app — the chip just hides.
        error.value = e instanceof Error ? e.message : String(e)
      })
      .finally(() => {
        loading.value = false
        inFlight = null
      })
    return inFlight
  }

  /** Call after anything that moves the balance: a purchase, a build, an upgrade. */
  const refresh = () => load(true)

  function clear() {
    state.value = null
    error.value = null
  }

  const credits = computed(() => state.value?.credits ?? 0)
  const tier = computed<Tier>(() => state.value?.tier ?? 'free')
  const ceiling = computed(() => state.value?.maxCreditsPerApp ?? null)
  const frozen = computed(() => state.value?.frozen === true)

  /** Low enough to warrant a nudge, but not empty. Below the 3-credit minimum build
   *  charge there is nothing they can build at all, so that is the real threshold. */
  const isLow = computed(() =>
    state.value !== null && state.value.credits > 0 && state.value.credits < 3
  )
  const isEmpty = computed(() => state.value !== null && state.value.credits === 0)

  return {
    billing: state,
    loading,
    error,
    load,
    refresh,
    clear,
    credits,
    tier,
    ceiling,
    frozen,
    isLow,
    isEmpty,
  }
}

/** Per-tier identity. Progression is legible at a glance: neutral → teal → violet →
 *  gold → prismatic. Kept in ONE place so the sidebar badge, the pricing cards and the
 *  upgrade prompt cannot drift apart. */
export const TIER_STYLE: Record<Tier, { label: string; className: string }> = {
  free: { label: 'Free', className: 'tier-free' },
  starter: { label: 'Starter', className: 'tier-starter' },
  studio: { label: 'Studio', className: 'tier-studio' },
  pro: { label: 'Pro', className: 'tier-pro' },
  unlimited: { label: 'Unlimited', className: 'tier-unlimited' },
}
