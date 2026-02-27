<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi } from '@/services/api'
import { usePolling } from '@/composables/usePolling'
import { isHttp524 } from '@/services/http-errors'
import ImplementationExplorer from '@/components/ImplementationExplorer.vue'
import PlayWhileYouWait from '@/components/PlayWhileYouWait.vue'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import DesignViewer from '@/components/DesignViewer.vue'
import GeminiCredentialsForm from '@/components/GeminiCredentialsForm.vue'
import { ArrowLeft, ChevronDown, RotateCcw } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const projectId = route.params.id as string
const projectName = ref<string>('')
const projectStatus = ref<string | null>(null)

// Statuses where syncs are already generating or past - don't allow "Generate syncs" again
const PAST_IMPLEMENTING_STATUSES = [
  'sync_generating',
  'syncs_generated',
  'syncing',
  'building',
  'assembling',
  'assembled',
  'complete',
  'error',
] as const

const canGenerateSyncs = computed(() => {
  const status = projectStatus.value
  if (status && PAST_IMPLEMENTING_STATUSES.includes(status as any)) return false
  return true
})

const implementStatus = ref<'starting' | 'started' | 'error'>('starting')
const implementError = ref('')
const implementationDoc = ref<any | null>(null)
const designDoc = ref<any | null>(null)

const isGeneratingSyncs = ref(false)
const generateSyncsError = ref('')
const isReverting = ref(false)
const revertError = ref('')
const toErrorMessage = (err: unknown, fallback: string) => {
  const anyErr = err as any
  return anyErr?.response?.data?.error || anyErr?.response?.data?.message || (err instanceof Error ? err.message : fallback)
}

const isTransientPollingError = (err: unknown) => isHttp524(err)

const isImplementationReady = (payload: any) => {
  if (!payload || typeof payload !== 'object') return false
  const status = String((payload as any)?.status ?? '')
  return status !== 'implementing'
}

const loadDesignDoc = async () => {
  try {
    designDoc.value = await projectApi.getDesign(projectId)
  } catch {
    // ignore
  }
}

const pollImplementationOnce = async () => {
  const p = await projectApi.getProject(projectId)
  const status = p?.status ?? null
  projectStatus.value = status

  if (status && PAST_IMPLEMENTING_STATUSES.includes(status as any)) {
    // We're already beyond implementing stage.
    if (!implementationDoc.value) {
      const existing = await projectApi.getImplementation(projectId)
      if (isImplementationReady(existing)) {
        implementationDoc.value = existing
      }
    }
    implementationPoll.stop()
    return
  }

  const current = await projectApi.getImplementation(projectId)
  if (isImplementationReady(current)) {
    implementationDoc.value = current
    projectStatus.value = 'implemented'
    implementationPoll.stop()
  } else {
    implementStatus.value = 'started'
  }
}

const implementationPoll = usePolling(async () => {
  try {
    await pollImplementationOnce()
  } catch (e) {
    if (isTransientPollingError(e)) {
      implementStatus.value = 'started'
      // Keep polling on transient gateway timeouts.
      return
    }
    implementStatus.value = 'error'
    implementError.value = toErrorMessage(e, 'Failed to poll implementation.')
    implementationPoll.stop()
  }
}, 30_000)

const startIfNeeded = async () => {
  const qName = route.query?.projectName
  if (typeof qName === 'string') {
    try {
      projectName.value = decodeURIComponent(qName)
    } catch {
      projectName.value = qName
    }
  }

  try {
    const project = await projectApi.getProject(projectId)
    const status = project?.status
    projectStatus.value = status ?? null

    await loadDesignDoc()

    const shouldTriggerImplementation = status === 'design_complete'

    if (shouldTriggerImplementation) {
      implementStatus.value = 'starting'
      await projectApi.startImplementation(projectId)
      projectStatus.value = 'implementing'
    } else {
      implementStatus.value = 'started'
    }

    try {
      await pollImplementationOnce()
    } catch (e) {
      if (!isTransientPollingError(e)) throw e
      implementStatus.value = 'started'
    }
    if (!implementationDoc.value) {
      implementationPoll.start()
    }
  } catch (e) {
    if (isHttp524(e)) {
      implementationPoll.start()
      return
    }
    implementStatus.value = 'error'
    implementError.value = toErrorMessage(e, 'Failed to start implementation.')
    return
  }

}

const handleRevert = async () => {
  isReverting.value = true
  revertError.value = ''
  try {
    await projectApi.revertProject(projectId)
    await projectApi.getProject(projectId)
    router.push({
      path: `/project/${projectId}`,
      query: {
        projectName: projectName.value ? encodeURIComponent(projectName.value) : undefined,
      },
    })
  } catch (err) {
    if (isHttp524(err)) return
    revertError.value = err instanceof Error ? err.message : String(err)
    isReverting.value = false
  }
}

onMounted(() => {
  startIfNeeded()
})

