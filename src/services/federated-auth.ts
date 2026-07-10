import { api } from './http'

/**
 * Federated sign-in (Google + GitHub) and account sign-in-method management.
 *
 * Flow: GET /auth/{provider}/start returns the provider consent URL; the browser
 * navigates there; the backend callback 302s back to /auth/callback with the
 * session pair in the URL fragment (#access=…&refresh=…) or #error=…&provider=….
 * The fragment never reaches the server (fragments aren't sent in requests).
 */

export type FederatedProvider = 'google' | 'github'

const START_PATHS: Record<FederatedProvider, string> = {
  google: '/api/auth/google/start',
  // The /login/ segment is load-bearing: /api/auth/github/callback (no /login/)
  // belongs to the repo-export connect flow.
  github: '/api/auth/github/login/start',
}

export async function startFederatedLogin(provider: FederatedProvider): Promise<void> {
  const res = await api.get<{ url?: string; error?: string }>(START_PATHS[provider])
  if (!res.data?.url) {
    throw new Error(res.data?.error || `Could not start ${provider} sign-in`)
  }
  window.location.href = res.data.url
}

export interface AuthMethods {
  email: string
  hasPassword: boolean
  google: boolean
  github: boolean
}

export async function getAuthMethods(): Promise<AuthMethods> {
  const res = await api.get<AuthMethods & { error?: string }>('/api/me/auth-methods')
  if (res.data?.error) throw new Error(res.data.error)
  return {
    email: res.data.email ?? '',
    hasPassword: res.data.hasPassword === true,
    google: res.data.google === true,
    github: res.data.github === true,
  }
}

/** Set (no oldPassword, federated-first accounts) or change (oldPassword required). */
export async function setPassword(newPassword: string, oldPassword?: string): Promise<void> {
  const body: Record<string, string> = { newPassword }
  if (oldPassword) body.oldPassword = oldPassword
  const res = await api.post<{ ok?: boolean; error?: string }>('/api/me/password', body)
  if (!res.data?.ok) {
    throw new Error(res.data?.error || 'Could not update password')
  }
}
