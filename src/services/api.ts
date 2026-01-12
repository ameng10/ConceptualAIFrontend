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
    status: 'planning' | 'designing' | 'implementing' | 'syncing' | 'assembling' | 'complete' | 'error' | 'awaiting_clarification' | 'awaiting_input'
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
    async create(owner: string, projectId: string, name: string, description: string) {
        // Concept: ProjectLedger on Port 8000
    const response = await api.post<{ project: string }>('/api/ProjectLedger/create', {
            owner,
            project: projectId,
            name,
            description
        })
        return response.data
    },

    async getProjects(owner: string) {
        // Concept: ProjectLedger on Port 8000
    const response = await api.post<ProjectListResponse[]>('/api/ProjectLedger/_getProjects', { owner })
        return response.data.map(item => item.projects)
    },

    async updateStatus(projectId: string, status: string) {
        // Concept: ProjectLedger on Port 8000
    const response = await api.post('/api/ProjectLedger/updateStatus', {
            project: projectId,
            status
        })
        return response.data
    },

    // Legacy support or if needed for specific extensions
    // Ideally we transition fully to the new endpoints
    async provideClarification(projectId: string, answers: Record<string, string>) {
        // This might need a new endpoint or be handled differently in the new architecture
        // For now keeping it compatible if the backend still supports it or if we mock it
        console.warn('provideClarification not fully specified in new API docs', projectId, answers)
        // Placeholder return
        return { success: true }
    }
}

// Keep the existing default export for any legacy imports.
// This is *not* used by our concept-server calls.
export default api
