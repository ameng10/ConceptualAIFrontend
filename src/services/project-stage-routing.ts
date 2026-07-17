import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type { Project } from './api'

/**
 * Status buckets for the auto-advance pipeline.
 *
 * The backend drives every stage from `design` onward automatically. The frontend therefore
 * only needs three destinations:
 *  - the plan / design review page (ProjectStatus.vue) for the human gates,
 *  - a single read-only "Building…" progress page (also ProjectStatus.vue, which polls and
 *    shows the 3-bubble indicator) for every in-flight build status, and
 *  - the completed page (Assembling.vue) with downloads + the Modify button.
 *
 * We deliberately do NOT route into Implementing.vue / Syncing.vue during the normal flow:
 * their mount logic used to trigger backend stages, which double-provisions sandboxes now that
 * the backend auto-advances.
 */
const PLANNING_STATUSES = [
  'planning',
  'planned',
  'planning_complete',
  'awaiting_clarification',
  'awaiting_input',
]

const COMPLETE_STATUSES = ['complete', 'assembled']

export function getProjectPathForStatus(
  projectId: string,
  status: Project['status'] | string | null | undefined,
): string | null {
  if (!status) return null

  if (PLANNING_STATUSES.includes(status)) {
    return `/project/${projectId}`
  }

  // Legacy parked gate from before the stage merge; treated like a building status.
  if (status === 'design_complete') {
    return `/project/${projectId}`
  }

  if (COMPLETE_STATUSES.includes(status)) {
    return `/project/${projectId}/assembling`
  }

  // All remaining building statuses (designing, implementing, sync_generating, syncs_generated,
  // syncing, building, assembling) stay on the read-only building progress view.
  return `/project/${projectId}`
}

/**
 * Forward the user to the completed/downloads page (Assembling.vue) when a build finishes — but
 * ONLY for the project currently shown in the URL.
 *
 * Background polls used to drive the route on every status change. When several sandboxes were
 * building at once, a poll for project A could fire while the user was viewing project B and
 * `router.replace` would yank them onto A's page — the builder appeared to "jump around" between
 * projects. Gating on `route.params.id === projectId` makes a poll incapable of navigating away
 * from the project on screen: a stale or cross-project tick simply does nothing.
 *
 * Completion is the only transition that navigates now; all the in-flight building statuses share
 * the `/project/:id` route, so there is nothing else to move between. (This whole mechanism will be
 * replaced by server-pushed SSE updates — see docs/REALTIME_CHANNELING_PLAN.md.)
 *
 * Returns true if a navigation was triggered.
 */
export async function navigateOnCompletion(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  projectId: string,
  status: Project['status'] | string | null | undefined,
  projectName?: string | null,
): Promise<boolean> {
  if (!status || !COMPLETE_STATUSES.includes(String(status))) return false

  // Only the project on screen may be navigated — never a different one from a background poll.
  if (String(route.params.id) !== projectId) return false

  const targetPath = `/project/${projectId}/assembling`
  if (route.path === targetPath) return false

  await router.replace({
    path: targetPath,
    query: {
      projectName: projectName ? encodeURIComponent(projectName) : undefined,
    },
  })

  return true
}
