import { computed, ref } from 'vue'
import { AxiosError } from 'axios'
import { api } from './http'
import { requestCredentialReconnect } from './credential-reconnect'
import { useGeminiCredentials } from './gemini-credentials'

export interface GithubKdfParams {
  algorithm: 'PBKDF2'
  iterations: number
  hash?: 'SHA-256' | 'SHA-384' | 'SHA-512'
  keyLength?: number
}

type SharedVaultMetadata = {
  kdfSalt: string
  kdfParams: GithubKdfParams
  encryptionVersion: string
}

export interface GithubPermissions {
  [permission: string]: string
}

export interface StoredGithubCredentialMetadata extends SharedVaultMetadata {
  githubLogin: string
  externalAccountId: string
  githubInstallationId?: string
  githubPermissions?: GithubPermissions
  githubTokenType?: string
  githubAccessTokenExpiresAt?: string
  githubRefreshTokenExpiresAt?: string
}

export type GithubCredentialStatusResponse =
  | { hasGithubCredential: false }
  | ({ hasGithubCredential: true } & StoredGithubCredentialMetadata)

export type GithubLinkStartResponse = {
  statusCode: number
  authorizationUrl: string
  stateExpiresAt?: string
}

export type GithubOAuthCallbackCredential = {
  accessToken: string
  refreshToken?: string
  tokenType?: string
  accessTokenExpiresAt?: string
  refreshTokenExpiresAt?: string
  githubLogin: string
  externalAccountId: string
  installationId?: string
  permissions?: GithubPermissions
}

type CompleteGithubLinkInput = {
  accountPassword: string
  githubCredential: GithubOAuthCallbackCredential
}

const DEFAULT_ENCRYPTION_VERSION = 'v1'
const DEFAULT_KDF_ITERATIONS = 600_000
const DEFAULT_KDF_HASH: GithubKdfParams['hash'] = 'SHA-256'
const DEFAULT_KEY_LENGTH_BYTES = 32

const hasStoredGithubCredential = ref(false)
const githubCredentialMetadata = ref<StoredGithubCredentialMetadata | null>(null)
const githubUnwrapKey = ref('')
const githubCredentialStatusLoaded = ref(false)

const geminiCredentials = useGeminiCredentials()

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(normalized + padding)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function randomBase64(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return bytesToBase64(bytes)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function normalizeKdfParams(input: unknown): GithubKdfParams {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const iterations = Number(raw.iterations)
  const hash = raw.hash === 'SHA-384' || raw.hash === 'SHA-512' ? raw.hash : DEFAULT_KDF_HASH
  const keyLengthRaw = Number(raw.keyLength)
  const keyLength =
    Number.isFinite(keyLengthRaw) && keyLengthRaw > 0
      ? keyLengthRaw > 64
        ? Math.round(keyLengthRaw / 8)
        : Math.round(keyLengthRaw)
      : DEFAULT_KEY_LENGTH_BYTES

  return {
    algorithm: 'PBKDF2',
    iterations: Number.isFinite(iterations) && iterations > 0 ? Math.round(iterations) : DEFAULT_KDF_ITERATIONS,
    hash,
    keyLength,
  }
}

function createDefaultKdfParams(): GithubKdfParams {
  return {
    algorithm: 'PBKDF2',
    iterations: DEFAULT_KDF_ITERATIONS,
    hash: DEFAULT_KDF_HASH,
    keyLength: DEFAULT_KEY_LENGTH_BYTES,
  }
}

function normalizePermissions(value: unknown): GithubPermissions {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key.trim().length > 0)
      .map(([key, permissionValue]) => [key, String(permissionValue ?? '')]),
  )
}

function getGeminiVaultMetadata(): SharedVaultMetadata | null {
  const metadata = geminiCredentials.geminiCredentialMetadata.value
  if (!metadata) return null
  return {
    kdfSalt: metadata.kdfSalt,
    kdfParams: normalizeKdfParams(metadata.kdfParams),
    encryptionVersion: metadata.encryptionVersion,
  }
}

function sameVaultMetadata(left: SharedVaultMetadata | null, right: SharedVaultMetadata | null): boolean {
  if (!left || !right) return false
  return (
    left.kdfSalt === right.kdfSalt &&
    left.encryptionVersion === right.encryptionVersion &&
    left.kdfParams.iterations === right.kdfParams.iterations &&
    (left.kdfParams.hash ?? DEFAULT_KDF_HASH) === (right.kdfParams.hash ?? DEFAULT_KDF_HASH) &&
    (left.kdfParams.keyLength ?? DEFAULT_KEY_LENGTH_BYTES) === (right.kdfParams.keyLength ?? DEFAULT_KEY_LENGTH_BYTES)
  )
}

