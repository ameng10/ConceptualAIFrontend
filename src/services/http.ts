import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import {
  clearAuthData,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './auth-storage'

export type { AxiosError, AxiosRequestConfig, AxiosResponse }

// Prevent multiple simultaneous refresh attempts
let isRefreshing = false
let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

const REFRESH_TIMEOUT_MS = 30_000 // Safety: reset isRefreshing after 30s

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token)
  })
  failedQueue = []
}

function notifySessionCleared() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:session-cleared'))
  }
}

function isGithubInstallationRequired(error: AxiosError, requestUrl = ''): boolean {
  if (!requestUrl.startsWith('/api/me/github')) return false

  const status = error.response?.status
  const data = error.response?.data as { error?: string; message?: string } | undefined
  const message = String(data?.error || data?.message || '').toLowerCase()

  if (status !== 401) return false

  const mentionsGithub = message.includes('github')
  const mentionsInstallation =
    message.includes('installation') || message.includes('install') || message.includes('app')

  return mentionsGithub && mentionsInstallation
}

/** Force-clear auth and notify so the UI redirects to login. */
function forceSignOut(reason: string) {
  console.warn('[auth] Forcing sign-out:', reason)
  clearAuthData()
  notifySessionCleared()
}

/**
 * Axios client used by this Vite app.
 *
 * Important: we use relative baseURL so Vite proxy can route:
 * - /api -> http://localhost:3001 (legacy)
 * - /auth -> http://localhost:8000 with rewrite to ''
 *
 * We set baseURL to '/auth' so requests reach the backend via the /auth proxy,
 * while still allowing calling '/api/...' paths.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/',
  // Planning can take a while (LLM + tool calls). Disable the axios timeout so we wait for the backend.
  timeout: 0,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Lazy import to avoid circular deps (http -> auth -> http)
async function refreshViaApi(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  // Dynamic import avoids a circular dependency between http.ts and auth.ts
  const mod = await import('@/services/auth')
  return mod.refreshTokens(refreshToken)
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // If FormData is being sent, let axios set Content-Type boundary
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete (config.headers as any)['Content-Type']
    }

    const url = config.url || ''

    // Skip token injection for auth endpoints that don't require it
    // (support both '/auth/*' and '/api/auth/*' depending on proxy/backend setup)
    if (url.startsWith('/auth/') || url.startsWith('/api/auth/')) return config

    // Do not override explicit Authorization headers
    if ((config.headers as any)?.Authorization) return config

    const token = getAccessToken()
    if (token) {
      ;(config.headers as any).Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const originalUrl = originalRequest?.url || ''

    if (isGithubInstallationRequired(error, originalUrl)) {
      return Promise.reject(error)
    }

    // --- Handle 401 on a RETRIED request (refresh already happened but token still rejected) ---
    if (
      error.response?.status === 401 &&
      originalRequest?._retry
    ) {
      if (!originalUrl.startsWith('/auth/') && !originalUrl.startsWith('/api/auth/')) {
        // The refreshed token was still rejected – session is irrecoverable.
        forceSignOut('Retried request still returned 401 after token refresh')
        return Promise.reject(new Error('Session expired. Please sign in again.'))
      }
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      // Skip refresh for auth endpoints (avoid loops)
      if (originalUrl.startsWith('/auth/') || originalUrl.startsWith('/api/auth/')) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              ;(originalRequest.headers as any).Authorization = `Bearer ${token}`
            }
            originalRequest._retry = true
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      // Safety timeout: if the refresh never resolves, reset the flag so future
      // requests aren't permanently queued.
      if (refreshTimeoutId) clearTimeout(refreshTimeoutId)
      refreshTimeoutId = setTimeout(() => {
        if (isRefreshing) {
          console.warn('[auth] Refresh timed out – resetting isRefreshing flag')
          isRefreshing = false
          processQueue(new Error('Token refresh timed out'), null)
        }
      }, REFRESH_TIMEOUT_MS)

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        forceSignOut('No refresh token available')
        processQueue(new Error('No refresh token available'), null)
        isRefreshing = false
        if (refreshTimeoutId) { clearTimeout(refreshTimeoutId); refreshTimeoutId = null }
        return Promise.reject(new Error('Session expired. Please sign in again.'))
      }

      try {
        const result = await refreshViaApi(refreshToken)
        const newAccessToken = result?.accessToken
        const newRefreshToken = result?.refreshToken

        // Validate that the refresh actually returned usable tokens.
        if (!newAccessToken || typeof newAccessToken !== 'string') {
          throw new Error('Token refresh returned an invalid access token')
        }
        if (!newRefreshToken || typeof newRefreshToken !== 'string') {
          throw new Error('Token refresh returned an invalid refresh token')
        }

        setAccessToken(newAccessToken)
        setRefreshToken(newRefreshToken)

        if (originalRequest.headers) {
          ;(originalRequest.headers as any).Authorization = `Bearer ${newAccessToken}`
        }

        processQueue(null, newAccessToken)
        isRefreshing = false
        if (refreshTimeoutId) { clearTimeout(refreshTimeoutId); refreshTimeoutId = null }
        return apiClient(originalRequest)
      } catch (refreshError) {
        forceSignOut('Token refresh failed')
        processQueue(refreshError, null)
        isRefreshing = false
        if (refreshTimeoutId) { clearTimeout(refreshTimeoutId); refreshTimeoutId = null }
        return Promise.reject(
          refreshError instanceof Error
            ? refreshError
            : new Error('Session expired. Please sign in again.'),
        )
      }
    }

    return Promise.reject(error)
  },
)

export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => apiClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => apiClient.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => apiClient.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => apiClient.delete<T>(url, config),
}

export default apiClient
