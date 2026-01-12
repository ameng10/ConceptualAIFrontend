<script setup lang="ts">
import { ref } from 'vue'
import { authApi, type AuthResponse } from '@/services/api'
import { X, User, Mail, Lock, ArrowRight } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  show: boolean
  initialMode?: 'login' | 'register'
}>(), {
  initialMode: 'login'
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', user: AuthResponse): void
}>()

const mode = ref<'login' | 'register'>(props.initialMode)

// Watch for prop changes to update mode when modal re-opens
import { watch } from 'vue'
watch(() => props.initialMode, (newMode) => {
  mode.value = newMode
})
const isLoading = ref(false)
const error = ref('')

// Form Fields
const email = ref('')
const password = ref('')
const username = ref('')
const name = ref('')

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    let response: AuthResponse
    if (mode.value === 'login') {
      response = await authApi.login(email.value, password.value)
    } else {
      response = await authApi.register(email.value, password.value, username.value, name.value)
    }
    emit('success', response)
    emit('close')
  } catch (e: any) {
    console.error('Auth Error:', e)
    // Try to extract the most useful error message
    const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Authentication failed'
    // If the message is vague, append the raw data for debugging
    if (msg === 'password failed' || !e.response?.data?.message) {
         error.value = `${msg} (Server: ${JSON.stringify(e.response?.data || 'No Data')})`
    } else {
        error.value = msg
    }
  } finally {
    isLoading.value = false
  }
}

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
}
</script>

<template>
  <div v-if="show" class="modal-overlay fade-in" @click.self="emit('close')">
    <div class="modal-card">
      <button class="close-btn" @click="emit('close')">
        <X :size="20" />
      </button>

      <div class="modal-header">
        <h2>{{ mode === 'login' ? 'Welcome Back' : 'Create Account' }}</h2>
        <p class="subtitle">{{ mode === 'login' ? 'Sign in to access your projects' : 'Join to start building concepts' }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="mode === 'register'" class="form-group fade-in">
          <label>Full Name</label>
          <div class="input-wrapper">
            <User :size="16" />
            <input v-model="name" type="text" placeholder="John Doe" required />
          </div>
        </div>

         <div v-if="mode === 'register'" class="form-group fade-in">
          <label>Username</label>
          <div class="input-wrapper">
             <User :size="16" />
            <input v-model="username" type="text" placeholder="johndoe" required />
          </div>
        </div>

        <div class="form-group">
          <label>Email Address</label>
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

        <div v-if="error" class="error-msg fade-in">{{ error }}</div>

        <button type="submit" class="btn btn-primary submit-btn" :disabled="isLoading">
          <span v-if="!isLoading">{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
          <ArrowRight v-if="!isLoading" :size="18" />
          <div v-else class="mini-loader"></div>
        </button>
      </form>

      <div class="modal-footer">
        <p>
          {{ mode === 'login' ? "Don't have an account?" : "Already have an account?" }}
          <a href="#" @click.prevent="toggleMode">{{ mode === 'login' ? 'Sign Up' : 'Sign In' }}</a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: var(--bg-card, #1e1e1e);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
}

.modal-header {
  text-align: center;
  margin-bottom: 2rem;
}

.modal-header h2 {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
  background: var(--grad-wave);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-wave 6s linear infinite;
}

.subtitle {
  color: var(--text-dim);
  font-size: 0.875rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.input-wrapper input:focus {
  outline: none;
  border-color: var(--primary);
  background: rgba(255, 255, 255, 0.08);
}

.submit-btn {
  margin-top: 1rem;
  width: 100%;
  justify-content: center;
  gap: 0.5rem;
}

.modal-footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-dim);
}

.modal-footer a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  margin-left: 0.25rem;
}

.modal-footer a:hover {
  text-decoration: underline;
}

.error-msg {
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
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
