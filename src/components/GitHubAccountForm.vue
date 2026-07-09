<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Github, ExternalLink } from 'lucide-vue-next'
import {
  deleteGithubCredential,
  startGithubLink,
  syncGithubCredentialStatus,
  type GithubLinkCallbackMessage,
  useGithubCredentials,
} from '@/services/github-credentials'
import { getPendingGithubExport } from '@/services/github-export'
import { useToasts } from '@/services/toast'

const { push } = useToasts()
const route = useRoute()
const router = useRouter()
const {
  hasStoredGithubCredential,
  githubCredentialMetadata,
  githubCredentialStatusLoaded,
  githubAppInstallUrl, // backend-configured (GET /me/github) — no GitHub constants client-side
} = useGithubCredentials()

const loading = ref(true)
const linking = ref(false)
const disconnecting = ref(false)

const showInstallPrompt = ref(false)

const error = ref('')
const success = ref('')

let popupWindow: Window | null = null
let popupClosedPollId: number | null = null
// Backend-issued handshake contract (from link/start): the popup's postMessage must
// carry this exact type and nonce. The frontend holds no GitHub constants.
let expectedMessageType = ''
let expectedMessageNonce = ''

const statusLabel = computed(() => (hasStoredGithubCredential.value ? 'Linked' : 'Not linked'))

const permissionsText = computed(() => {
  const permissions = githubCredentialMetadata.value?.permissions ?? {}
  const entries = Object.entries(permissions).filter(([name, value]) => name && value)
  if (!entries.length) return 'Unknown'
  return entries.map(([name, value]) => `${name}: ${value}`).join(', ')
})

const formatDate = (value?: string) => {
  if (!value) return 'Unknown'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value
  return new Date(timestamp).toLocaleString()
}

const resetMessages = () => {
  error.value = ''
  success.value = ''
}

const getRequestedReturnPath = () => (typeof route.query.returnPath === 'string' ? route.query.returnPath : '')

const maybeReturnToPendingExport = async () => {
  const returnPath = getRequestedReturnPath()
  if (!returnPath) return

  const pending = getPendingGithubExport()
  if (!pending || pending.returnPath !== returnPath) return

  await router.replace(returnPath)
}

const cleanupPopup = () => {
  if (popupClosedPollId !== null) {
    window.clearInterval(popupClosedPollId)
    popupClosedPollId = null
  }

  if (popupWindow && !popupWindow.closed) {
    popupWindow.close()
  }

  popupWindow = null
}

const loadStatus = async () => {
  loading.value = true
  resetMessages()
  try {
    await syncGithubCredentialStatus()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load GitHub status.'
  } finally {
    loading.value = false
  }
}

const handlePopupMessage = async (event: MessageEvent) => {
  const payload = event.data as GithubLinkCallbackMessage | undefined
  // Match ONLY the backend-issued handshake for the link we initiated.
  if (!payload || !expectedMessageType || payload.type !== expectedMessageType) return
  if (payload.nonce !== expectedMessageNonce) return
  // The callback HTML is served from the backend origin; trust the message only
  // when it comes from the popup we opened.
  if (popupWindow && event.source !== popupWindow) return

  linking.value = false
  expectedMessageType = ''
  expectedMessageNonce = ''
  cleanupPopup()

  if (!payload.ok) {
    resetMessages()
    error.value = payload.error || 'GitHub linking failed.'
    push({
      title: 'GitHub link failed',
      message: error.value,
      kind: 'error',
      ttlMs: 6000,
    })
    return
  }

  // Connection was completed server-side — just refetch the redacted status.
  resetMessages()
  try {
    await syncGithubCredentialStatus()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to refresh GitHub status.'
    return
  }

  const login = githubCredentialMetadata.value?.login
  success.value = login ? `GitHub account @${login} linked successfully.` : 'GitHub account linked successfully.'

  const meta = githubCredentialMetadata.value
  if (meta && (!meta.installationId || !Object.keys(meta.permissions ?? {}).length)) {
    showInstallPrompt.value = true
  }

  await maybeReturnToPendingExport()
}

const beginGithubLink = async () => {
  resetMessages()
  linking.value = true

  try {
    const response = await startGithubLink(window.location.origin, getRequestedReturnPath() || '/settings')
    expectedMessageType = response.messageType
    expectedMessageNonce = response.messageNonce

    const popup = window.open(
      response.authorizationUrl,
      'conceptualai-github-link',
      'popup=yes,width=720,height=820,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes',
    )

    if (!popup) {
      throw new Error('Popup was blocked. Allow popups for this site and try again.')
    }

    popupWindow = popup
    popup.focus()

    popupClosedPollId = window.setInterval(() => {
      if (!popupWindow || popupWindow.closed) {
        if (popupClosedPollId !== null) {
          window.clearInterval(popupClosedPollId)
          popupClosedPollId = null
        }
        popupWindow = null
        if (linking.value) {
          linking.value = false
          // The user may have completed linking and closed a failure page manually —
          // refetch so the card reflects reality either way.
          void syncGithubCredentialStatus()
        }
      }
    }, 500)
  } catch (err) {
    linking.value = false
    error.value = err instanceof Error ? err.message : 'Failed to start GitHub linking.'
  }
}

const disconnectGithub = async () => {
  resetMessages()

  const confirmed = window.confirm('Disconnect the linked GitHub account from this ConceptualAI account?')
  if (!confirmed) return

  disconnecting.value = true
  try {
    await deleteGithubCredential()
    success.value = 'GitHub account disconnected.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to disconnect GitHub.'
  } finally {
    disconnecting.value = false
  }
}

const onPopupMessage = (event: MessageEvent) => {
  void handlePopupMessage(event)
}