function getExistingVaultMetadata(): SharedVaultMetadata | null {
  if (githubCredentialMetadata.value) {
    return {
      kdfSalt: githubCredentialMetadata.value.kdfSalt,
      kdfParams: normalizeKdfParams(githubCredentialMetadata.value.kdfParams),
      encryptionVersion: githubCredentialMetadata.value.encryptionVersion,
    }
  }

  return getGeminiVaultMetadata()
}

function applyGithubCredentialStatus(status: GithubCredentialStatusResponse) {
  githubCredentialStatusLoaded.value = true

  if (!status.hasGithubCredential) {
    hasStoredGithubCredential.value = false
    githubCredentialMetadata.value = null
    githubUnwrapKey.value = ''
    return
  }

  const nextMetadata: StoredGithubCredentialMetadata = {
    kdfSalt: status.kdfSalt,
    kdfParams: normalizeKdfParams(status.kdfParams),
    encryptionVersion: status.encryptionVersion,
    githubLogin: status.githubLogin,
    externalAccountId: status.externalAccountId,
    githubInstallationId: status.githubInstallationId,
    githubPermissions: normalizePermissions(status.githubPermissions),
    githubTokenType: typeof status.githubTokenType === 'string' ? status.githubTokenType : '',
    githubAccessTokenExpiresAt:
      typeof status.githubAccessTokenExpiresAt === 'string' ? status.githubAccessTokenExpiresAt : '',
    githubRefreshTokenExpiresAt:
      typeof status.githubRefreshTokenExpiresAt === 'string' ? status.githubRefreshTokenExpiresAt : '',
  }

  hasStoredGithubCredential.value = true
  githubCredentialMetadata.value = nextMetadata

  const geminiVaultMetadata = getGeminiVaultMetadata()
  if (
    geminiCredentials.geminiUnwrapKey.value.trim() &&
    sameVaultMetadata(geminiVaultMetadata, {
      kdfSalt: nextMetadata.kdfSalt,
      kdfParams: nextMetadata.kdfParams,
      encryptionVersion: nextMetadata.encryptionVersion,
    })
  ) {
    githubUnwrapKey.value = geminiCredentials.geminiUnwrapKey.value.trim()
  }
}

async function deriveUnwrapKeyFromMetadata(password: string, metadata: SharedVaultMetadata): Promise<string> {
  const passwordBytes = new TextEncoder().encode(password)
  const saltBytes = base64ToBytes(metadata.kdfSalt)
  const baseKey = await crypto.subtle.importKey('raw', toArrayBuffer(passwordBytes), 'PBKDF2', false, ['deriveBits'])
  const keyLengthBits = (metadata.kdfParams.keyLength ?? DEFAULT_KEY_LENGTH_BYTES) * 8
  const hash = metadata.kdfParams.hash ?? DEFAULT_KDF_HASH
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(saltBytes),
      iterations: metadata.kdfParams.iterations,
      hash,
    },
    baseKey,
    keyLengthBits,
  )

  return bytesToBase64(new Uint8Array(bits))
}

async function encryptGithubCredentialPayload(payloadJson: string, unwrapKeyB64: string, ivB64: string): Promise<string> {
  const keyBytes = base64ToBytes(unwrapKeyB64)
  const ivBytes = base64ToBytes(ivB64)
  const cryptoKey = await crypto.subtle.importKey('raw', toArrayBuffer(keyBytes), { name: 'AES-GCM' }, false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
    cryptoKey,
    new TextEncoder().encode(payloadJson),
  )
  return bytesToBase64(new Uint8Array(encrypted))
}

function toGithubErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    return data?.error || data?.message || error.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

async function fetchGithubCredentialStatus(): Promise<GithubCredentialStatusResponse> {
  const response = await api.get<GithubCredentialStatusResponse>('/api/me/github')
  applyGithubCredentialStatus(response.data)
  return response.data
}

export function clearGithubCredentialState() {
  hasStoredGithubCredential.value = false
  githubCredentialMetadata.value = null
  githubUnwrapKey.value = ''
  githubCredentialStatusLoaded.value = false
}

export async function syncGithubCredentialStatus(): Promise<GithubCredentialStatusResponse> {
  return await fetchGithubCredentialStatus()
}

export async function initializeGithubCredentialSession(password: string): Promise<void> {
  const status = await fetchGithubCredentialStatus()
  if (!status.hasGithubCredential) {
    githubUnwrapKey.value = ''
    return
  }

  githubUnwrapKey.value = await deriveUnwrapKeyFromMetadata(password, {
    kdfSalt: status.kdfSalt,
    kdfParams: normalizeKdfParams(status.kdfParams),
    encryptionVersion: status.encryptionVersion,
  })
}

export async function unlockStoredGithubCredential(accountPassword: string): Promise<void> {
  if (!githubCredentialMetadata.value) {
    await fetchGithubCredentialStatus()
  }

  if (!hasStoredGithubCredential.value || !githubCredentialMetadata.value) {
    throw new Error('Link a GitHub account before reconnecting it.')
  }

  githubUnwrapKey.value = await deriveUnwrapKeyFromMetadata(accountPassword, {
    kdfSalt: githubCredentialMetadata.value.kdfSalt,
    kdfParams: normalizeKdfParams(githubCredentialMetadata.value.kdfParams),
    encryptionVersion: githubCredentialMetadata.value.encryptionVersion,
  })
}