const handleGenerateSyncs = async () => {
  generateSyncsError.value = ''
  isGeneratingSyncs.value = true

  try {
    await router.push({
      path: `/project/${projectId}/syncing`,
      query: {
        projectName: projectName.value ? encodeURIComponent(projectName.value) : undefined,
      },
    })
  } catch (e) {
    if (isHttp524(e)) return
    generateSyncsError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isGeneratingSyncs.value = false
  }
}
</script>

<template>
  <div class="status-view">
    <div class="header-nav fade-in">
      <button
        type="button"
        class="back-link"
  @click="router.push({ path: '/projects' })"
      >
  <ArrowLeft :size="18" /> Back to Projects
      </button>
      <div class="actions">
        <GeminiCredentialsForm class="header-gemini" />
      </div>
    </div>

    <div class="content container">
      <div class="status-header fade-in">
        <h1>{{ projectName || 'Project' }}</h1>
        <p class="subtitle">Implementing</p>
      </div>

      <ProjectStatusDisplay :status="'implementing'" :projectName="projectName || 'Project'" />

      <div v-if="!implementationDoc" class="play-standalone">
        <PlayWhileYouWait />
      </div>

      <div class="glass fade-in plan-card">
        <h2 class="section-title">Implementing</h2>
  <p v-if="implementStatus === 'starting'" class="muted">Starting implementation…</p>
  <p v-else-if="implementStatus === 'started' && !implementationDoc" class="muted">Implementing agent is working…</p>
        <p v-else-if="implementStatus === 'error'" class="muted">Implementation failed to start.</p>
        <div v-if="implementError" class="error-msg">{{ implementError }}</div>

        <div v-if="implementationDoc" class="json" style="margin-top: 1rem;">
          <ImplementationExplorer :implementation="implementationDoc" />
        </div>

        <div v-if="implementationDoc" class="review-actions">
          <div class="review-header">
            <h3 class="review-title">Ready to continue?</h3>
          </div>

          <div class="review-buttons">
            <button class="btn-primary" type="button" :disabled="isGeneratingSyncs || !canGenerateSyncs" @click="handleGenerateSyncs">
              <span v-if="!isGeneratingSyncs">Generate syncs</span>
              <span v-else>Generating…</span>
            </button>
          </div>

          <div v-if="generateSyncsError" class="error-msg" style="margin-top: 0.75rem;">{{ generateSyncsError }}</div>
        </div>

        <div class="revert-row">
          <div class="revert-info">
            <span class="revert-label">Revert to previous stage</span>
            <span class="revert-desc">Undo implementation and restore the design.</span>
          </div>
          <button class="btn-revert" type="button" :disabled="isReverting" @click="handleRevert">
            <RotateCcw :size="15" />
            <span>{{ isReverting ? 'Reverting…' : 'Revert' }}</span>
          </button>
        </div>
        <div v-if="revertError" class="error-msg" style="margin-top: 0.5rem;">{{ revertError }}</div>
      </div>

      <details v-if="designDoc" class="glass fade-in design-dropdown">
        <summary class="design-summary">
          <span class="design-summary-left">Design</span>
          <ChevronDown class="design-chev" :size="18" />
        </summary>
        <div class="design-body">
          <DesignViewer :design="designDoc" />
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.status-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-nav .actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-nav .header-gemini {
  max-width: 480px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-dim);
  background: none;
  border: none;
  padding: 0;
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
}

.back-link:hover {
  color: var(--text);
}

.play-standalone {
  margin-top: 1.25rem;
  display: flex;
  justify-content: center;
}

.play-standalone :deep(.play) {
  width: min(520px, 100%);
}

.status-header {
  text-align: center;
  margin-bottom: 3rem;
}

.plan-card {
  margin-top: 1.5rem;
  padding: 1.5rem;
}

.section-title {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
}

.muted {
  color: var(--text-dim);
}

.json {
  margin-top: 1rem;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: transparent;
  overflow: auto;
}

.error-msg {
  color: rgba(239, 68, 68, 0.95);
  font-size: 0.8125rem;
}

.review-actions {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--glass-border);
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.review-title {
  margin: 0;
  font-size: 1rem;
}

.review-buttons {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

/* Match ProjectStatus.vue accept button styling */
.btn-primary,
.btn-secondary {
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-weight: 600;
  border: 1px solid var(--glass-border);
  cursor: pointer;
}

.btn-primary {
  background: var(--primary);
  color: #000;
  border: none;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.revert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--glass-border);
}

.revert-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.revert-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
}

.revert-desc {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.btn-revert {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
  color: rgba(239, 68, 68, 0.9);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s;
}

.btn-revert:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.5);
}

.btn-revert:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.design-dropdown {
  margin-top: 1.25rem;
  padding: 0;
  overflow: hidden;
}

.design-summary {
  padding: 1rem 1.25rem;
  cursor: pointer;
  user-select: none;
  list-style: none;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.design-summary::-webkit-details-marker {
  display: none;
}

.design-chev {
  color: var(--text-dim);
  transition: transform 140ms ease;
}

.design-dropdown[open] .design-chev {
  transform: rotate(180deg);
}

.design-body {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--glass-border);
}
</style>
