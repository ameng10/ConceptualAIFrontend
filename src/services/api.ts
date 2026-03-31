import { api } from './http'
import {
    clearAuthData,
    getAccessToken,
    getRefreshToken,
    getUserId,
    getUsername,
    setAccessToken,
    setRefreshToken,
    setUserId,
    setUsername,
} from './auth-storage'
import * as authFns from './auth'
import {
    clearGeminiCredentialState,
    getGeminiHeadersOrThrow,
    initializeGeminiCredentialSession,
    normalizeGeminiRequestError,
    syncGeminiCredentialStatus,
} from './gemini-credentials'
import {
    clearGithubCredentialState,
    initializeGithubCredentialSession,
    syncGithubCredentialStatus,
} from './github-credentials'

// Types
export interface User {
    id: string
    // Add other user fields if needed
}

export interface AuthResponse {
    user: string // User ID
    username?: string
    accessToken: string
    refreshToken: string
}

export interface Project {
    _id: string
    name: string
    description: string
    autocomplete?: boolean
    status:
    | 'planning'
    | 'planned'
    | 'planning_complete'
    | 'designing'
    | 'design_complete'
    | 'implementing'
    | 'implemented'
    | 'sync_generating'
    | 'syncs_generated'
    | 'syncing'
    | 'building'
    | 'assembling'
    | 'assembled'
    | 'complete'
    | 'error'
    | 'awaiting_clarification'
    | 'awaiting_input'
    createdAt?: string
    updatedAt?: string
}

/**
 * The backend may return 'planned' as the status for a completed planning stage.
 * Normalize it to 'planning_complete' so all frontend logic works consistently.
 */
function normalizeProjectStatus(project: Project): Project {
    if (project.status === 'planned') {
        return { ...project, status: 'planning_complete' }
    }
    return project
}

export interface ProjectListResponse {
    projects: Project
}

export interface SyncsResponse {
    syncs?: any[]
    apiDefinition?: any
    endpointBundles?: any[]
    status?: string
}

export type GithubExportArtifact = 'backend' | 'frontend'
export type GithubExportVisibility = 'private' | 'public'

export type GithubExportJob = {
    artifact: GithubExportArtifact
    repoName?: string
    visibility?: GithubExportVisibility
    status?: 'processing' | 'complete' | 'error' | 'stale' | string
    repoUrl?: string
    repoOwner?: string
    repoId?: string
    remoteExists?: boolean
    lastRemoteCheckAt?: string
    logs?: string[]
    createdAt?: string
    updatedAt?: string
}

export type GithubExportStatusResponse = {
    backend: GithubExportJob | null
    frontend: GithubExportJob | null
}

/**
 * Backward-compatible authState shape used across the UI.
 * Internally we store as separate keys (userId/accessToken/refreshToken) like the provided example.
 */
export const authState = {
    get(): AuthResponse | null {
        const user = getUserId()
        const username = getUsername()
        const accessToken = getAccessToken()
        const refreshToken = getRefreshToken()
        if (!user) return null
        // Tokens may be empty depending on backend behavior (e.g., register returns only { user }).
        return {
            user,
            username: username ?? undefined,
            accessToken: accessToken ?? '',
            refreshToken: refreshToken ?? '',
        }
    },
    set(data: AuthResponse) {
        setUserId(data.user)
        if (data.username) setUsername(data.username)
        // Allow storing empty tokens; keep storage consistent.
        setAccessToken(data.accessToken ?? '')
        setRefreshToken(data.refreshToken ?? '')
    },
    clear() {
        clearAuthData()
    },
    getUserId() {
        return getUserId()
    },
    /**
     * True only when we have an actual authenticated session (user id + non-empty tokens).
     * Use this for UI "Signed in" display.
     */
    isSignedIn(): boolean {
        const user = getUserId()
        const accessToken = getAccessToken()
        const refreshToken = getRefreshToken()
        return Boolean(user) && Boolean(accessToken) && Boolean(refreshToken)
    },
}

/**
 * Validate session on app load. If we have a token but it's invalid (401),
 * attempt a refresh first. Only clear auth if the refresh also fails.
 */
