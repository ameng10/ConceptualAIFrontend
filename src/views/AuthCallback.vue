<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '@/services/api'
import { getUserFromToken } from '@/services/auth'

/**
 * Landing page for federated sign-in redirects.
 * The backend 302s here with #access=<jwt>&refresh=<jwt> on success or
 * #error=<message>&provider=<slug> on failure. The fragment is consumed and
 * scrubbed from the address bar before any navigation.
 */
const router = useRouter()
const error = ref('')
const provider = ref('')

onMounted(async () => {
  const hash = window.location.hash
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const access = params.get('access') ?? ''
  const refresh = params.get('refresh') ?? ''
  const errParam = params.get('error') ?? ''
  provider.value = params.get('provider') ?? ''

  // Scrub tokens from the URL/history immediately.
  window.history.replaceState(null, '', window.location.pathname)

  if (errParam || !access || !refresh) {
    error.value = errParam || 'Sign-in did not complete. Please try again.'
    return
  }

  try {
    const user = await getUserFromToken(access)
    authState.set({ user, accessToken: access, refreshToken: refresh })
    router.replace('/build')
  } catch {
    error.value = 'Signed in, but the session could not be verified. Please try again.'
  }
})
</script>

<template>
  <div class="callback-view">
    <div class="callback-card glass">
      <template v-if="!error">
        <div class="loader"></div>
        <p class="status">Completing sign-in…</p>
      </template>
      <template v-else>
        <h1 class="title">Sign-in failed</h1>
        <p class="error-msg">
          {{ error }}<span v-if="provider"> ({{ provider }})</span>
        </p>
        <router-link to="/login" class="btn btn-primary back-btn">Back to Sign In</router-link>
      </template>
    </div>
  </div>
</template>

<style scoped>
.callback-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.callback-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
  border-radius: var(--radius);
  text-align: center;
}

.title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.status {
  color: var(--text-dim);
  margin-top: 1rem;
}

.error-msg {
  color: #ef4444;
  font-size: 0.875rem;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.back-btn {
  display: inline-flex;
  justify-content: center;
}

.loader {
  width: 32px;
  height: 32px;
  margin: 0 auto;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
