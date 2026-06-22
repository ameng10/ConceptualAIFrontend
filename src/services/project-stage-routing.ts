import type { Router } from 'vue-router'
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
  showConceptDesign = false,
): string | null {
  if (!status) return null

  if (PLANNING_STATUSES.includes(status)) {
    return `/project/${projectId}`
  }

  // Advanced users pause at the design review gate. Non-advanced users never pause here — the
  // backend auto-advances, so `design_complete` is treated like any other building status.
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
 * Navigate to the page that matches the project's current status.
 *
 * Returns true if a navigation was triggered. The plan/design review page and the building
 * progress page share the same route (`/project/:id`), so during the auto-build the user is
 * never bounced between per-stage pages — they only move once, to the completed page.
 */
export async function maybeNavigateToStage(
  router: Router,
  currentPath: string,
  projectId: string,
  status: Project['status'] | string | null | undefined,
  projectName?: string | null,
  showConceptDesign = false,
): Promise<boolean> {
  const targetPath = getProjectPathForStatus(projectId, status, showConceptDesign)
  if (!targetPath || targetPath === currentPath) return false

  await router.replace({
    path: targetPath,
    query: {
      projectName: projectName ? encodeURIComponent(projectName) : undefined,
    },
  })

  return true
}
