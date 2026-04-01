<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  deleteGeminiCredential,
  saveGeminiCredential,
  useGeminiCredentials,
  type GeminiTier,
} from '@/services/gemini-credentials'
import { useToasts } from '@/services/toast'

const { push } = useToasts()
const {
  hasStoredGeminiCredential,
  geminiCredentialMetadata,
  hasUnwrapKey,
  needsReconnect,
} = useGeminiCredentials()

const accountPassword = ref('')
const geminiApiKey = ref('')
const geminiTier = ref<GeminiTier>('2')

const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const success = ref('')
const costWarningShown = ref(false)

const currentTier = computed(() => geminiCredentialMetadata.value?.geminiTier ?? geminiTier.value)
const statusText = computed(() => {
  if (!hasStoredGeminiCredential.value) return 'No Gemini credential saved yet.'
  if (hasUnwrapKey.value) return 'Gemini credential is saved and connected for this session.'
  return 'Gemini credential is saved, but you need to re-enter your password after this reload.'
})

watch(
  () => geminiCredentialMetadata.value?.geminiTier,
  (nextTier) => {
    if (nextTier) {
      geminiTier.value = nextTier
    }
  },
  { immediate: true },
)

watch(
  [accountPassword, geminiApiKey],
  ([savePassword, apiKey]) => {
    if (costWarningShown.value) return
    if (!savePassword && !apiKey) return

    costWarningShown.value = true
    push({
      title: 'Gemini can cost real money',
      message: 'Using Gemini for projects can cost real money. A typical project run may average around $10.',
      kind: 'warning',
      ttlMs: 7000,
    })
  },
)

const resetMessages = () => {
  error.value = ''
  success.value = ''
}

const resetSensitiveInputs = () => {
  accountPassword.value = ''
  geminiApiKey.value = ''
}

const handleSave = async () => {
  resetMessages()
  saving.value = true

  try {
    await saveGeminiCredential({
      accountPassword: accountPassword.value,
      geminiApiKey: geminiApiKey.value,
      geminiTier: geminiTier.value,
    })
    resetSensitiveInputs()
    success.value = hasStoredGeminiCredential.value
      ? 'Gemini credential saved and connected for this session.'
      : 'Gemini credential saved.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save Gemini credential.'
  } finally {
    saving.value = false
    accountPassword.value = ''
    geminiApiKey.value = ''
  }
}

const handleDelete = async () => {
  resetMessages()

  const confirmed = window.confirm('Delete the saved Gemini credential from your account?')
  if (!confirmed) return

  deleting.value = true
  try {
    await deleteGeminiCredential()
    resetSensitiveInputs()
    success.value = 'Saved Gemini credential deleted.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete Gemini credential.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="gemini-card glass">
    <div class="header-row">
      <div>
        <h2 class="title">Gemini credentials</h2>
        <p class="subtitle">
          Save your Gemini key once, keep only the derived unwrap key in session memory, and reconnect with your
          password after refreshes.
        </p>
      </div>
      <div class="status-chip" :class="{ ready: hasStoredGeminiCredential && hasUnwrapKey, warning: needsReconnect }">
        {{ hasStoredGeminiCredential ? (hasUnwrapKey ? 'Connected' : 'Reconnect needed') : 'Not set up' }}
      </div>
    </div>

    <div class="status-panel">
      <p class="status-copy">{{ statusText }}</p>
      <p v-if="hasStoredGeminiCredential" class="status-meta">
        Saved tier: <strong>{{ currentTier }}</strong>
      </p>
    </div>

    <div v-if="needsReconnect" class="warning-panel">
      <strong>Reconnect required</strong>
      <p>Use the shared reconnect form at the top of Settings to reconnect your Gemini credential for this session.</p>
    </div>

    <div class="save-panel">
      <div class="save-header">
        <h3>{{ hasStoredGeminiCredential ? 'Replace saved credential' : 'Save Gemini credential' }}</h3>
        <p>
          The raw Gemini API key is only sent during this save request and is cleared from the app immediately after.
        </p>
      </div>

      <div class="cost-panel">
        <strong>Cost warning</strong>
        <p>Projects can cost real money to run. A typical project may average around $10 depending on size and retries.</p>
      </div>

      <div class="grid">
        <div class="field">
          <label class="label" for="gemini-account-password">Account password</label>
          <input
            id="gemini-account-password"
            v-model="accountPassword"
            type="password"
            class="input"
            autocomplete="current-password"
            placeholder="Enter your account password"
          />
        </div>

        <div class="field">
          <label class="label" for="gemini-api-key">Gemini API key</label>
          <input
            id="gemini-api-key"
            v-model="geminiApiKey"
            type="password"
            class="input"
            autocomplete="off"
            placeholder="Paste your Gemini API key"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore="true"
          />
        </div>

        <div class="field tier-field">
          <label class="label" for="gemini-tier">Gemini tier</label>
          <div class="select-wrap">
            <select id="gemini-tier" v-model="geminiTier" class="input tier-select">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-primary action-btn" type="button" :disabled="saving" @click="handleSave">
          {{ saving ? 'Saving...' : hasStoredGeminiCredential ? 'Replace credential' : 'Save credential' }}
        </button>
        <button
          v-if="hasStoredGeminiCredential"
          class="btn btn-secondary action-btn"
          type="button"
          :disabled="deleting"
          @click="handleDelete"
        >
          {{ deleting ? 'Deleting...' : 'Delete saved credential' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="success" class="success-msg">{{ success }}</p>
  </section>
</template>

<style scoped>
.gemini-card {
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
  max-width: 60ch;
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

.status-chip.warning {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.28);
  color: rgba(245, 158, 11, 0.95);
}

.status-panel,
.warning-panel,
.save-panel,
.cost-panel {
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
}

.status-copy,
.status-meta,
.save-header p,
.warning-panel p,
.cost-panel p {
  margin: 0;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.status-meta {
  margin-top: 0.4rem;
}

.warning-panel {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.08);
}

.warning-panel strong,
.cost-panel strong,
.save-header h3 {
  display: block;
  margin-bottom: 0.35rem;
}

.cost-panel {
  border-color: rgba(239, 68, 68, 0.22);
  background: rgba(239, 68, 68, 0.07);
}

.grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 1fr 1fr 180px;
  gap: 1rem;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tier-field {
  min-width: 0;
}

.label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dim);
}

.select-wrap {
  position: relative;
}

.tier-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 2.5rem;
  cursor: pointer;
}

.select-wrap::after {
  content: '';
  position: absolute;
  right: 1rem;
  top: 50%;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--text-dim);
  border-bottom: 2px solid var(--text-dim);
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
  opacity: 0.9;
}

.actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn {
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
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
  .grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .status-chip {
    white-space: normal;
  }
}
</style>
