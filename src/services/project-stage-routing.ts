import type { Router } from 'vue-router'
import type { Project } from './api'

function isTerminalBuildStage(status: Project['status'] | string | null | undefined): boolean {
  return (
    status === 'building' ||
    status === 'assembling' ||
    status === 'assembled' ||
    status === 'complete'
  )
}

export function getProjectPathForStatus(projectId: string, status: Project['status'] | string | null | undefined): string | null {
  switch (status) {
    case 'planning':
    case 'planned':
    case 'planning_complete':
    case 'designing':
    case 'design_complete':
    case 'awaiting_clarification':
    case 'awaiting_input':
      return `/project/${projectId}`
    case 'implementing':
    case 'implemented':
      return `/project/${projectId}/implementing`
    case 'sync_generating':
    case 'syncs_generated':
    case 'syncing':
      return `/project/${projectId}/syncing`
    case 'building':
    case 'assembling':
    case 'assembled':
    case 'complete':
      return `/project/${projectId}/assembling`
    default:
      return null
  }
}

export async function maybeNavigateToAutocompleteStage(
  router: Router,
  currentPath: string,
  projectId: string,
  status: Project['status'] | string | null | undefined,
  autocomplete: boolean | null | undefined,
  projectName?: string | null,
): Promise<boolean> {
  if (!autocomplete && !isTerminalBuildStage(status)) return false

  const targetPath = getProjectPathForStatus(projectId, status)
  if (!targetPath || targetPath === currentPath) return false

  await router.replace({
    path: targetPath,
    query: {
      projectName: projectName ? encodeURIComponent(projectName) : undefined,
    },
  })

  return true
}
