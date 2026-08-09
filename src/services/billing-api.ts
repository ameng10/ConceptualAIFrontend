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
  tiers: TierSpec[]
}

/** GET /me/billing — the single source for every billing surface in the UI. */
export async function fetchBilling(): Promise<BillingState> {
  const res = await api.get<{ billing: BillingState }>('/me/billing')
  return res.data.billing
}

/**
 * POST /billing/checkout/credits — buy N credits.
 *
 * Quantity is sent, never an amount: the server prices it from the catalog Price, so a
 * tampered client cannot buy 100 credits for a dollar. Returns a Stripe-hosted URL to
 * redirect to; the consent checkbox is rendered by Stripe on that page.
 */
export async function startCreditCheckout(credits: number): Promise<{ url: string }> {
  const res = await api.post<{ url: string }>('/billing/checkout/credits', { credits })
  return res.data
}

/** POST /billing/checkout/plan — subscribe to or change plan. */
export async function startPlanCheckout(tier: Tier): Promise<{ url: string }> {
  const res = await api.post<{ url: string }>('/billing/checkout/plan', { tier })
  return res.data
}

/** POST /billing/portal — Stripe-hosted billing management (card, cancel, invoices). */
export async function openBillingPortal(): Promise<{ url: string }> {
  const res = await api.post<{ url: string }>('/billing/portal', {})
  return res.data
}