export async function startGithubLink(frontendOrigin: string, returnPath = '/settings'): Promise<GithubLinkStartResponse> {
  const trimmedOrigin = frontendOrigin.trim()
  if (!trimmedOrigin) {
    throw new Error('Frontend origin is required to start GitHub linking.')
  }

  const response = await api.post<GithubLinkStartResponse>('/api/me/github/link/start', {
    frontendOrigin: trimmedOrigin,
    returnPath,
  })
  return response.data
}

export async function completeGithubLink({
  accountPassword,
  githubCredential,
}: CompleteGithubLinkInput): Promise<GithubCredentialStatusResponse> {
  const trimmedPassword = accountPassword
  const accessToken = githubCredential.accessToken.trim()
  const githubLogin = githubCredential.githubLogin.trim()
  const externalAccountId = githubCredential.externalAccountId.trim()

  if (!trimmedPassword) {
    throw new Error('Account password is required to finish linking GitHub.')
  }

  if (!accessToken || !githubLogin || !externalAccountId) {
    throw new Error('GitHub authorization is incomplete. Please retry the connect flow.')
  }

  const existingVaultMetadata = getExistingVaultMetadata()
  const vaultMetadata: SharedVaultMetadata = existingVaultMetadata ?? {
    kdfSalt: randomBase64(16),
    kdfParams: createDefaultKdfParams(),
    encryptionVersion: DEFAULT_ENCRYPTION_VERSION,
  }

  const unwrapKey = await deriveUnwrapKeyFromMetadata(trimmedPassword, vaultMetadata)
  const iv = randomBase64(12)
  const permissions = normalizePermissions(githubCredential.permissions)
  const plaintextCredential = JSON.stringify({
    accessToken,
    refreshToken: githubCredential.refreshToken?.trim() || '',
    tokenType: githubCredential.tokenType?.trim() || '',
    login: githubLogin,
    externalAccountId,
    installationId: githubCredential.installationId?.trim() || '',
    permissions,
    accessTokenExpiresAt: githubCredential.accessTokenExpiresAt?.trim() || '',
    refreshTokenExpiresAt: githubCredential.refreshTokenExpiresAt?.trim() || '',
  })
  const ciphertext = await encryptGithubCredentialPayload(plaintextCredential, unwrapKey, iv)

  try {
    const response = await api.post<GithubCredentialStatusResponse>('/api/me/github/link/complete', {
      accountPassword: trimmedPassword,
      ciphertext,
      iv,
      kdfSalt: vaultMetadata.kdfSalt,
      kdfParams: vaultMetadata.kdfParams,
      encryptionVersion: vaultMetadata.encryptionVersion,
      externalAccountId,
      githubLogin,
      installationId: githubCredential.installationId?.trim() || undefined,
      permissions,
      tokenType: githubCredential.tokenType?.trim() || undefined,
      accessTokenExpiresAt: githubCredential.accessTokenExpiresAt?.trim() || undefined,
      refreshTokenExpiresAt: githubCredential.refreshTokenExpiresAt?.trim() || undefined,
    })

    applyGithubCredentialStatus(response.data)
    githubUnwrapKey.value = unwrapKey
    return response.data
  } catch (error) {
    throw new Error(toGithubErrorMessage(error, 'Failed to store the linked GitHub account.'))
  }
}

export async function deleteGithubCredential(): Promise<void> {
  await api.delete('/api/me/github')
  applyGithubCredentialStatus({ hasGithubCredential: false })
}

export function getSharedVaultUnwrapKey(): string {
  return githubUnwrapKey.value.trim() || geminiCredentials.geminiUnwrapKey.value.trim()
}

export function getSharedVaultUnwrapKeyOrThrow(): string {
  const unwrapKey = getSharedVaultUnwrapKey()
  if (!unwrapKey) {
    requestCredentialReconnect({
      title: 'Reconnect credentials',
      message: 'Re-enter your account password to continue exporting to GitHub.',
    })
    throw new Error('Reconnect your account credentials by re-entering your password before exporting to GitHub.')
  }
  return unwrapKey
}

export function useGithubCredentials() {
  const hasUnwrapKey = computed(
    () => githubUnwrapKey.value.trim().length > 0 || geminiCredentials.geminiUnwrapKey.value.trim().length > 0,
  )
  const needsReconnect = computed(() => hasStoredGithubCredential.value && !hasUnwrapKey.value)

  return {
    hasStoredGithubCredential,
    githubCredentialMetadata,
    githubUnwrapKey,
    githubCredentialStatusLoaded,
    hasUnwrapKey,
    needsReconnect,
  }
}
