import { computed, ref } from 'vue'
import { AxiosError } from 'axios'
import { api } from './http'

export type GeminiTier = '1' | '2' | '3'
export type GeminiCredentialErrorCode =
  | 'missing_stored_credential'
  | 'missing_unwrap_key'
  | 'invalid_unwrap_key'
  | 'provider_unavailable'
  | 'invalid_tier'
  | 'status_unavailable'
  | 'unknown'

export interface GeminiKdfParams {
  algorithm: 'PBKDF2'
  iterations: number
  hash?: 'SHA-256' | 'SHA-384' | 'SHA-512'
  keyLength?: number
}

export interface StoredGeminiCredentialMetadata {
  kdfSalt: string
  kdfParams: GeminiKdfParams
  encryptionVersion: string
  geminiTier: GeminiTier
}

export type GeminiCredentialStatusResponse =
  | { hasGeminiCredential: false }
  | ({ hasGeminiCredential: true } & StoredGeminiCredentialMetadata)

export type GeminiActionRequiredDetail = {
  reason: GeminiCredentialErrorCode
  title: string
  message: string
}

type SaveGeminiCredentialInput = {
  accountPassword: string
  geminiApiKey: string
  geminiTier: GeminiTier
}

const DEFAULT_ENCRYPTION_VERSION = 'v1'
const DEFAULT_KDF_ITERATIONS = 600_000
const DEFAULT_KDF_HASH: GeminiKdfParams['hash'] = 'SHA-256'
const DEFAULT_KEY_LENGTH_BYTES = 32
const DEFAULT_TIER: GeminiTier = '2'

const hasStoredGeminiCredential = ref(false)
const geminiCredentialMetadata = ref<StoredGeminiCredentialMetadata | null>(null)
const geminiUnwrapKey = ref('')
const geminiCredentialStatusLoaded = ref(false)

export class GeminiCredentialError extends Error {
  code: GeminiCredentialErrorCode
  shouldRedirectToSettings: boolean
  shouldNotify: boolean

  constructor(
    code: GeminiCredentialErrorCode,
    message: string,
    options?: {
      shouldRedirectToSettings?: boolean
      shouldNotify?: boolean
    },
  ) {
    super(message)
    this.name = 'GeminiCredentialError'
    this.code = code
    this.shouldRedirectToSettings = options?.shouldRedirectToSettings ?? false
    this.shouldNotify = options?.shouldNotify ?? false
  }
}

function emitGeminiActionRequired(detail: GeminiActionRequiredDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<GeminiActionRequiredDetail>('gemini:action-required', { detail }))
}

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

function normalizeGeminiTier(value: unknown): GeminiTier | null {
  return value === '1' || value === '2' || value === '3' ? value : null
}

function normalizeKdfParams(input: unknown): GeminiKdfParams {
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

function createDefaultKdfParams(): GeminiKdfParams {
  return {
    algorithm: 'PBKDF2',
    iterations: DEFAULT_KDF_ITERATIONS,
    hash: DEFAULT_KDF_HASH,
    keyLength: DEFAULT_KEY_LENGTH_BYTES,
  }
}

function applyGeminiCredentialStatus(status: GeminiCredentialStatusResponse) {
  geminiCredentialStatusLoaded.value = true

  if (!status.hasGeminiCredential) {
    hasStoredGeminiCredential.value = false
    geminiCredentialMetadata.value = null
    geminiUnwrapKey.value = ''
    return
  }

  hasStoredGeminiCredential.value = true
  geminiCredentialMetadata.value = {
    kdfSalt: status.kdfSalt,
    kdfParams: normalizeKdfParams(status.kdfParams),
    encryptionVersion: status.encryptionVersion,
    geminiTier: status.geminiTier,
  }
}

function buildRequiredActionError(
  code: GeminiCredentialErrorCode,
  message: string,
  title = 'Gemini credentials required',
) {
  const error = new GeminiCredentialError(code, message, {
    shouldRedirectToSettings: true,
    shouldNotify: true,
  })

  emitGeminiActionRequired({ reason: code, title, message })
  return error
}

async function deriveUnwrapKeyFromMetadata(
  password: string,
  metadata: StoredGeminiCredentialMetadata,
): Promise<string> {
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

async function encryptGeminiApiKey(geminiApiKey: string, unwrapKeyB64: string, ivB64: string): Promise<string> {
  const keyBytes = base64ToBytes(unwrapKeyB64)
  const ivBytes = base64ToBytes(ivB64)
  const cryptoKey = await crypto.subtle.importKey('raw', toArrayBuffer(keyBytes), { name: 'AES-GCM' }, false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
    cryptoKey,
    new TextEncoder().encode(geminiApiKey),
  )
  return bytesToBase64(new Uint8Array(encrypted))
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof GeminiCredentialError) return error.message
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    return data?.error || data?.message || error.message
  }
  return error instanceof Error ? error.message : 'Gemini request failed.'
}

