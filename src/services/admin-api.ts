import { api } from './http'

// Admin session realm is separate from user auth: the token lives under its
// own storage key and is sent as an explicit Authorization header (the http
// interceptor never overrides an explicit header), so admin and user sessions
// coexist without touching each other.
const ADMIN_TOKEN_KEY = 'conceptual_admin_access_token'

export function getAdminToken(): string {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

function adminHeaders() {
  return { Authorization: `Bearer ${getAdminToken()}` }
}

export interface AdminEndpointRecord {
  name: string
  status: 'converged' | 'failed' | 'hung'
  iterations: number
  escalationPath: string[]
  failReason?: string
  hasTranscript?: boolean
}

export interface AdminBuild {
  _id: string
  project: string
  owner: string
  kind: 'build' | 'iterate'
  startedAt: string
  finishedAt?: string
  outcome?: 'complete' | 'failed' | 'aborted'
  stageOutcomes: Record<string, { status: string; durationMs?: number }>
  endpoints: AdminEndpointRecord[]
}

export const adminApi = {
  async login(email: string, password: string): Promise<void> {
    const res = await api.post('/api/admin/login', { email, password })
    const token = res.data?.accessToken
    if (!token) throw new Error(res.data?.error || 'Admin login failed')
    setAdminToken(token)
  },

  async getBuilds(opts: {
    outcome?: string
    hasFailures?: boolean
    limit?: number
    skip?: number
  } = {}): Promise<AdminBuild[]> {
    const params: Record<string, string> = {}
    if (opts.outcome) params.outcome = opts.outcome
    if (opts.hasFailures) params.hasFailures = 'true'
    if (opts.limit) params.limit = String(opts.limit)
    if (opts.skip) params.skip = String(opts.skip)
    const res = await api.get('/api/admin/builds', { params, headers: adminHeaders() })
    return res.data?.builds ?? []
  },

  async getBuild(buildId: string): Promise<AdminBuild | null> {
    const res = await api.get(`/api/admin/builds/${encodeURIComponent(buildId)}`, {
      headers: adminHeaders(),
    })
    return res.data?.build ?? null
  },

  async getTranscript(
    buildId: string,
    endpointName: string,
  ): Promise<{ transcript: string | null; truncated: boolean }> {
    const res = await api.get(
      `/api/admin/builds/${encodeURIComponent(buildId)}/endpoints/${encodeURIComponent(endpointName)}/transcript`,
      { headers: adminHeaders() },
    )
    return {
      transcript: res.data?.transcript ?? null,
      truncated: res.data?.truncated === true,
    }
  },
}
