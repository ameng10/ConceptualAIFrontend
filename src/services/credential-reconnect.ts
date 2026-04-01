export type CredentialReconnectDetail = {
  title?: string
  message?: string
}

export const CREDENTIAL_RECONNECT_EVENT = 'credential:reconnect-required'

export function requestCredentialReconnect(detail: CredentialReconnectDetail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<CredentialReconnectDetail>(CREDENTIAL_RECONNECT_EVENT, { detail }))
}
