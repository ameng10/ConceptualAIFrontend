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
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token)
  })
  failedQueue = []
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

  // Skip token injection for auth endpoints that don't require it
  if (config.url === '/auth/register' || config.url === '/auth/login' || config.url === '/auth/refresh') return config

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

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      // Skip refresh for auth endpoints (avoid loops)
      if (originalRequest.url?.startsWith('/auth/')) {
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
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        clearAuthData()
        processQueue(new Error('No refresh token available'), null)
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        const { accessToken, refreshToken: newRefreshToken } = await refreshViaApi(refreshToken)
        setAccessToken(accessToken)
        setRefreshToken(newRefreshToken)

        if (originalRequest.headers) {
          ;(originalRequest.headers as any).Authorization = `Bearer ${accessToken}`
        }

        processQueue(null, accessToken)
        isRefreshing = false
        return apiClient(originalRequest)
      } catch (refreshError) {
        clearAuthData()
        processQueue(refreshError, null)
        isRefreshing = false
        return Promise.reject(refreshError)
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
