<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CREDENTIAL_RECONNECT_EVENT, type CredentialReconnectDetail } from '@/services/credential-reconnect'
import { unlockStoredGithubCredential, useGithubCredentials } from '@/services/github-credentials'
import { useToasts } from '@/services/toast'

const { push } = useToasts()
const { hasStoredGithubCredential, needsReconnect: githubNeedsReconnect } = useGithubCredentials()

const show = ref(false)
const password = ref('')
const reconnecting = ref(false)
const error = ref('')
const title = ref('Reconnect credentials')
const message = ref('Re-enter your account password to continue.')

const reconnectTargets = computed(() => {
  const targets: Array<'github'> = []
  if (hasStoredGithubCredential.value && githubNeedsReconnect.value) targets.push('github')
  return targets
})

const buttonLabel = computed(() => {
  if (reconnecting.value) return 'Reconnecting...'
  if (reconnectTargets.value[0] === 'github') return 'Reconnect GitHub'
  return 'Reconnect'
})

const close = (force = false) => {
  if (reconnecting.value && !force) return
  show.value = false
  password.value = ''
  error.value = ''
}

const open = (detail?: CredentialReconnectDetail) => {
  if (!reconnectTargets.value.length) return
  title.value = detail?.title?.trim() || 'Reconnect credentials'
  message.value = detail?.message?.trim() || 'Re-enter your account password to continue.'
  password.value = ''
  error.value = ''
  show.value = true
}

const handleEvent = (event: Event) => {
  const detail = (event as CustomEvent<CredentialReconnectDetail>).detail
  open(detail)
}

const reconnect = async () => {
  error.value = ''

  if (!password.value) {
    error.value = 'Enter your account password to reconnect your credentials.'
    return
  }

  const nextTargets = [...reconnectTargets.value]
  if (!nextTargets.length) {
    close()
    return
  }

  reconnecting.value = true

  try {
    await unlockStoredGithubCredential(password.value)

    push({
      title: 'Credentials reconnected',
      message: 'GitHub credentials are ready again for this session.',
      kind: 'success',
      ttlMs: 4000,
    })

    close(true)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to reconnect credentials.'
  } finally {
    reconnecting.value = false
    password.value = ''
  }
}

onMounted(() => {
  window.addEventListener(CREDENTIAL_RECONNECT_EVENT, handleEvent as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener(CREDENTIAL_RECONNECT_EVENT, handleEvent as EventListener)
})
</script>

<template>
  <div v-if="show" class="modal-overlay fade-in" @click.self="close()">
    <div class="modal-card glass" role="dialog" aria-modal="true" aria-labelledby="credential-reconnect-title">
      <div class="modal-header">
        <h2 id="credential-reconnect-title">{{ title }}</h2>
        <p>{{ message }}</p>
      </div>

      <div class="field">
        <label for="credential-reconnect-password">Account password</label>
        <input
          id="credential-reconnect-password"
          v-model="password"
          type="password"
          class="input"
          autocomplete="current-password"
          placeholder="Enter your account password"
          @keydown.enter.prevent="reconnect"
        />
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <div class="modal-actions">
        <button class="btn btn-primary" type="button" :disabled="reconnecting" @click="reconnect">
          {{ buttonLabel }}
        </button>
        <button class="btn btn-secondary" type="button" :disabled="reconnecting" @click="close()">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.72);
}

.modal-card {
  width: min(100%, 28rem);
  border-radius: 18px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-header h2,
.modal-header p {
  margin: 0;
}

.modal-header p {
  margin-top: 0.5rem;
  color: var(--text-dim);
  line-height: 1.5;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dim);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.error-msg {
  margin: 0;
  color: rgba(239, 68, 68, 0.95);
  font-size: 0.875rem;
}
</style>
