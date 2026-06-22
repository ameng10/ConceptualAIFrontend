<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppDescriptionInput from '@/components/AppDescriptionInput.vue'
import ClarificationDialog from '@/components/ClarificationDialog.vue'
import { projectApi, authState } from '@/services/api'
import { isHttp524 } from '@/services/http-errors'
import { getProjectPathForStatus } from '@/services/project-stage-routing'
import { Sparkles, Zap, User as UserIcon } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const showClarification = ref(false)
const questions = ref<string[]>([])
const currentProjectId = ref('')
const currentUser = ref(null as any) // Simple reactive user state
const isSignedIn = ref(authState.isSignedIn())

const syncAuthFromStorage = () => {
  currentUser.value = authState.get()
  isSignedIn.value = authState.isSignedIn()
}

const userBadgeLabel = computed(() => {
  const u: any = currentUser.value
  if (u?.username) return u.username
  if (u?.name) return u.name
  return isSignedIn.value ? 'Signed in' : 'User'
})

const prefillName = computed(() => (typeof route.query.name === 'string' ? route.query.name : ''))
const prefillDescription = computed(() =>
  typeof route.query.description === 'string' ? route.query.description : '',
)

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const selectNewestProjectId = (
  projects: Array<{ _id: string; name: string; description: string; createdAt?: string }>,
  existingProjectIds: Set<string>,
  name: string,
  description: string,
) => {
  const matches = projects.filter((project) => project.name === name && project.description === description)
  if (!matches.length) return null

  const unseenMatches = matches.filter((project) => !existingProjectIds.has(project._id))
  const candidates = unseenMatches.length ? unseenMatches : matches
  candidates.sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
    return bTime - aTime
  })

  return candidates[0]?._id ?? null
}

const waitForCreatedProject = async (
  userId: string,
  name: string,
  description: string,
  existingProjectIds: Set<string>,
  getCreateResult: () => { project?: string } | null,
  getCreateError: () => unknown,
) => {
  while (true) {
    const createResult = getCreateResult()
    if (createResult?.project) {
      return createResult.project
    }

    const createError = getCreateError()
    if (createError) {
      throw createError
    }

    try {
      const projects = await projectApi.getProjects(userId)
      const discoveredProjectId = selectNewestProjectId(projects, existingProjectIds, name, description)
      if (discoveredProjectId) {
        return discoveredProjectId
      }
    } catch {
      // Ignore list polling errors and retry while the create request is still pending.
    }

    await sleep(1500)
  }
}

const waitForProjectStatus = async (
  projectId: string,
  getCreateError: () => unknown,
) => {
  while (true) {
    try {
      return await projectApi.getProject(projectId)
    } catch (error) {
      const createError = getCreateError()
      if (createError && !isHttp524(error)) {
        throw createError
      }
      if (!isHttp524(error)) {
        await sleep(1200)
        continue
      }
    }

    await sleep(1200)
  }
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
    // User must be authenticated (enforced by route guard)
    const userId = authState.getUserId()
    if (!userId) {
      done(false, 'You must be signed in to create a project.')
      return
    }

    const existingProjects = await projectApi.getProjects(userId).catch(() => [])
    const existingProjectIds = new Set(existingProjects.map((project) => project._id))

    let createResult: { project?: string } | null = null
    let createError: unknown = null

    void projectApi
      .create(userId, name, description)
      .then((result) => {
        createResult = result
      })
      .catch((error) => {
        createError = error
      })

    // Important: the backend generates the canonical project id.
    // We poll for it immediately instead of waiting for POST /projects to finish,
    // because the create request may stay open while the pipeline continues.
    const pid = await waitForCreatedProject(
      userId,
      name,
      description,
      existingProjectIds,
      () => createResult,
      () => createError,
    )
    currentProjectId.value = pid

    const project = await waitForProjectStatus(pid, () => createError)
    const targetPath = getProjectPathForStatus(pid, project.status) ?? `/project/${pid}`

    // Navigate as soon as the created project can be fetched.
    await router.push({
      path: targetPath,
      query: {
        projectName: encodeURIComponent(project.name || name),
        projectStatus: project.status,
      },
    })

    done(true)

  } catch (error) {
    if (isHttp524(error)) {
      // Suppress noisy 524 popups; other flows keep polling in status pages.
      done(false)
      return
    }
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
        <UserIcon :size="14" /> {{ userBadgeLabel }}
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

      <div class="input-wrapper">
        <AppDescriptionInput
          :initialName="prefillName"
          :initialDescription="prefillDescription"
          @submit="handleProjectSubmit"
        />
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

.input-wrapper :deep(.input-footer .btn.btn-primary) {
  border-radius: 10px;
  padding: 0.42rem 0.90rem;
  font-size: 0.875rem;
}

.input-wrapper :deep(.input-footer .btn.btn-primary svg) {
  width: 16px !important;
  height: 16px !important;
}

.centered-error {
  text-align: center;
}
</style>
