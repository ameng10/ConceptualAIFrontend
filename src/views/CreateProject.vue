<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppDescriptionInput from '@/components/AppDescriptionInput.vue'
import ClarificationDialog from '@/components/ClarificationDialog.vue'
import { projectApi, authState } from '@/services/api'
import GeminiCredentialsForm from '@/components/GeminiCredentialsForm.vue'
import { useGeminiCredentials } from '@/services/gemini-credentials'
import { Sparkles, Zap, User as UserIcon } from 'lucide-vue-next'

const router = useRouter()
const showClarification = ref(false)
const questions = ref<string[]>([])
const currentProjectId = ref('')
const currentUser = ref(null as any) // Simple reactive user state
const isSignedIn = ref(authState.isSignedIn())

const {
  apiKey: geminiApiKey,
  tier: geminiTier,
  isValid: isGeminiValid,
  isTierSupported: isGeminiTierSupported,
} = useGeminiCredentials()
const geminiError = ref('')

const syncAuthFromStorage = () => {
  currentUser.value = authState.get()
  isSignedIn.value = authState.isSignedIn()
}

// Check auth on mount
onMounted(() => {
  syncAuthFromStorage()
  // auth-storage dispatches a 'storage' event on login/register/logout to notify same-tab listeners.
  window.addEventListener('storage', syncAuthFromStorage)
})

onUnmounted(() => {
  window.removeEventListener('storage', syncAuthFromStorage)
})

const handleProjectSubmit = async (
  description: string,
  name: string,
  done: (ok: boolean, errorMessage?: string) => void,
) => {
  try {
    geminiError.value = ''
    if (!isGeminiValid.value) {
      geminiError.value = !geminiApiKey.value.trim()
        ? 'Missing Gemini API Key.'
        : !isGeminiTierSupported.value
          ? 'Tier 0 is unsupported. Select tier 1, 2, or 3.'
          : 'Invalid Gemini credentials.'
      done(false, geminiError.value)
      return
    }

    // User must be authenticated (enforced by route guard)
    const userId = authState.getUserId()
    if (!userId) {
      done(false, 'You must be signed in to create a project.')
      return
    }

    // Important: the backend generates the canonical project id.
    // If we invent a client id and route with it, subsequent GETs (plan/project) will 404.
    const created = await projectApi.create(userId, name, description)
    const pid = created.project
    currentProjectId.value = pid

    // Navigate to the workspace/status page with the *real* project id.
    router.push({
      path: `/project/${pid}`,
      query: {
        projectName: encodeURIComponent(name),
        planningStatus: created?.planning?.status ? String(created.planning.status) : 'planning',
        plan: created?.planning?.plan ? encodeURIComponent(JSON.stringify(created.planning.plan)) : undefined,
        questions: created?.planning?.questions ? encodeURIComponent(JSON.stringify(created.planning.questions)) : undefined,
      },
    })

    done(true)

  } catch (error) {
    console.error('Failed to create project:', error)
    const anyErr = error as any
    const status = anyErr?.response?.status as number | undefined
    const data = anyErr?.response?.data as any

    const serverMsg =
      typeof data === 'string'
        ? data
        : data?.error || data?.message || (data ? JSON.stringify(data) : '')

    const msg =
      status && serverMsg
        ? `Request failed (${status}): ${serverMsg}`
        : error instanceof Error
          ? error.message
          : String(error)

    alert(msg || 'Failed to start project. Please check if the backend is running.')
    done(false, msg || 'Failed to start project.')
  }
}

const handleClarificationSubmit = async (answers: Record<string, string>) => {
  try {
    await projectApi.provideClarification(currentProjectId.value, answers)
    showClarification.value = false
    router.push(`/project/${currentProjectId.value}`)
  } catch (error) {
    console.error('Failed to submit clarifications:', error)
  }
}
</script>

<template>
  <div class="create-view">
    <div class="header-banner fade-in">
      <div class="user-badge" title="Signed in">
        <UserIcon :size="14" /> {{ currentUser?.username || currentUser?.user || 'User' }}
      </div>
      <div class="badge">
        <Zap :size="12" /> Powered by Concepts
      </div>
    </div>

    <div class="container fade-in">
      <div class="hero">
        <h1 class="animated-gradient-text">What are you building?</h1>
        <p class="subtitle">Architect your conceptual backend in minutes.</p>
      </div>

      <div class="byok-wrapper fade-in">
        <GeminiCredentialsForm />
        <div v-if="geminiError" class="error-msg">{{ geminiError }}</div>
      </div>

      <div class="input-wrapper">
        <AppDescriptionInput @submit="handleProjectSubmit" />
      </div>

      <div class="quick-tips">
        <p>Try: "A marketplace with items and reviews" or "A social app with following and posting"</p>
      </div>
    </div>

    <ClarificationDialog
      :show="showClarification"
      :questions="questions"
      @submit="handleClarificationSubmit"
    />
  </div>
</template>

<style scoped>
.create-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4rem 1rem;
}

.header-banner {
  position: fixed;
  top: 1.5rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 100;
}

.btn-ghost {
    background: none;
    border: none;
    color: var(--text);
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
    padding: 0.5rem 1rem;
}

.btn-ghost:hover {
    opacity: 1;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.user-badge:hover {
    background: rgba(239, 68, 68, 0.1); /* Red hint for logout */
    border-color: rgba(239, 68, 68, 0.2);
}

.badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}

.auth-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-primary-sm {
    background: var(--primary);
    color: black;
    border: none;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    transition: all 0.2s;
}

.btn-primary-sm:hover {
    box-shadow: 0 0 15px rgba(45, 212, 191, 0.4);
}

.container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.hero {
  text-align: center;
}

h1 {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.subtitle {
  font-size: 1.125rem;
  color: var(--text-dim);
  max-width: 600px;
  margin: 0 auto;
}

.quick-tips {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-dim);
  opacity: 0.7;
}

.error-msg {
  color: rgba(239, 68, 68, 0.95);
  font-size: 0.8125rem;
  margin-top: 0.75rem;
}

.byok-wrapper {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.byok-wrapper .error-msg {
  margin-top: 0.75rem;
}
</style>
