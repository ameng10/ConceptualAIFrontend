/**
 * Client-side authentication storage utilities
 * Handles localStorage operations safely (SSR-friendly)
 */

const USER_ID_KEY = 'conceptual_user_id'
const USERNAME_KEY = 'conceptual_username'
const ACCESS_TOKEN_KEY = 'conceptual_access_token'
const REFRESH_TOKEN_KEY = 'conceptual_refresh_token'

const isBrowser = () => typeof window !== 'undefined'

function notifyAuthChanged() {
  if (!isBrowser()) return
  // storage events normally don't fire in the same tab; we dispatch a lightweight signal for in-tab listeners.
  window.dispatchEvent(new Event('storage'))
}

export function getUserId(): string | null {
  if (!isBrowser()) return null
  try {
    return localStorage.getItem(USER_ID_KEY)
  } catch (error) {
    console.error('Error reading user id from localStorage:', error)
    return null
  }
}

export function getUsername(): string | null {
  if (!isBrowser()) return null
  try {
    return localStorage.getItem(USERNAME_KEY)
  } catch (error) {
    console.error('Error reading username from localStorage:', error)
    return null
  }
}

export function setUsername(username: string): void {
  if (!isBrowser()) return
  try {
    if (!username) localStorage.removeItem(USERNAME_KEY)
    else localStorage.setItem(USERNAME_KEY, username)
    notifyAuthChanged()
  } catch (error) {
    console.error('Error writing username to localStorage:', error)
  }
}

export function setUserId(userId: string): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(USER_ID_KEY, userId)
  notifyAuthChanged()
  } catch (error) {
    console.error('Error writing user id to localStorage:', error)
  }
}

export function removeUserId(): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(USER_ID_KEY)
  notifyAuthChanged()
  } catch (error) {
    console.error('Error removing user id from localStorage:', error)
  }
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch (error) {
    console.error('Error reading access token from localStorage:', error)
    return null
  }
}

export function setAccessToken(token: string): void {
  if (!isBrowser()) return
  try {
  if (!token) localStorage.removeItem(ACCESS_TOKEN_KEY)
  else localStorage.setItem(ACCESS_TOKEN_KEY, token)
  notifyAuthChanged()
  } catch (error) {
    console.error('Error writing access token to localStorage:', error)
  }
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch (error) {
    console.error('Error reading refresh token from localStorage:', error)
    return null
  }
}

export function setRefreshToken(token: string): void {
  if (!isBrowser()) return
  try {
  if (!token) localStorage.removeItem(REFRESH_TOKEN_KEY)
  else localStorage.setItem(REFRESH_TOKEN_KEY, token)
  notifyAuthChanged()
  } catch (error) {
    console.error('Error writing refresh token to localStorage:', error)
  }
}

export function clearAuthData(): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  notifyAuthChanged()
  } catch (error) {
    console.error('Error clearing auth data from localStorage:', error)
  }
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null && getRefreshToken() !== null
}
