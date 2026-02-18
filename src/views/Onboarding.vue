<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, BookOpen } from 'lucide-vue-next'
import { socialApi } from '@/services/social-api'
import { authState } from '@/services/api'

const router = useRouter()
const route = useRoute()
const username = ref('')
const displayName = ref('')
const bio = ref('')
const loading = ref(false)
const error = ref('')
const showLibraryPrompt = ref(route.query.welcomeDocs === '1')

const handleSubmit = async () => {
  const u = username.value.trim()
  const d = displayName.value.trim()
  if (!u || !d) {
    error.value = 'Username and display name are required.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await socialApi.createProfile({ username: u, displayName: d, bio: bio.value.trim() || undefined })
    router.replace('/posts')
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || 'Failed to create profile'
  } finally {
    loading.value = false
  }
}

const openLibrary = () => {
  router.push('/library')
}

const dismissLibraryPrompt = () => {
  showLibraryPrompt.value = false
}

onMounted(async () => {
  if (!authState.isSignedIn()) {
    router.replace('/login')
    return
  }
  try {
    await socialApi.getMyProfile()
    router.replace('/posts')
  } catch {
    // 404 = no profile, stay on onboarding
  }
})
</script>

<template>
  <div class="onboarding-view">
    <div class="container fade-in">
      <div class="form-card glass">
        <div v-if="showLibraryPrompt" class="library-prompt">
          <div class="prompt-content">
            <BookOpen :size="16" />
            <span>New here? Check out the Library docs for a quick start.</span>
          </div>
          <div class="prompt-actions">
            <button type="button" class="btn btn-primary btn-small" @click="openLibrary">Open Library</button>
            <button type="button" class="btn-dismiss" @click="dismissLibraryPrompt">Maybe later</button>
          </div>
        </div>

        <div class="icon-wrap">
          <User :size="32" />
        </div>
        <h1>Create Your Profile</h1>
        <p class="subtitle">Set up your profile to post bugs, feature requests, and app discussions.</p>

        <form @submit.prevent="handleSubmit" class="profile-form">
          <div class="field">
            <label>Username</label>
            <input v-model="username" type="text" placeholder="johndoe" required />
          </div>
          <div class="field">
            <label>Display Name</label>
            <input v-model="displayName" type="text" placeholder="John Doe" required />
          </div>
          <div class="field">
            <label>Bio (optional)</label>
            <textarea v-model="bio" rows="3" placeholder="A short bio..." />
          </div>
          <div v-if="error" class="error-msg">{{ error }}</div>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Creating...' : 'Continue' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.container {
  width: 100%;
  max-width: 420px;
}

.form-card {
  padding: 2.5rem;
  border-radius: var(--radius);
  text-align: center;
}

.library-prompt {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  text-align: left;
  margin-bottom: 1rem;
  padding: 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(45, 212, 191, 0.45);
  background: rgba(6, 182, 212, 0.08);
}

.prompt-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text);
  font-size: 0.85rem;
}

.prompt-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-small {
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
}

.btn-dismiss {
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-dismiss:hover {
  color: var(--text);
  text-decoration: underline;
}

.icon-wrap {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  background: var(--grad-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.form-card h1 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-dim);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: left;
}

.field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-dim);
  margin-bottom: 0.35rem;
}

.field input,
.field textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9375rem;
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.error-msg {
  color: var(--error);
  font-size: 0.875rem;
}
</style>
