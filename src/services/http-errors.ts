export function isHttp524(err: unknown): boolean {
  const anyErr = err as any
  const status = anyErr?.response?.status
  const msg = String(anyErr?.message ?? '')
  return status === 524 || msg.includes('524')
}

import type { BillingRefusal } from '../components/BillingRefusalDialog.vue'

/**
 * Pull the server's structured billing decision off a failed request.
 *
 * The server sends the DECISION — reason, shortfall, ceiling, the tier that would fit —
 * precisely so the browser never recomputes it. `CREDIT_SCALING_EXPONENT` is
 * server-tunable, so a browser-side copy of the ceiling arithmetic diverges the first
 * time it is retuned, and the user watches a build the UI called affordable get refused.
 *
 * Returns null for anything that is not a billing refusal, so callers can fall through
 * to their ordinary error handling.
 */
export function extractBillingRefusal(err: unknown): BillingRefusal | null {
  const data = (err as any)?.response?.data
  const billing = data?.billing
  if (!billing || typeof billing !== 'object') return null
  if (typeof billing.reason !== 'string') return null
  return billing as BillingRefusal
}

/** 402/403/429 are the billing-refusal status codes the gates use. */
export function isBillingStatus(err: unknown): boolean {
  const status = (err as any)?.response?.status
  return status === 402 || status === 403 || status === 429
}
