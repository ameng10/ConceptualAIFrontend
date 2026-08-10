/**
 * Fail if the static pricing page and the backend's ladder disagree.
 *
 * pricing.html has to state prices as text — that is the whole point of it being static,
 * since a crawler or an answer engine reading JavaScript-rendered numbers is not something
 * to rely on. But it means the ladder now lives in two places, and the copy that faces
 * customers is the one that cannot be checked by a type system. A stale number here is not
 * a cosmetic bug; it is a published price we would have to honour.
 *
 * So the table is derived from `TIERS` mechanically and compared cell by cell. The mapping
 * below IS the contract: change how a cell is phrased in pricing.html and this fails until
 * the mapping is updated to match.
 *
 * NOT A DEPLOY GATE. Deno Deploy builds the frontend repo alone, so the backend file is
 * absent there and this cannot run. It is a local check — run it whenever either side of
 * the ladder moves. It says SKIP rather than passing quietly when it cannot see the source
 * of truth, because a check that reports success without checking anything is worse than
 * no check.
 *
 *   node scripts/check_pricing_parity.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const PRICING_HTML = path.join(here, '..', 'pricing.html')
const BILLING_TS =
  process.env.BILLING_TS ?? path.join(here, '..', '..', 'ConceptualAI', 'src', 'utils', 'billing.ts')

if (!fs.existsSync(BILLING_TS)) {
  console.log(`SKIP: no source of truth at ${BILLING_TS}`)
  console.log('      (expected when the backend repo is not checked out beside this one)')
  process.exit(0)
}

const ts = fs.readFileSync(BILLING_TS, 'utf8')
const html = fs.readFileSync(PRICING_HTML, 'utf8')

/** Pull one `key: value,` out of a tier's object literal. */
function field(block, key) {
  const m = block.match(new RegExp(`${key}:\\s*([^,\\n]+)`))
  if (!m) throw new Error(`could not read ${key}`)
  return m[1].trim()
}

const tiersBlock = ts.match(/export const TIERS[^=]*=\s*\{([\s\S]*?)\n\};/)
if (!tiersBlock) throw new Error('could not locate TIERS in billing.ts')

// Split into per-tier literals: `name: { ... },` at one indent level.
const tiers = [...tiersBlock[1].matchAll(/(\w+):\s*\{([\s\S]*?)\n  \},/g)].map(([, name, body]) => ({
  name,
  label: field(body, 'label').replace(/["']/g, ''),
  price: Number(field(body, 'monthlyPriceUsd')),
  priceFrom: field(body, 'priceFrom') === 'true',
  included: Number(field(body, 'includedCredits')),
  maxPerApp: field(body, 'maxCreditsPerApp') === 'null' ? null : Number(field(body, 'maxCreditsPerApp')),
  plansPerWeek: field(body, 'plansPerWeek') === 'null' ? null : Number(field(body, 'plansPerWeek')),
}))

const creditPrice = Number(ts.match(/export const CREDIT_PRICE_USD\s*=\s*([\d.]+)/)[1])
const minCredits = Number(ts.match(/export const MIN_CREDITS_PER_BUILD\s*=\s*(\d+)/)[1])

// How each field is rendered in the table. This mirrors pricing.html exactly.
const expected = tiers.map((t) => [
  t.label,
  t.price === 0 ? '$0' : `${t.priceFrom ? 'From ' : ''}$${t.price}/month`,
  t.maxPerApp === null ? 'No limit' : `${t.maxPerApp} credits`,
  t.included === 0 ? 'None' : `${t.included} credits`,
  t.plansPerWeek === null ? 'No limit' : String(t.plansPerWeek),
])

const rows = [...html.matchAll(/<tr>\s*((?:<td>[\s\S]*?<\/td>\s*)+)<\/tr>/g)].map((m) =>
  [...m[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1].trim()),
)

const problems = []
if (rows.length !== expected.length) {
  problems.push(`table has ${rows.length} plan rows, billing.ts defines ${expected.length}`)
}
expected.forEach((want, i) => {
  const got = rows[i]
  if (!got) return problems.push(`missing row for ${want[0]}`)
  want.forEach((cell, j) => {
    if (got[j] !== cell) problems.push(`${want[0]} column ${j + 1}: page says "${got[j]}", billing.ts implies "${cell}"`)
  })
})

// The two standalone figures in the prose.
if (!html.includes(`$${creditPrice.toFixed(2)} each`)) {
  problems.push(`page does not state the credit price as "$${creditPrice.toFixed(2)} each"`)
}
const minPhrase = `minimum of ${minCredits} credit${minCredits === 1 ? '' : 's'}`
if (!html.includes(minPhrase)) {
  problems.push(`page does not state the build minimum as "${minPhrase}"`)
}

// Guard the one figure billing.ts says must never be published: the effective per-credit
// rate a plan implies. If the page ever quotes one, that is a deliberate policy reversal.
for (const t of tiers) {
  if (t.included > 0 && t.price > 0) {
    const implied = (t.price / t.included).toFixed(2)
    if (html.includes(`$${implied}`) && implied !== creditPrice.toFixed(2)) {
      problems.push(`page appears to publish ${t.label}'s implied per-credit rate ($${implied}); billing.ts:97 says never publish it`)
    }
  }
}

if (problems.length) {
  console.error('PRICING PARITY FAILED:')
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`pricing parity OK — ${expected.length} plans, $${creditPrice.toFixed(2)}/credit, ${minCredits}-credit minimum`)
