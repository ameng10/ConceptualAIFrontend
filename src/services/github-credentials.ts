// GitHub connection service — thin driver over the backend's GitHubConnecting flow.
// Tokens are encrypted SERVER-SIDE and never reach the browser: there is no client
// crypto, no account-password step, no unwrap key, and no reconnect flow. The link
// handshake is backend-issued (the frontend holds zero GitHub constants): open the
// returned authorizationUrl in a popup and await a postMessage whose type/nonce match
// the returned messageType/messageNonce, then refetch status.
import { ref } from 'vue'
import { AxiosError } from 'axios'
import { api } from './http'

export interface GithubPermissions {
  [permission: string]: string
}

export interface GithubConnectionMetadata {
  login: string
  externalAccountId: string
  installationId: string
  permissions: GithubPermissions
  tokenType: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}

export type GithubConnectionStatusResponse = {
  hasConnection: boolean
  // Server-configured GitHub App install/manage URL — the frontend holds zero
  // GitHub constants, so even this link comes from the backend.
  installUrl?: string
} & Partial<GithubConnectionMetadata>

export type GithubLinkStartResponse = {
  authorizationUrl: string
  messageType: string
  messageNonce: string
  stateExpiresAt?: string
}

/** Shape of the postMessage the backend's popup callback emits (typed + nonced). */
export type GithubLinkCallbackMessage = {
  type: string
  nonce: string
  ok: boolean
  returnPath?: string
  error?: string
}

const hasStoredGithubCredential = ref(false)
const githubCredentialMetadata = ref<GithubConnectionMetadata | null>(null)
const githubCredentialStatusLoaded = ref(false)
const githubAppInstallUrl = ref('')

function normalizePermissions(value: unknown): GithubPermissions {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key.trim().length > 0)
      .map(([key, permissionValue]) => [key, String(permissionValue ?? '')]),
  )
}

function applyGithubConnectionStatus(status: GithubConnectionStatusResponse) {
  githubCredentialStatusLoaded.value = true
  if (typeof status.installUrl === 'string') {
    githubAppInstallUrl.value = status.installUrl.trim()
  }

  if (!status.hasConnection) {
    hasStoredGithubCredential.value = false
    githubCredentialMetadata.value = null
    return
  }

  hasStoredGithubCredential.value = true
  githubCredentialMetadata.value = {
    login: typeof status.login === 'string' ? status.login : '',
    externalAccountId: typeof status.externalAccountId === 'string' ? status.externalAccountId : '',
    installationId: typeof status.installationId === 'string' ? status.installationId : '',
    permissions: normalizePermissions(status.permissions),
    tokenType: typeof status.tokenType === 'string' ? status.tokenType : '',
    accessTokenExpiresAt:
      typeof status.accessTokenExpiresAt === 'string' ? status.accessTokenExpiresAt : '',
    refreshTokenExpiresAt:
      typeof status.refreshTokenExpiresAt === 'string' ? status.refreshTokenExpiresAt : '',
  }
}

function toGithubErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    return data?.error || data?.message || error.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

export function clearGithubCredentialState() {
  hasStoredGithubCredential.value = false
  githubCredentialMetadata.value = null
  githubCredentialStatusLoaded.value = false
}

export async function syncGithubCredentialStatus(): Promise<GithubConnectionStatusResponse> {
  const response = await api.get<GithubConnectionStatusResponse>('/api/me/github')
  applyGithubConnectionStatus(response.data)
  return response.data
}

export async function startGithubLink(
  frontendOrigin: string,
  returnPath = '/settings',
): Promise<GithubLinkStartResponse> {
  const trimmedOrigin = frontendOrigin.trim()
  if (!trimmedOrigin) {
    throw new Error('Frontend origin is required to start GitHub linking.')
  }

  try {
    const response = await api.post<GithubLinkStartResponse>('/api/me/github/link/start', {
      frontendOrigin: trimmedOrigin,
      returnPath,
    })
    return response.data
  } catch (error) {
    throw new Error(toGithubErrorMessage(error, 'Failed to start GitHub linking.'))
  }
}

export async function deleteGithubCredential(): Promise<void> {
  await api.delete('/api/me/github')
  applyGithubConnectionStatus({ hasConnection: false })
}

export function useGithubCredentials() {
  return {
    hasStoredGithubCredential,
    githubCredentialMetadata,
    githubCredentialStatusLoaded,
    githubAppInstallUrl,
  }
}
