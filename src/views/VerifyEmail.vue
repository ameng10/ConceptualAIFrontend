<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/services/api'

const PENDING_EMAIL_KEY = 'pendingVerificationEmail'

const route = useRoute()
const router = useRouter()

// Carried from the signup form, then mirrored into sessionStorage: refreshing this
// page mid-flow would otherwise leave a code form with no address to submit it against.
const email = ref(
  String(route.query.email || sessionStorage.getItem(PENDING_EMAIL_KEY) || ''),
)
if (email.value) sessionStorage.setItem(PENDING_EMAIL_KEY, email.value)
const code = ref('')
const error = ref('')
const notice = ref('')
const isLoading = ref(false)
const isResending = ref(false)

onMounted(() => {
  if (!email.value) error.value = 'We need your email address. Sign in again to continue.'
})

const handleSubmit = async () => {
  error.value = ''
  notice.value = ''
  isLoading.value = true
  try {
    const res = await authApi.confirmEmail(email.value.trim(), code.value.trim())
    if (res?.verified) {
      sessionStorage.removeItem(PENDING_EMAIL_KEY)
      router.replace({ path: '/onboarding', query: { welcomeDocs: '1' } })
      return
    }
    error.value = res?.error || 'That code did not work. Request a new one.'
  } catch (e: any) {
    const data = e.response?.data
    error.value = data?.error || data?.message || 'That code did not work. Request a new one.'
  } finally {
    isLoading.value = false
  }
}

const handleResend = async () => {
  error.value = ''
  notice.value = ''
  isResending.value = true
  try {
    await authApi.resendEmailCode(email.value.trim())
  } catch {
    // Deliberately ignored. The endpoint answers identically for every address so it
    // cannot be used to probe for accounts; surfacing a failure here would leak more
    // than it helps. A user who gets no mail can simply resend again.
  } finally {
    // Always the same message, for the same reason.
    notice.value = 'If that address needs confirming, a new code is on its way.'
    isResending.value = false
  }
}
</script>

<template>
  <div class="verify-view">
    <div class="verify-card glass">
      <h1 class="title">Confirm your email</h1>
      <p class="subtitle">
        We sent a 6-digit code to <strong>{{ email || 'your email address' }}</strong>.
        It expires in 15 minutes.
      </p>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="code">Verification code</label>
          <div class="input-wrapper">
            <input
              id="code"
              v-model="code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              class="code-input"
              required
            />
          </div>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>
        <div v-if="notice" class="notice-msg">{{ notice }}</div>

        <button type="submit" class="submit-btn" :disabled="isLoading || code.trim().length !== 6">
          {{ isLoading ? 'Confirming…' : 'Confirm email' }}
        </button>
      </form>

      <p class="resend-row">
        Didn't get it?
        <button type="button" class="link-btn" :disabled="isResending" @click="handleResend">
          {{ isResending ? 'Sending…' : 'Send a new code' }}
        </button>
      </p>

      <p class="footnote">
        You can look around without confirming, but you'll need a confirmed address
        before you can create a project.
      </p>
    </div>
  </div>
</template>

<style scoped>
.verify-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem 1rem;
}

.verify-card {
  width: 100%;
  max-width: 26rem;
  padding: 2rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
}

.title {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

.subtitle {
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-dim);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.code-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.4em;
  text-align: center;
  color: var(--text);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
}

.code-input:focus {
  outline: none;
  border-color: var(--primary);
}

.submit-btn {
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  background: var(--grad-wave);
  border: none;
  border-radius: 0.6rem;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.error-msg,
.notice-msg {
  font-size: 0.85rem;
  line-height: 1.4;
}

.error-msg {
  color: #ff6b6b;
}

.notice-msg {
  color: var(--text-dim);
}

.resend-row {
  margin: 1.25rem 0 0;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.link-btn {
  padding: 0;
  font: inherit;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}

.link-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.footnote {
  margin: 1.25rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-dim);
}
</style>
