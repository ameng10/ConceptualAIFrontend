<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Mail, Lock, ArrowRight } from 'lucide-vue-next'
import { authApi } from '@/services/api'
import { startFederatedLogin, type FederatedProvider } from '@/services/federated-auth'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const federatedLoading = ref<FederatedProvider | null>(null)

const handleFederated = async (provider: FederatedProvider) => {
  error.value = ''
  federatedLoading.value = provider
  try {
    await startFederatedLogin(provider) // navigates away on success
  } catch (e: any) {
    error.value = e.message || `Could not start ${provider} sign-in`
    federatedLoading.value = null
  }
}

const redirectTo = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') ? r : '/build'
})

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true
  try {
    await authApi.login(email.value, password.value)
    password.value = ''
    router.replace(redirectTo.value)
  } catch (e: any) {
    const data = e.response?.data
    error.value =
      data?.error || data?.message || e.message || 'Invalid credentials. Please try again.'
  } finally {
    password.value = ''
    isLoading.value = false
  }
}

const goToRegister = () => router.push('/register')
</script>

<template>
  <div class="login-view">
    <div class="login-card glass">
      <h1 class="title">Sign In</h1>
      <p class="subtitle">Sign in to access your projects</p>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label>Email</label>
          <div class="input-wrapper">
            <Mail :size="16" />
            <input v-model="email" type="email" placeholder="you@example.com" required />
          </div>
        </div>
        <div class="form-group">
          <label>Password</label>
          <div class="input-wrapper">
            <Lock :size="16" />
            <input v-model="password" type="password" placeholder="••••••••" required />
          </div>
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button type="submit" class="btn btn-primary submit-btn" :disabled="isLoading">
          <span v-if="!isLoading">Sign In</span>
          <ArrowRight v-if="!isLoading" :size="18" />
          <div v-else class="mini-loader"></div>
        </button>
      </form>

      <div class="divider"><span>or continue with</span></div>

      <div class="federated-buttons">
        <button
          type="button"
          class="btn federated-btn"
          :disabled="federatedLoading !== null"
          @click="handleFederated('google')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.03c2.2-2.1 3.5-5.1 3.5-8.6z"/>
            <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2a7.2 7.2 0 0 1-6.8-5l-.14.01-3.66 2.8-.05.13A12 12 0 0 0 12 24z"/>
            <path fill="#FBBC05" d="M5.2 14.4a7.4 7.4 0 0 1 0-4.7l-.01-.16-3.7-2.9-.12.06a12 12 0 0 0 0 10.8l3.83-3.1z"/>
            <path fill="#EB4335" d="M12 4.6c2.3 0 3.9 1 4.8 1.8l3.5-3.4C18.1 1 15.2 0 12 0A12 12 0 0 0 1.4 6.6l3.8 3a7.2 7.2 0 0 1 6.8-5z"/>
          </svg>
          <span v-if="federatedLoading !== 'google'">Google</span>
          <div v-else class="mini-loader"></div>
        </button>
        <button
          type="button"
          class="btn federated-btn"
          :disabled="federatedLoading !== null"
          @click="handleFederated('github')"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span v-if="federatedLoading !== 'github'">GitHub</span>
          <div v-else class="mini-loader"></div>
        </button>
      </div>

      <p class="footer">
        Don't have an account?
        <a href="#" @click.prevent="goToRegister">Sign Up</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
  border-radius: var(--radius);
}

.title {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
  background: var(--grad-wave);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-dim);
  font-size: 0.875rem;
  margin-bottom: 2rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper svg {
  position: absolute;
  left: 1rem;
  color: var(--text-dim);
}

.input-wrapper input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9375rem;
}

.input-wrapper input:focus {
  outline: none;
  border-color: var(--primary);
}

.submit-btn {
  margin-top: 0.5rem;
  width: 100%;
  justify-content: center;
  gap: 0.5rem;
}

.error-msg {
  color: #ef4444;
  font-size: 0.875rem;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
}

.footer {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-dim);
}

.footer a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  margin-left: 0.25rem;
}

.footer a:hover {
  text-decoration: underline;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0 1rem;
  color: var(--text-dim);
  font-size: 0.75rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.federated-buttons {
  display: flex;
  gap: 0.75rem;
}

.federated-btn {
  flex: 1;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
}

.federated-btn:hover:not(:disabled) {
  border-color: var(--primary);
}

.mini-loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
