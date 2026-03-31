export type GithubExportArtifact = 'backend' | 'frontend'
export type GithubExportVisibility = 'private' | 'public'

export type PendingGithubExport = {
  projectId: string
  artifact: GithubExportArtifact
  repoName?: string
  visibility?: GithubExportVisibility
  returnPath: string
  createdAt: number
}

const PENDING_GITHUB_EXPORT_KEY = 'conceptual_pending_github_export'

function isBrowser() {
  return typeof window !== 'undefined'
}

export function setPendingGithubExport(pending: PendingGithubExport): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(PENDING_GITHUB_EXPORT_KEY, JSON.stringify(pending))
  } catch {
    // no-op
  }
}

export function getPendingGithubExport(): PendingGithubExport | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(PENDING_GITHUB_EXPORT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingGithubExport>
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.artifact !== 'backend' && parsed.artifact !== 'frontend') return null
    if (typeof parsed.projectId !== 'string' || typeof parsed.returnPath !== 'string') return null

    return {
      projectId: parsed.projectId,
      artifact: parsed.artifact,
      repoName: typeof parsed.repoName === 'string' ? parsed.repoName : undefined,
      visibility: parsed.visibility === 'public' ? 'public' : 'private',
      returnPath: parsed.returnPath,
      createdAt: Number(parsed.createdAt) || Date.now(),
    }
  } catch {
    return null
  }
}

export function clearPendingGithubExport(): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(PENDING_GITHUB_EXPORT_KEY)
  } catch {
    // no-op
  }
}