function maybeMapGeminiCredentialError(error: unknown): GeminiCredentialError | null {
  if (error instanceof GeminiCredentialError) return error

  const axiosError = error instanceof AxiosError ? error : null
  const status = axiosError?.response?.status
  const data = axiosError?.response?.data as { error?: string; message?: string } | undefined
  const message = (data?.error || data?.message || extractErrorMessage(error)).trim()
  const lowered = message.toLowerCase()

  if (status === 404 && lowered.includes('stored gemini credential not found')) {
    return buildRequiredActionError(
      'missing_stored_credential',
      'Add your Gemini credentials in Settings to continue.',
    )
  }

  if (status === 401 && lowered.includes('invalid gemini unwrap key')) {
    geminiUnwrapKey.value = ''
    return buildRequiredActionError(
      'invalid_unwrap_key',
      'Your Gemini credentials need to be reconnected. Re-enter your account password in Settings to continue.',
      'Reconnect Gemini credentials',
    )
  }

  if (status === 400 && lowered.includes('missing required header: x-gemini-unwrap-key')) {
    geminiUnwrapKey.value = ''
    return buildRequiredActionError(
      'missing_unwrap_key',
      'Reconnect your Gemini credentials in Settings to continue.',
      'Reconnect Gemini credentials',
    )
  }

  if (status === 503) {
    return new GeminiCredentialError(
      'provider_unavailable',
      message || 'Gemini verification is temporarily unavailable. Please retry.',
    )
  }

  if (status === 400 && lowered.includes('tier')) {
    return new GeminiCredentialError(
      'invalid_tier',
      message || 'The selected Gemini tier is invalid for this request.',
    )
  }

  return null
}

async function fetchGeminiCredentialStatus(): Promise<GeminiCredentialStatusResponse> {
  const response = await api.get<GeminiCredentialStatusResponse>('/api/me/gemini-credential')
  applyGeminiCredentialStatus(response.data)
  return response.data
}

export function clearGeminiCredentialState() {
  hasStoredGeminiCredential.value = false
  geminiCredentialMetadata.value = null
  geminiUnwrapKey.value = ''
  geminiCredentialStatusLoaded.value = false
}

export function clearGeminiUnwrapKey() {
  geminiUnwrapKey.value = ''
}

export async function syncGeminiCredentialStatus(): Promise<GeminiCredentialStatusResponse> {
  return await fetchGeminiCredentialStatus()
}

export async function initializeGeminiCredentialSession(password: string): Promise<void> {
  const status = await fetchGeminiCredentialStatus()
  if (!status.hasGeminiCredential) {
    geminiUnwrapKey.value = ''
    return
  }

  geminiUnwrapKey.value = await deriveUnwrapKeyFromMetadata(password, {
    kdfSalt: status.kdfSalt,
    kdfParams: normalizeKdfParams(status.kdfParams),
    encryptionVersion: status.encryptionVersion,
    geminiTier: status.geminiTier,
  })
}

export async function unlockStoredGeminiCredential(accountPassword: string): Promise<void> {
  if (!geminiCredentialMetadata.value) {
    await fetchGeminiCredentialStatus()
  }

  if (!hasStoredGeminiCredential.value || !geminiCredentialMetadata.value) {
    throw buildRequiredActionError(
      'missing_stored_credential',
      'Add your Gemini credentials in Settings before reconnecting them.',
    )
  }

  geminiUnwrapKey.value = await deriveUnwrapKeyFromMetadata(accountPassword, geminiCredentialMetadata.value)
}