onMounted(async () => {
  window.addEventListener('message', onPopupMessage)
  await loadStatus()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onPopupMessage)
  cleanupPopup()
})
</script>

<template>
  <section class="github-card glass">
    <div v-if="showInstallPrompt" class="modal-overlay" @click.self="showInstallPrompt = false">
      <div class="install-modal glass" role="dialog" aria-modal="true" aria-labelledby="github-install-title">
        <h3 id="github-install-title">Install the GitHub App to continue</h3>
        <p>
          GitHub connected, but ConceptualAI still cannot see an app installation or its permissions. Install the
          GitHub App on the account or organization you want to use, then reconnect GitHub.
        </p>
        <div class="modal-actions">
          <a
            v-if="githubAppInstallUrl"
            class="btn btn-primary action-btn"
            :href="githubAppInstallUrl"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink :size="16" />
            <span>Install GitHub App</span>
          </a>
          <button class="btn btn-secondary action-btn" type="button" @click="showInstallPrompt = false">
            Dismiss
          </button>
        </div>
      </div>
    </div>

    <div class="header-row">
      <div>
        <h2 class="title">GitHub account</h2>
        <p class="subtitle">
          Link your GitHub account so ConceptualAI can export generated projects to repositories when you ask it to.
          Tokens are encrypted on the server and never touch your browser.
        </p>
      </div>
      <div class="status-chip" :class="{ ready: hasStoredGithubCredential }">
        {{ statusLabel }}
      </div>
    </div>

    <div class="status-panel">
      <template v-if="loading && !githubCredentialStatusLoaded">
        <p class="status-copy">Loading GitHub connection status...</p>
      </template>
      <template v-else-if="hasStoredGithubCredential && githubCredentialMetadata">
        <p class="status-copy">
          Linked GitHub account: <strong>@{{ githubCredentialMetadata.login }}</strong>
        </p>
        <div class="status-grid">
          <div>
            <span class="meta-label">Installation</span>
            <span class="meta-value">{{ githubCredentialMetadata.installationId || 'Unknown' }}</span>
          </div>
          <div>
            <span class="meta-label">Permissions</span>
            <span class="meta-value">{{ permissionsText }}</span>
          </div>
          <div>
            <span class="meta-label">Access token expires</span>
            <span class="meta-value">{{ formatDate(githubCredentialMetadata.accessTokenExpiresAt) }}</span>
          </div>
          <div>
            <span class="meta-label">Refresh token expires</span>
            <span class="meta-value">{{ formatDate(githubCredentialMetadata.refreshTokenExpiresAt) }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <p class="status-copy">No GitHub account is linked yet.</p>
      </template>
    </div>

    <div class="actions">
      <button class="btn btn-primary action-btn" type="button" :disabled="linking" @click="beginGithubLink">
        <Github :size="16" />
        <span>
          {{
            linking
              ? 'Waiting for GitHub...'
              : hasStoredGithubCredential
                ? 'Connect a different GitHub account'
                : 'Connect GitHub'
          }}
        </span>
      </button>

      <a
        v-if="githubAppInstallUrl"
        class="btn btn-secondary action-btn"
        :href="githubAppInstallUrl"
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink :size="16" />
        <span>{{ hasStoredGithubCredential ? 'Install or Manage GitHub App' : 'Install GitHub App' }}</span>
      </a>

      <button
        v-if="hasStoredGithubCredential"
        class="btn btn-secondary action-btn"
        type="button"
        :disabled="disconnecting"
        @click="disconnectGithub"
      >
        {{ disconnecting ? 'Disconnecting...' : 'Disconnect GitHub' }}
      </button>
    </div>

    <a
      v-if="hasStoredGithubCredential && githubCredentialMetadata?.login"
      class="account-link"
      :href="`https://github.com/${githubCredentialMetadata.login}`"
      target="_blank"
      rel="noreferrer"
    >
      <ExternalLink :size="16" />
      <span>View @{{ githubCredentialMetadata.login }} on GitHub</span>
    </a>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="success" class="success-msg">{{ success }}</p>
  </section>
</template>

<style scoped>
.github-card {
  width: 100%;
  padding: 1.5rem;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.title {
  font-size: 1.125rem;
  margin: 0;
}

.subtitle {
  margin-top: 0.5rem;
  color: var(--text-dim);
  font-size: 0.9rem;
  max-width: 64ch;
}

.status-chip {
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: var(--text-dim);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.status-chip.ready {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.28);
  color: rgba(16, 185, 129, 0.95);
}

.status-panel {
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
}

.status-copy {
  margin: 0;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.7);
}

.install-modal {
  width: min(100%, 34rem);
  border-radius: 18px;
  border: 1px solid var(--glass-border);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.install-modal h3,
.install-modal p {
  margin: 0;
}

.install-modal p {
  color: var(--text-dim);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem 1rem;
}

.meta-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-dim);
  margin-bottom: 0.2rem;
}

.meta-value {
  display: block;
  font-size: 0.9rem;
  color: var(--text);
  line-height: 1.45;
  word-break: break-word;
}

.actions {
  margin-top: 0.2rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn {
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.account-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  width: fit-content;
  color: var(--primary);
  text-decoration: none;
  font-size: 0.9rem;
}

.account-link:hover {
  text-decoration: underline;
}

.error-msg {
  color: rgba(239, 68, 68, 0.95);
  font-size: 0.875rem;
}

.success-msg {
  color: rgba(16, 185, 129, 0.95);
  font-size: 0.875rem;
}

@media (max-width: 780px) {
  .header-row,
  .status-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .status-chip {
    white-space: normal;
  }
}
</style>
