<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Mail, Lock, ArrowRight } from 'lucide-vue-next'
import { authApi } from '@/services/api'

const router = useRouter()
const email = ref('')
const password = ref('')
const username = ref('')
const name = ref('')
const isLoading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true
  try {
    await authApi.register(email.value, password.value, username.value, name.value)
    router.replace('/onboarding')
  } catch (e: any) {
    const data = e.response?.data
    error.value =
      data?.error || data?.message || e.message || 'Registration failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const goToLogin = () => router.push('/login')
</script>

<template>
  <div class="register-view">
    <div class="register-card glass">
      <h1 class="title">Create Account</h1>
      <p class="subtitle">Join to start building concepts</p>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label>Full Name</label>
          <div class="input-wrapper">
            <User :size="16" />
            <input v-model="name" type="text" placeholder="John Doe" required />
          </div>
        </div>
        <div class="form-group">
          <label>Username</label>
          <div class="input-wrapper">
            <User :size="16" />
            <input v-model="username" type="text" placeholder="johndoe" required />
          </div>
        </div>
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
          <span v-if="!isLoading">Create Account</span>
          <ArrowRight v-if="!isLoading" :size="18" />
          <div v-else class="mini-loader"></div>
        </button>
      </form>

      <p class="footer">
        Already have an account?
        <a href="#" @click.prevent="goToLogin">Sign In</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.register-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.register-card {
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
