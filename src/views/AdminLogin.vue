<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ShieldCheck } from 'lucide-vue-next'
import { adminApi } from '@/services/admin-api'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

const submit = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await adminApi.login(email.value, password.value)
    router.push('/admin/builds')
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Login failed'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="admin-login">
    <form class="panel glass" @submit.prevent="submit">
      <div class="head">
        <ShieldCheck :size="22" />
        <h1>Operator login</h1>
      </div>
      <p class="hint">Env-credentialed admin only. There is no signup.</p>
      <label>
        Email
        <input v-model="email" type="email" class="input" autocomplete="username" required />
      </label>
      <label>
        Password
        <input v-model="password" type="password" class="input" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn btn-primary" type="submit" :disabled="busy">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.panel {
  width: 100%;
  max-width: 380px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.head h1 {
  font-size: 1.25rem;
}

.hint {
  color: var(--text-dim);
  font-size: 0.85rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.error {
  color: #f87171;
  font-size: 0.85rem;
}
</style>
