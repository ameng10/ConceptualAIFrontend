/**
 * Human-facing label for a project's status.
 *
 * DISPLAY ONLY. The raw status strings are the pipeline's state machine — the
 * cascade gates, the audit TERMINAL map and the stage routing all key off them,
 * so they must never be renamed to make the UI read better. This maps them for
 * the user at the point of render.
 *
 * Two rules the user asked for:
 *  - every stage of the build reads "building"; a user does not care that the
 *    pipeline is currently in `implementing` vs `sync_generating` — those are
 *    our internal phases, and showing them invites "is it stuck?"
 *  - `assembled` reads "built" — the app exists, which is the thing the word
 *    should convey.
 */

/** Statuses that are all one thing to a user: the app is being built. */
const BUILDING: ReadonlySet<string> = new Set([
  'design_complete',
  'designing',
  'implementing',
  'implemented',
  'sync_generating',
  'syncs_generated',
  'syncing',
  'building',
  'assembling',
])

/** Explicit labels for statuses that are NOT part of the building run. */
const LABELS: Readonly<Record<string, string>> = {
  assembled: 'built',
  complete: 'complete',
  planning: 'planning',
  planning_complete: 'plan ready',
  planned: 'plan ready',
  awaiting_clarification: 'needs input',
  error: 'error',
}

export function projectStatusLabel(status: string | undefined | null): string {
  const s = String(status ?? '').trim()
  if (!s) return 'unknown'
  if (BUILDING.has(s)) return 'building'
  if (LABELS[s]) return LABELS[s]
  // Unknown/new status: show it readably rather than inventing a label, so a
  // pipeline change surfaces here instead of silently displaying nothing.
  return s.replace(/_/g, ' ')
}

/** Class hook for styling. Collapses the building family so one rule covers it. */
export function projectStatusClass(status: string | undefined | null): string {
  const s = String(status ?? '').trim()
  if (BUILDING.has(s)) return 'building'
  if (s === 'assembled') return 'built'
  return s
}
