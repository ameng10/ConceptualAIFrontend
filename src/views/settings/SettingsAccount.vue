<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { KeyRound } from 'lucide-vue-next'
import { getAuthMethods, setPassword, type AuthMethods } from '@/services/federated-auth'

const methods = ref<AuthMethods | null>(null)
const methodsError = ref('')
const pwSaving = ref(false)
const pwError = ref('')
const pwSuccess = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const loadAuthMethods = async () => {
  methodsError.value = ''
  try {
    methods.value = await getAuthMethods()
  } catch (e: any) {
    methodsError.value = e?.message || 'Failed to load sign-in methods.'
  }
}

const submitPassword = async () => {
  pwError.value = ''
  pwSuccess.value = ''
  if (newPassword.value.length < 8) {
    pwError.value = 'New password must be at least 8 characters.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwError.value = 'Passwords do not match.'
    return
  }
  const hadPassword = methods.value?.hasPassword === true
  if (hadPassword && !currentPassword.value) {
    pwError.value = 'Current password is required.'
    return
  }
  pwSaving.value = true
  try {
    await setPassword(newPassword.value, hadPassword ? currentPassword.value : undefined)
    pwSuccess.value = hadPassword
      ? 'Password changed.'
      : 'Password set. You can now sign in with email + password.'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    await loadAuthMethods() // flips the form to change-mode without a reload
  } catch (e: any) {
    pwError.value = e?.message || 'Could not update password.'
  } finally {
    pwSaving.value = false
  }
}

onMounted(() => void loadAuthMethods())
</script>

<template>
  <section class="panel glass">
    <div class="section-title">
      <KeyRound :size="18" />
      <h3>Sign-in methods</h3>
    </div>

    <div v-if="methodsError" class="error-msg">{{ methodsError }}</div>
    <div v-else-if="!methods" class="muted">Loading sign-in methods…</div>
    <template v-else>
      <ul class="methods-list">
        <li>
          <span class="method-name">Password</span>
          <span :class="['method-state', methods.hasPassword ? 'on' : 'off']">
            {{ methods.hasPassword ? 'Set' : 'Not set' }}
          </span>
        </li>
        <li>
          <span class="method-name">Google</span>
          <span :class="['method-state', methods.google ? 'on' : 'off']">
            {{ methods.google ? 'Linked' : 'Not linked' }}
          </span>
        </li>
        <li>
          <span class="method-name">GitHub</span>
          <span :class="['method-state', methods.github ? 'on' : 'off']">
            {{ methods.github ? 'Linked' : 'Not linked' }}
          </span>
        </li>
      </ul>
      <p class="muted hint">
        Signing in with Google or GitHub using {{ methods.email }} always lands in this
        account.
      </p>

      <form class="password-form" @submit.prevent="submitPassword">
        <h4>{{ methods.hasPassword ? 'Change password' : 'Set a password' }}</h4>
        <div v-if="methods.hasPassword" class="field-group">
          <label>Current password</label>
          <input v-model="currentPassword" type="password" autocomplete="current-password" />
        </div>
        <div class="field-group">
          <label>New password</label>
          <input v-model="newPassword" type="password" autocomplete="new-password" />
        </div>
        <div class="field-group">
          <label>Confirm new password</label>
          <input v-model="confirmPassword" type="password" autocomplete="new-password" />
        </div>
        <div v-if="pwError" class="error-msg">{{ pwError }}</div>
        <div v-if="pwSuccess" class="success-msg">{{ pwSuccess }}</div>
        <button type="submit" class="btn btn-primary" :disabled="pwSaving">
          {{ pwSaving ? 'Saving…' : methods.hasPassword ? 'Change password' : 'Set password' }}
        </button>
      </form>
    </template>
  </section>
</template>

<style scoped>

.panel {
  padding: 1.75rem;
  border-radius: 0.875rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
}
.section-title h3 { margin: 0; font-size: 1.0625rem; font-weight: 800; }

.field-group { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1rem; }
.field-group label { font-size: 0.8125rem; font-weight: 600; color: var(--text-dim); }
.field-group input,
.field-group textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
.bio-input { resize: vertical; }

.muted { color: var(--text-dim); font-size: 0.875rem; }
.hint { margin: 0.75rem 0 0; }
.error-msg { color: var(--danger, #ef4444); font-size: 0.875rem; margin: 0.5rem 0; }
.success-msg { color: var(--success, #22c55e); font-size: 0.875rem; margin: 0.5rem 0; }

.methods-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
.methods-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
}
.method-name { font-size: 0.875rem; font-weight: 600; }
.method-state { font-size: 0.75rem; font-weight: 700; }
.method-state.on { color: var(--success, #22c55e); }
.method-state.off { color: var(--text-dim); }

.password-form { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
.password-form h4 { margin: 0 0 1rem; font-size: 0.9375rem; font-weight: 700; }
</style>
