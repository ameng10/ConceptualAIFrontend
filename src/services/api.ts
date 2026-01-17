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
    status:
        | 'planning'
    | 'planning_complete'
        | 'designing'
        | 'design_complete'
        | 'implementing'
        | 'syncing'
        | 'assembling'
        | 'complete'
        | 'error'
        | 'awaiting_clarification'
        | 'awaiting_input'
    createdAt?: string
    updatedAt?: string
}

export interface ProjectListResponse {
    projects: Project
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
    return { user, username: username ?? undefined, accessToken: accessToken ?? '', refreshToken: refreshToken ?? '' }
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
    const res = await authFns.login(email, password)
    authState.set(res)
    return res
    },

    async logout() {
        const accessToken = getAccessToken()
        if (accessToken) {
            await authFns.logout(accessToken)
        }
        authState.clear()
    }
}

export const projectApi = {
    async create(owner: string, name: string, description: string) {
        // API.md: POST /projects (auth required)
    const response = await api.post<any>(
            '/api/projects',
            { name, description },
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

    async startDesign(projectId: string, plan: any) {
        // Not yet documented in API.md; aligns with the agent pipeline (planning -> designing).
        // Expected to return status/progress payload.
        const response = await api.post<any>(`/api/projects/${projectId}/design`, { plan })
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        return response.data
    },

    async getProject(projectId: string) {
    // API.md: GET /projects/:projectId
    const response = await api.get<{ project: Project }>(`/api/projects/${projectId}`)
    if (!response.data?.project) throw new Error('Project not found')
    return response.data.project
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
    // API.md: GET /projects/:projectId/plan
    const response = await api.get<{ plan: any }>(`/api/projects/${projectId}/plan`)
    return response.data?.plan ?? null
    },

    async getDesign(projectId: string) {
        // Not documented in API.md yet; provides the finished design doc.
        // Support a few possible shapes: { design }, { result }, or the raw payload.
        const response = await api.get<any>(`/api/projects/${projectId}/design`)
        return (response.data as any)?.design ?? (response.data as any)?.result ?? response.data
    },

    async modifyPlan(projectId: string, feedback: string) {
        // API.md: PUT /projects/:projectId/plan
        const response = await api.put<{ status: string; plan?: any; error?: string; message?: string }>(
            `/api/projects/${projectId}/plan`,
            { feedback },
        )
        if ((response.data as any)?.error || (response.data as any)?.message) {
            throw new Error((response.data as any).error || (response.data as any).message)
        }
        if (!response.data?.plan) {
            throw new Error('Plan modification did not return an updated plan')
        }
        return response.data
    },

    async getProjects(owner: string) {
    // API.md: GET /projects
    const response = await api.get<{ projects: Project[] }>('/api/projects')
    return response.data?.projects ?? []
    },

    async updateStatus(projectId: string, status: string) {
    // Not defined in API.md (status is managed server-side). Keep as no-op for now.
    console.warn('updateStatus is not exposed in API.md; ignoring', projectId, status)
    return { ok: true }
    },

    // Legacy support or if needed for specific extensions
    // Ideally we transition fully to the new endpoints
    async provideClarification(projectId: string, answers: Record<string, string>) {
        // API.md: POST /projects/:projectId/clarify
        const response = await api.post<{ status: string; plan?: any; questions?: string[]; error?: string; message?: string }>(
            `/api/projects/${projectId}/clarify`,
            { answers },
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