export async function validateSession(): Promise<void> {
    const accessToken = getAccessToken()
    if (!accessToken) return

    try {
        await authFns.getUserFromToken(accessToken)
        try {
            await syncGeminiCredentialStatus()
        } catch {
            // Do not block route access if Gemini status refresh fails.
        }
        try {
            await syncGithubCredentialStatus()
        } catch {
            // Do not block route access if GitHub status refresh fails.
        }
    } catch {
        // Access token invalid/expired – try to refresh before giving up.
        const refreshToken = getRefreshToken()
        if (refreshToken) {
            try {
                const result = await authFns.refreshTokens(refreshToken)
                if (result?.accessToken && result?.refreshToken) {
                    setAccessToken(result.accessToken)
                    setRefreshToken(result.refreshToken)
                    // Verify the new token works
                    try {
                        await authFns.getUserFromToken(result.accessToken)
                        try {
                            await syncGeminiCredentialStatus()
                        } catch {
                            // Do not block route access if Gemini status refresh fails.
                        }
                        try {
                            await syncGithubCredentialStatus()
                        } catch {
                            // Do not block route access if GitHub status refresh fails.
                        }
                        return // Session recovered successfully
                    } catch {
                        // New token also invalid – fall through to clear
                    }
                }
            } catch {
                // Refresh failed – fall through to clear
            }
        }
        clearGeminiCredentialState()
        clearGithubCredentialState()
        clearAuthData()
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth:session-cleared'))
        }
        // Route guard will redirect to /login on next navigation
    }
}

/**
 * Initialize auth state on app startup.
 *
 * Goal: never appear "signed in" unless we actually have a stored user id.
 * If storage is partially present/corrupt, we clear it so the UI starts signed out.
 */
export function initAuthOnStartup() {
    const user = getUserId()
    if (!user) {
        // If there's no user id, make sure we clear any stale tokens/usernames.
        clearGeminiCredentialState()
        clearGithubCredentialState()
        clearAuthData()
        return
    }

    // If a user id exists, keep it. But if tokens exist in a clearly invalid state, clear everything.
    // We treat explicit empty-string tokens as invalid tokens.
    const accessToken = getAccessToken()
    const refreshToken = getRefreshToken()
    const hasAnyToken = accessToken !== null || refreshToken !== null
    const hasValidTokens = Boolean(accessToken) && Boolean(refreshToken)
    if (hasAnyToken && !hasValidTokens) {
        clearGeminiCredentialState()
        clearGithubCredentialState()
        clearAuthData()
    }
}

// API Modules
export const authApi = {
    async register(email: string, password: string, username: string, name: string) {
        const res = await authFns.register(email, password, name, username)
        // Backend register may not return username; we still know it from the form.
        authState.set({ ...res, username })
        return res
    },

    async login(email: string, password: string) {
        let plaintextPassword = password
        try {
            const res = await authFns.login(email, plaintextPassword)
            const loginUsername = (res as any)?.username as string | undefined
            authState.set({ ...res, username: loginUsername })

            try {
                await initializeGeminiCredentialSession(plaintextPassword)
            } catch {
                // Do not fail login if the Gemini status probe is temporarily unavailable.
            }
            try {
                await initializeGithubCredentialSession(plaintextPassword)
            } catch {
                // Do not fail login if the GitHub status probe is temporarily unavailable.
            }

            // Never block login completion on profile fetch. Enrich username in background only.
            if (!loginUsername) {
                void api
                    .get<{ profile?: { username?: string } }>('/api/me/profile', { timeout: 3000 })
                    .then((profileRes) => {
                        const candidate = profileRes.data?.profile?.username
                        if (candidate && candidate.trim()) {
                            setUsername(candidate.trim())
                        }
                    })
                    .catch(() => {
                        // Profile may not exist yet (or endpoint may be unavailable). Ignore.
                    })
            }
            return res
        } finally {
            plaintextPassword = ''
        }
    },

    async logout() {
        const accessToken = getAccessToken()
        if (accessToken) {
            await authFns.logout(accessToken)
        }
        clearGeminiCredentialState()
        clearGithubCredentialState()
        authState.clear()
    }
}

