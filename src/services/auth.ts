import { AxiosError } from 'axios'
import { api } from './http'

/**
 * Authentication API functions (modeled after the provided conceptual/lib example)
 */

export interface LoginResponse {
  user: string
  accessToken: string
  refreshToken: string
}

export interface RegisterResponse {
  user: string
  accessToken: string
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

export interface AuthError {
  error?: string
  message?: string
}

// Use API.md REST endpoints (/auth/*).
const USE_CLASSIC_AUTH_ROUTES = true

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    if (USE_CLASSIC_AUTH_ROUTES) {
  const response = await api.post<LoginResponse>('/api/auth/login', { email, password })
      return response.data
    }

    // Concept Server route
    const response = await api.post<LoginResponse & { error?: string; message?: string }>(
      '/api/UserAuthenticating/login',
      { email, password },
    )

    // Some concept endpoints return 200 with an { error } payload.
    // Treat that as a failed login.
    if ((response.data as any)?.error || (response.data as any)?.message) {
      const msg = (response.data as any).error || (response.data as any).message || 'Login failed'
      throw new Error(msg)
    }

    return response.data
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const data = error.response.data as AuthError
      throw new Error(data.error || data.message || 'Login failed')
    }
    throw new Error('Login failed. Please try again.')
  }
}

export async function register(
  email: string,
  password: string,
  name?: string,
  username?: string,
): Promise<RegisterResponse> {
  try {
    if (USE_CLASSIC_AUTH_ROUTES) {
      const body: any = { email, password }
      if (name) body.name = name
      if (username) body.username = username
  const response = await api.post<RegisterResponse>('/api/auth/register', body)
      return response.data
    }

  const response = await api.post<Partial<RegisterResponse> & { user?: string; error?: string; message?: string }>(
      '/api/UserAuthenticating/register',
      {
      email,
      password,
      name,
      username,
      },
    )

    if ((response.data as any)?.error || (response.data as any)?.message) {
      const msg = (response.data as any).error || (response.data as any).message || 'Registration failed'
      throw new Error(msg)
    }

    // Some implementations only return { user } on register.
    if ((response.data as any)?.user && !(response.data as any)?.accessToken) {
      return {
        user: (response.data as any).user,
        accessToken: '',
        refreshToken: '',
      }
    }

    return response.data as RegisterResponse
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const data = error.response.data as AuthError
      throw new Error(data.error || data.message || 'Registration failed')
    }
    if (error instanceof Error) {
      throw new Error(error.message || 'Registration failed')
    }
    throw new Error('Registration failed. Please try again.')
  }
}

export async function refreshTokens(refreshToken: string): Promise<RefreshResponse> {
  try {
    let data: any

    if (USE_CLASSIC_AUTH_ROUTES) {
      const response = await api.post<RefreshResponse>('/api/auth/refresh', { refreshToken })
      data = response.data
    } else {
      // Try concept server refresh if implemented (common naming: UserSessioning/refresh)
      const response = await api.post<RefreshResponse & { error?: string; message?: string }>(
        '/api/UserSessioning/refresh',
        { refreshToken },
      )
      data = response.data
    }

    // Some endpoints return 200 with an error payload instead of an HTTP error status.
    if (data?.error || data?.message) {
      const msg = data.error || data.message || 'Token refresh failed'
      throw new Error(msg)
    }

    // Validate that the response actually contains usable tokens.
    // The backend might return fields under different names; try common alternatives.
    const accessToken: string | undefined =
      data?.accessToken || data?.access_token || data?.token
    const newRefreshToken: string | undefined =
      data?.refreshToken || data?.refresh_token

    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('Token refresh did not return a valid access token')
    }
    if (!newRefreshToken || typeof newRefreshToken !== 'string') {
      throw new Error('Token refresh did not return a valid refresh token')
    }

    return { accessToken, refreshToken: newRefreshToken }
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const data = error.response.data as AuthError
      throw new Error(data.error || data.message || 'Token refresh failed')
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Token refresh failed. Please try again.')
  }
}

export async function logout(accessToken: string): Promise<void> {
  try {
    if (USE_CLASSIC_AUTH_ROUTES) {
  await api.post('/api/auth/logout', {}, { headers: { Authorization: `Bearer ${accessToken}` } })
      return
    }

    await api.post('/api/UserSessioning/delete', { accessToken })
  } catch (error) {
    // Don’t throw on logout—client will clear storage regardless.
    console.error('Logout API call failed:', error)
  }
}

export async function getUserFromToken(accessToken: string): Promise<string> {
  try {
    if (USE_CLASSIC_AUTH_ROUTES) {
      const response = await api.post<{ user: string }>(
  '/api/auth/_getUser',
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      return response.data.user
    }

    const response = await api.post<{ user?: string; error?: string; message?: string }>(
      '/api/UserSessioning/_getUser',
      { accessToken },
    )
    if (response.data?.error || response.data?.message) {
      throw new Error(response.data.error || response.data.message || 'Token validation failed')
    }
    if (!response.data?.user) {
      throw new Error('Token validation failed')
    }
    return response.data.user
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const data = error.response.data as AuthError
      throw new Error(data.error || data.message || 'Token validation failed')
    }
    throw new Error('Token validation failed. Please try again.')
  }
}
