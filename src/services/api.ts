import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json'
    }
})

export interface Project {
    id: string
    name: string
    description: string
    status: 'planning' | 'designing' | 'implementing' | 'syncing' | 'assembling' | 'complete' | 'error' | 'awaiting_clarification' | 'awaiting_input'
    questions?: string[]
}

export const projectApi = {
    async create(name: string, description: string) {
        const response = await api.post<{ projectId: string; status: string; questions?: string[] }>('/projects', { name, description })
        return response.data
    },

    async getStatus(projectId: string) {
        const response = await api.get<Project>(`/projects/${projectId}`)
        return response.data
    },

    async provideClarification(projectId: string, answers: Record<string, string>) {
        const response = await api.post(`/projects/${projectId}/clarify`, { answers })
        return response.data
    }
}

export default api