export async function saveGeminiCredential({
  accountPassword,
  geminiApiKey,
  geminiTier,
}: SaveGeminiCredentialInput): Promise<GeminiCredentialStatusResponse> {
  const trimmedApiKey = geminiApiKey.trim()
  const trimmedPassword = accountPassword
  const normalizedTier = normalizeGeminiTier(geminiTier)

  if (!trimmedPassword) {
    throw new GeminiCredentialError('unknown', 'Account password is required.')
  }

  if (!trimmedApiKey) {
    throw new GeminiCredentialError('unknown', 'Gemini API key is required.')
  }

  if (!normalizedTier) {
    throw new GeminiCredentialError('invalid_tier', 'Select Gemini tier 1, 2, or 3.')
  }

  const kdfSalt = randomBase64(16)
  const iv = randomBase64(12)
  const kdfParams = createDefaultKdfParams()
  const metadata: StoredGeminiCredentialMetadata = {
    kdfSalt,
    kdfParams,
    encryptionVersion: DEFAULT_ENCRYPTION_VERSION,
    geminiTier: normalizedTier,
  }
  const unwrapKey = await deriveUnwrapKeyFromMetadata(trimmedPassword, metadata)
  const ciphertext = await encryptGeminiApiKey(trimmedApiKey, unwrapKey, iv)

  try {
    const response = await api.put<GeminiCredentialStatusResponse>(
      '/api/me/gemini-credential',
      {
        accountPassword: trimmedPassword,
        ciphertext,
        iv,
        kdfSalt,
        kdfParams,
        encryptionVersion: DEFAULT_ENCRYPTION_VERSION,
      },
      {
        headers: {
          'X-Gemini-Api-Key': trimmedApiKey,
          'X-Gemini-Tier': normalizedTier,
        },
      },
    )

    applyGeminiCredentialStatus(response.data)
    geminiUnwrapKey.value = unwrapKey
    return response.data
  } catch (error) {
    const mapped = maybeMapGeminiCredentialError(error)
    if (mapped) throw mapped
    throw error
  }
}

export async function deleteGeminiCredential(): Promise<void> {
  await api.delete('/api/me/gemini-credential')
  applyGeminiCredentialStatus({ hasGeminiCredential: false })
}

export function getGeminiHeadersOrThrow(): Record<string, string> {
  if (!geminiCredentialStatusLoaded.value) {
    throw new GeminiCredentialError(
      'status_unavailable',
      'Gemini credential status is still loading. Please try again in a moment.',
    )
  }

  if (!hasStoredGeminiCredential.value || !geminiCredentialMetadata.value) {
    throw buildRequiredActionError(
      'missing_stored_credential',
      'Add your Gemini credentials in Settings to continue.',
    )
  }

  if (!geminiUnwrapKey.value.trim()) {
    throw buildRequiredActionError(
      'missing_unwrap_key',
      'Reconnect your Gemini credentials in Settings by re-entering your password to continue.',
      'Reconnect Gemini credentials',
    )
  }

  return {
    'X-Gemini-Unwrap-Key': geminiUnwrapKey.value.trim(),
  }
}

export function normalizeGeminiRequestError(error: unknown): never {
  const mapped = maybeMapGeminiCredentialError(error)
  if (mapped) throw mapped
  throw error
}

export function isGeminiCredentialError(error: unknown): error is GeminiCredentialError {
  return error instanceof GeminiCredentialError
}

export function useGeminiCredentials() {
  const hasUnwrapKey = computed(() => geminiUnwrapKey.value.trim().length > 0)
  const needsReconnect = computed(() => hasStoredGeminiCredential.value && !hasUnwrapKey.value)
  const geminiTier = computed(() => geminiCredentialMetadata.value?.geminiTier ?? DEFAULT_TIER)

  return {
    hasStoredGeminiCredential,
    geminiCredentialMetadata,
    geminiUnwrapKey,
    geminiCredentialStatusLoaded,
    hasUnwrapKey,
    needsReconnect,
    geminiTier,
  }
}
