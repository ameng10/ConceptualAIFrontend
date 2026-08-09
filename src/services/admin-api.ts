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
  // Fall back to the NORMAL user session when no admin-realm token exists.
  // The backend authorizes /admin/* off whatever session the request carries
  // (keepAdminFrames -> Sessioning._getUser -> AdminAuthenticating._isAdmin),
  // so an allowlisted operator signing in with Google/GitHub/password is
  // already entitled — they just never have an admin-realm token. Returning an
  // explicit `Bearer ` here used to CLOBBER the good session token, because the
  // http interceptor deliberately never overrides an explicit Authorization
  // header. Empty headers let the interceptor attach the user session instead.
  const token = getAdminToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
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
  outcome?: 'complete' | 'failed' | 'aborted' | 'deleted'
  stageOutcomes: Record<string, { status: string; durationMs?: number }>
  endpoints: AdminEndpointRecord[]
  costUsd?: number | null
  costIsLowerBound?: boolean
  /** Human-facing labels joined server-side from the concepts that own them.
   *  Null when the project or account has since been deleted — the ids remain
   *  authoritative, so the UI falls back to them. */
  projectName?: string | null
  ownerEmail?: string | null
  /** Design-time credit quote for the project (revenue side) — pair with costUsd
   *  (COGS) to read a build's margin. Null once the design is gone. */
  credits?: number | null
}

export const adminApi = {
  /**
   * "Should this user see the Admin entry point?" — answers 200 with a boolean
   * for everyone (never 401/403), so ordinary users produce no console noise.
   * Purely a UI hint: every admin DATA route re-gates on the server.
   * Never throws; any failure resolves to false so the link simply stays hidden.
   */
  async amIAdmin(): Promise<boolean> {
    try {
      const res = await api.get('/api/admin/me', { headers: adminHeaders() })
      return res.data?.isAdmin === true
    } catch {
      return false
    }
  },

  /**
   * Comp an account: credits plus a tier override.
   *
   * The idempotency key is OPERATOR-SUPPLIED and minted when the form OPENS, never per
   * click. A server-minted key makes every retry a fresh comp; a key derived from the
   * target and the date silently no-ops a legitimate second comp on the same day — and
   * because an idempotent grant is a no-op rather than an error, that reads as success
   * while the customer gets nothing.
   */
  async comp(args: {
    email: string
    credits: number
    tier: string
    idempotencyKey: string
  }): Promise<void> {
    const res = await api.post('/api/admin/comp', args, { headers: adminHeaders() })
    if (res.data?.error) throw new Error(res.data.error)
  },

  /** Delete an account by email. Cancels at Stripe first, then cascades. */
  async deleteUser(email: string): Promise<void> {
    const res = await api.delete('/api/admin/users', {
      data: { email },
      headers: adminHeaders(),
    })
    if (res.data?.error) throw new Error(res.data.error)
  },

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
