<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi } from '@/services/api'
import ImplementationExplorer from '@/components/ImplementationExplorer.vue'
import PlayWhileYouWait from '@/components/PlayWhileYouWait.vue'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import DesignViewer from '@/components/DesignViewer.vue'
import { ArrowLeft, ChevronDown } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const projectId = route.params.id as string
const projectName = ref<string>('')

const implementStatus = ref<'starting' | 'started' | 'error'>('starting')
const implementError = ref('')
const implementationDoc = ref<any | null>(null)
const designDoc = ref<any | null>(null)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const pollImplementationUntilReady = async () => {
  const maxWaitMs = 20 * 60 * 1000 // 20 minutes
  const startedAt = Date.now()
  let delayMs = 2500
  for (;;) {
    try {
      const impl = await projectApi.getImplementation(projectId)
      if (impl) return impl
    } catch {
      // ignore transient errors during generation
    }
    if (Date.now() - startedAt > maxWaitMs) break
    await sleep(delayMs)
    delayMs = Math.min(10000, Math.round(delayMs * 1.25))
  }
  return null
}

const startIfNeeded = async () => {
  const qName = route.query?.projectName
  if (typeof qName === 'string') {
    try {
      projectName.value = decodeURIComponent(qName)
    } catch {
      projectName.value = qName
    }
  }

  // Only fetch the canonical design from the backend once the project is in a state
  // where a design can legitimately exist. This keeps backend traces clean.
  try {
    const project = await projectApi.getProject(projectId)
    const status = project?.status
    const designFetchAllowed =
      status === 'designing' ||
      status === 'design_complete' ||
      status === 'implementing' ||
  status === 'implemented' ||
      status === 'syncing' ||
      status === 'assembling' ||
      status === 'complete' ||
      status === 'error'

    const implementationFetchAllowed =
      status === 'implementing' ||
      status === 'implemented' ||
      status === 'syncing' ||
      status === 'assembling' ||
      status === 'complete' ||
      status === 'error'

    // If implementation already exists or is in progress, never show a "not ready" error.
    // Prefer fetching the existing results.
    if (implementationFetchAllowed) {
      implementStatus.value = 'started'
      const existing = await pollImplementationUntilReady()
      if (existing) {
        implementationDoc.value = existing
        // Load design for the bottom dropdown (best effort).
        try {
          designDoc.value = await projectApi.getDesign(projectId)
        } catch {
          // ignore
        }
        return
      }
      // If we couldn't fetch results yet, fall through and try starting if appropriate.
    }

    if (!designFetchAllowed) {
      implementStatus.value = 'error'
      implementError.value = 'Project is not ready for implementation yet.'
      return
    }

    if (
      status !== 'implementing' &&
      status !== 'implemented' &&
      status !== 'syncing' &&
      status !== 'assembling' &&
      status !== 'complete'
    ) {
      // If implementation hasn't started yet, start it.
      const design = await projectApi.getDesign(projectId)
      if (design) {
  designDoc.value = design
        const res = await projectApi.startImplementation(projectId, design)
        implementStatus.value = 'started'
        const maybe = (res as any)?.implementations ?? (res as any)?.implementation ?? (res as any)?.result ?? null
        if (maybe) {
          implementationDoc.value = maybe
          return
        }
      }
    }
  } catch (e) {
    implementStatus.value = 'error'
    implementError.value = e instanceof Error ? e.message : String(e)
    return
  }

  implementStatus.value = 'started'
  const impl = await pollImplementationUntilReady()
  if (impl) {
    implementationDoc.value = impl
    // Load design for the bottom dropdown (best effort).
    try {
      designDoc.value = await projectApi.getDesign(projectId)
    } catch {
      // ignore
    }
  } else {
    implementStatus.value = 'error'
    implementError.value = 'Implementation is taking longer than expected. Please try again in a moment.'
  }
}

onMounted(() => {
  startIfNeeded()
})
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
