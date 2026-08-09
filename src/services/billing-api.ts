import { api } from './http'

/** One tier's published shape. Mirrors the server's `TierSpec` — the server owns the
 *  ladder and sends it, so the pricing page and the upgrade prompts can never drift
 *  from what the gates actually enforce. */
export interface TierSpec {
  tier: Tier
  label: string
  monthlyPriceUsd: number
  priceFrom: boolean
  includedCredits: number
  /** `null` means UNCAPPED. Never coerce it to 0 — that would read as "can build
   *  nothing" for the top-paying tier. */
  maxCreditsPerApp: number | null
  plansPerWeek: number | null
  selfServe: boolean
}

export type Tier = 'free' | 'starter' | 'studio' | 'pro' | 'unlimited'

export interface BillingState {
  tier: Tier
  tierLabel: string
  maxCreditsPerApp: number | null
  includedCredits: number
  credits: number
  subscriptionCredits: number
  purchasedCredits: number
  nextExpiryAt: string | null
  frozen: boolean
  plansUsed: number
  plansLimit: number | null
  plansRemaining: number | null
  plansResetsAt: string | null
  creditPriceUsd: number
  subscriptionStatus: string | null
  /** Dunning: inside the post-failure ceiling grace. */
  inGrace: boolean
  tierSource: 'manual' | 'subscription' | 'grace' | 'none'
  paidThroughAt: string | null
  graceEndsAt: string | null
  /** A cancellation is scheduled; access runs to currentPeriodEnd. */
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  /** A scheduled downgrade: the tier you move to, and when. Null when none is pending. */
  downgradesToTier: Tier | null
  downgradesAt: string | null
  purchasedExpiresAt: string | null
  tiers: TierSpec[]
}

/** GET /me/billing — the single source for every billing surface in the UI. */
export async function fetchBilling(): Promise<BillingState> {
  const res = await api.get<{ billing: BillingState }>('/api/me/billing')
  return res.data.billing
}

/**
 * POST /billing/checkout/credits — buy N credits.
 *
 * Quantity is sent, never an amount: the server prices it from the catalog Price, so a
 * tampered client cannot buy 100 credits for a dollar. Returns a Stripe-hosted URL to
 * redirect to; the consent checkbox is rendered by Stripe on that page.
 */
export async function startCreditCheckout(
  credits: number,
): Promise<{ url: string | null; error?: string }> {
  const res = await api.post<{ url: string | null; error?: string }>(
    '/api/billing/checkout/credits',
    { credits },
  )
  return res.data
}

/**
 * POST /billing/checkout/plan — subscribe to, or change, a plan.
 *
 * TWO OUTCOMES, ONLY ONE OF WHICH IS A REDIRECT. A first subscription opens a Checkout
 * Session and returns `url`. An EXISTING subscriber's change is applied in place on the
 * subscription they already have — there is nothing to redirect to, so `url` is null and
 * `changed` is true. Treating a missing url as failure reported every successful upgrade
 * and downgrade as "we couldn't open checkout, nothing was charged", both halves of which
 * were false, and the natural retry then answered 409 "Already on that plan".
 */
export async function startPlanCheckout(
  tier: Tier,
): Promise<{ url: string | null; changed?: boolean; error?: string }> {
  const res = await api.post<{ url: string | null; changed?: boolean; error?: string }>(
    '/api/billing/checkout/plan',
    { tier },
  )
  return res.data
}

/** POST /billing/portal — Stripe-hosted billing management (card, cancel, invoices). */
export async function openBillingPortal(): Promise<{ url: string }> {
  const res = await api.post<{ url: string }>('/api/billing/portal', {})
  return res.data
}

export interface PublicPricing {
  tiers: TierSpec[]
  creditPriceUsd: number
  minCreditsPerBuild: number
}

/**
 * GET /pricing — the ladder, without a session.
 *
 * The pricing page must render for a logged-out visitor: the Billing policy points at
 * it for price, allowance, size limit and weekly turns, and gating those behind a login
 * makes the policy reference dangle. Reading them from `/me/billing` (authenticated)
 * was the original mistake.
 */
export async function fetchPublicPricing(): Promise<PublicPricing> {
  const res = await api.get<{ pricing: PublicPricing }>('/api/pricing')
  return res.data.pricing
}

/** POST /billing/cancel — cancel at the end of the current period. */
export async function cancelSubscription(): Promise<{ cancelAtPeriodEnd: boolean }> {
  const res = await api.post<{ result: { cancelAtPeriodEnd: boolean } }>(
    '/api/billing/cancel',
    {},
  )
  return res.data.result
}

/**
 * POST /billing/verify — ask Stripe directly whether a returning buyer's session
 * settled, instead of trusting the webhook to have arrived first. Idempotent.
 */
export async function verifyCheckoutSession(
  sessionId: string,
): Promise<{ applied: boolean; paid?: boolean; active?: boolean }> {
  const res = await api.post<{
    result: { applied: boolean; paid?: boolean; active?: boolean }
  }>('/api/billing/verify', { sessionId })
  return res.data.result
}