async function runGeminiRequest<T>(execute: () => Promise<T>): Promise<T> {
    try {
        return await execute()
    } catch (error) {
        normalizeGeminiRequestError(error)
    }
}

export const projectApi = {
    async create(owner: string, name: string, description: string, enableAutocomplete = false) {
        // API.md: POST /projects (auth required)
        const response = await runGeminiRequest(() =>
            api.post<any>(
                '/api/projects',
                { name, description, enableAutocomplete },
                { headers: getGeminiHeadersOrThrow() },
            )
        )

        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }

        // Backend response shapes have varied over time. Accept a few common ones:
        // - { project: string, status, plan }
        // - { projectId: string, status, plan }
        // - { planning: { project: string, status, plan } }
        // - { status, plan, ... } (no project id)  <-- we fall back to listing
        let pid: string | undefined =
            response.data?.projectId ||
            response.data?.project ||
            response.data?.planning?.project ||
            response.data?.planning?.projectId

        // If the create response didn't include the project id, fall back to finding it via list.
        // This is slower, but avoids breaking the flow.
        if (!pid) {
            try {
                const list = await api.get<{ projects: Project[] }>('/api/projects')
                const projects = list.data?.projects ?? []
                // If there are multiple, pick the newest (best effort based on createdAt).
                const matches = projects.filter((p) => p.name === name && p.description === description)
                matches.sort((a, b) => {
                    const at = a.createdAt ? Date.parse(a.createdAt) : 0
                    const bt = b.createdAt ? Date.parse(b.createdAt) : 0
                    return bt - at
                })
                pid = matches[0]?._id
            } catch {
                // ignore
            }
        }

        if (!pid) {
            throw new Error(
                'Create project did not return a project id (and fallback lookup failed). ' +
                'Backend should include { project: "..." } or { projectId: "..." } in POST /api/projects response.',
            )
        }

        // Normalize planning payload for the UI.
        const planning = response.data?.planning ?? response.data
        return { project: pid, planning }
    },

    async startDesign(projectId: string, plan: any, enableAutocomplete = false) {
        // Not yet documented in API.md; aligns with the agent pipeline (planning -> designing).
        // Expected to return status/progress payload.
        const response = await runGeminiRequest(() =>
            api.post<any>(
                `/api/projects/${projectId}/design`,
                { plan, enableAutocomplete },
                { headers: getGeminiHeadersOrThrow() },
            )
        )
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        return response.data
    },

    /**
     * Placeholder endpoint: start the implementing agent.
     * TODO: Replace with real API docs once available.
     */
    async startImplementation(projectId: string, enableAutocomplete = false) {
        const response = await runGeminiRequest(() =>
            api.post<any>(
                `/api/projects/${projectId}/implement`,
                { enableAutocomplete },
                { headers: getGeminiHeadersOrThrow() },
            )
        )
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        return response.data
    },

    /**
      * Fetch implementation results.
      * API.md: GET /projects/:projectId/implementations
     */
    async getImplementation(projectId: string) {
        const response = await api.get<any>(`/api/projects/${projectId}/implementations`)
        return (response.data as any)?.implementations ?? (response.data as any)?.implementation ?? (response.data as any)?.result ?? response.data
    },

    /**
     * API.md: POST /projects/:projectId/syncs
     */
    async startSyncGeneration(projectId: string, enableAutocomplete = false) {
        const response = await runGeminiRequest(() =>
            api.post<any>(
                `/api/projects/${projectId}/syncs`,
                { enableAutocomplete },
                { headers: getGeminiHeadersOrThrow() },
            )
        )
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        return response.data
    },

    /**
     * API.md: GET /projects/:projectId/syncs
     */
    async getSyncs(projectId: string): Promise<SyncsResponse> {
        const response = await api.get<any>(`/api/projects/${projectId}/syncs`)
        // API.md: { syncs: [...], apiDefinition: {...}, endpointBundles: [...] }
        // Keep a few fallbacks for backend shape drift.
        const data = response.data as any
        const candidates = [
            data,
            data?.result,
            data?.response,
            data?.data,
            data?.payload,
            data?.syncsResponse,
        ].filter(Boolean)

        for (const c of candidates) {
            if ((c as any)?.syncs || (c as any)?.apiDefinition || (c as any)?.endpointBundles) return c
        }

        return data
    },

    /**
     * Start the build process (both backend assembly and frontend generation).
     * POST /projects/:projectId/build
     *
     * API.md success shape:
     * {
     *   "status": "complete",
     *   "backend": { "status": "complete", "downloadUrl": "/api/downloads/:projectId_backend.zip" },
     *   "frontend": { "status": "complete", "downloadUrl": "/api/downloads/:projectId_frontend.zip" }
     * }
     */
    async startBuild(projectId: string, enableAutocomplete = false) {
        const response = await runGeminiRequest(() =>
            api.post<any>(
                `/api/projects/${projectId}/build`,
                { enableAutocomplete },
                { headers: getGeminiHeadersOrThrow() },
            )
        )
        const data = response.data as any
        if (data?.error || data?.status === 'error') {
            throw new Error(data?.error || data?.message || 'Build failed')
        }
        return data
    },

    /**
     * Get build status and download URLs.
     * GET /projects/:projectId/build/status
     *
     * Response shape:
     * {
     *   "status": "processing" | "complete" | "error",
     *   "backend": { "status": "complete" | "processing" | "error", "downloadUrl": "/api/downloads/:projectId_backend.zip" },
     *   "frontend": { "status": "complete" | "processing" | "error", "downloadUrl": "/api/downloads/:projectId_frontend.zip" }
     * }
     */
    async getBuildStatus(projectId: string): Promise<{
        status: 'processing' | 'complete' | 'error'
        backend?: { status?: string; downloadUrl?: string | null }
        frontend?: { status?: string; downloadUrl?: string | null }
    }> {
        const response = await runGeminiRequest(() =>
            api.get<any>(`/api/projects/${projectId}/build/status`, {
                headers: getGeminiHeadersOrThrow(),
            })
        )
        return response.data
    },

    /**
     * Download a file with authentication.
     * Fetches the file as a blob and triggers a browser download.
     */
    async downloadFile(url: string, filename: string): Promise<void> {
        // Use the shared axios client so 401 responses can leverage token refresh.
        const response = await api.get<Blob>(url, { responseType: 'blob' })
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
        const blobUrl = window.URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl)
    },

    async getProject(projectId: string) {
        // API.md: GET /projects/:projectId
        const response = await api.get<{ project: Project }>(`/api/projects/${projectId}`)
        if (!response.data?.project) throw new Error('Project not found')
        return normalizeProjectStatus(response.data.project)
    },

    async deleteProject(projectId: string) {
        // API.md: DELETE /projects/:projectId
        const response = await api.delete<{ status?: string; error?: string; message?: string }>(`/api/projects/${projectId}`)
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        return response.data
    },

    async getPlanningStatus(projectId: string) {
        // API.md doesn't define a status-only endpoint.
        // We derive status from GET /projects/:projectId/plan when available.
        const plan = await this.getPlan(projectId)
        return plan ? 'planning_complete' : null
    },

    async getPlan(projectId: string) {
        // API.md: GET /projects/:projectId/plan (immediate polling model)
        const response = await api.get<{ plan?: any; status?: string; questions?: string[] }>(`/api/projects/${projectId}/plan`)
        return response.data?.plan ?? response.data ?? null
    },

    async getDesign(projectId: string) {
        // API.md: GET /projects/:projectId/design (immediate polling model)
        const response = await api.get<any>(`/api/projects/${projectId}/design`)
        return (response.data as any)?.design ?? (response.data as any)?.result ?? response.data
    },

    async modifyDesign(projectId: string, feedback: string, enableAutocomplete = false) {
        // API.md: PUT /projects/:projectId/design
        const response = await runGeminiRequest(() =>
            api.put<{ status: string; design?: any; error?: string; message?: string }>(
                `/api/projects/${projectId}/design`,
                { feedback, enableAutocomplete },
                { headers: getGeminiHeadersOrThrow() },
            )
        )
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        return response.data
    },

    async modifyPlan(projectId: string, feedback: string, enableAutocomplete = false) {
        // API.md: PUT /projects/:projectId/plan
        const response = await runGeminiRequest(() =>
            api.put<{ status: string; plan?: any; error?: string; message?: string }>(
                `/api/projects/${projectId}/plan`,
                { feedback, enableAutocomplete },
                { headers: getGeminiHeadersOrThrow() },
            )
        )
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        return response.data
    },

    async getProjects(owner: string) {
        // API.md: GET /projects
        const response = await api.get<{ projects: Project[] }>('/api/projects')
        return (response.data?.projects ?? []).map(normalizeProjectStatus)
    },

    async launchPreview(projectId: string) {
        const response = await api.post<{ project: string; status: string; error?: string }>(
            `/api/projects/${projectId}/preview`,
            {},
        )
        if (response.data?.error) {
            throw new Error(response.data.error)
        }
        return response.data
    },

    async getPreviewStatus(projectId: string) {
        const response = await api.get<{
            status: 'none' | 'processing' | 'ready' | 'error' | 'expired' | 'preview_stopping' | 'preview_stopped'
            frontendUrl?: string
            backendUrl?: string
            expiresAt?: string
            error?: string
        }>(`/api/projects/${projectId}/preview/status`)
        return response.data
    },

    async teardownPreview(projectId: string) {
        const response = await api.post<{ project: string; status: string; error?: string }>(
            `/api/projects/${projectId}/preview/teardown`,
            {},
        )
        if (response.data?.error) {
            throw new Error(response.data.error)
        }
        return response.data
    },

    async revertProject(projectId: string) {
        // API.md: POST /projects/:projectId/revert
        const response = await api.post<{ project: string; status: string; revertedFrom?: any }>(
            `/api/projects/${projectId}/revert`,
            {},
        )
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        return response.data
    },

    async startGithubExport(
        projectId: string,
        artifact: GithubExportArtifact,
        unwrapKey: string,
        repoName?: string,
        visibility: GithubExportVisibility = 'private',
    ) {
        const endpoint =
            artifact === 'backend'
                ? `/api/projects/${projectId}/export/backend/github`
                : `/api/projects/${projectId}/export/frontend/github`

        const body: {
            unwrapKey: string
            visibility: GithubExportVisibility
            repoName?: string
        } = {
            unwrapKey,
            visibility,
        }

        if (repoName?.trim()) {
            body.repoName = repoName.trim()
        }

        const response = await api.post<{
            project: string
            artifact: GithubExportArtifact
            status: string
            repoName?: string
            visibility?: GithubExportVisibility
            error?: string
            message?: string
        }>(endpoint, body)

        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }

        return response.data
    },

    async getGithubExportStatus(projectId: string): Promise<GithubExportStatusResponse> {
        const response = await api.get<GithubExportStatusResponse>(`/api/projects/${projectId}/export/github/status`)
        return response.data
    },

    async updateStatus(projectId: string, status: string) {
        // Not defined in API.md (status is managed server-side). Keep as no-op for now.
        console.warn('updateStatus is not exposed in API.md; ignoring', projectId, status)
        return { ok: true }
    },

    // Legacy support or if needed for specific extensions
    // Ideally we transition fully to the new endpoints
    async provideClarification(projectId: string, answers: Record<string, string>, enableAutocomplete = false) {
        // API.md: POST /projects/:projectId/clarify
        const response = await runGeminiRequest(() =>
            api.post<{ status: string; plan?: any; questions?: string[]; error?: string; message?: string }>(
                `/api/projects/${projectId}/clarify`,
                { answers, enableAutocomplete },
                { headers: getGeminiHeadersOrThrow() },
            )
        )
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        return response.data
    }
}

// Keep the existing default export for any legacy imports.
// This is *not* used by our concept-server calls.
export default api
