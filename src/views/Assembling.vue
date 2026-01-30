<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi } from '@/services/api'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import PlayWhileYouWait from '@/components/PlayWhileYouWait.vue'
import { ArrowLeft } from 'lucide-vue-next'

type AgentState = 'idle' | 'starting' | 'running' | 'done' | 'error'

type AssembleStatus = {
  frontend?: { status?: string; zipUrl?: string }
  backend?: { status?: string; zipUrl?: string }
}

const route = useRoute()
const router = useRouter()

const projectId = route.params.id as string
const projectName = ref<string>('')

const isActive = ref(true)
onUnmounted(() => {
  isActive.value = false
})

const frontendState = ref<AgentState>('idle')
const backendState = ref<AgentState>('idle')

const frontendZipUrl = ref<string>('')
const backendZipUrl = ref<string>('')

const assembleError = ref('')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const extractOpenApiYaml = (syncPayload: any) => {
  const apiDef = syncPayload?.apiDefinition
  if (!apiDef) return ''
  if (typeof apiDef === 'string') return apiDef
  try {
    return JSON.stringify(apiDef, null, 2)
  } catch {
    return ''
  }
}

const allDone = computed(() => Boolean(frontendZipUrl.value) && Boolean(backendZipUrl.value))

const startAssembling = async () => {
  assembleError.value = ''
  frontendZipUrl.value = ''
  backendZipUrl.value = ''

  frontendState.value = 'starting'
  backendState.value = 'starting'

  try {
    // Inputs required by spec: OpenAPI YAML + design plan.
    // We fetch them here to avoid passing large payloads through the route.
    const [plan, syncs] = await Promise.all([projectApi.getPlan(projectId), projectApi.getSyncs(projectId)])
    const openApiYaml = extractOpenApiYaml(syncs)

    // Start both agents concurrently.
    // NOTE: Endpoints are placeholders until you provide the updated API doc.
    await Promise.all([
      projectApi.startFrontendAssembling(projectId, { openApiYaml, plan }),
      projectApi.startBackendAssembling(projectId, {}),
    ])

    frontendState.value = 'running'
    backendState.value = 'running'
  } catch (e) {
    frontendState.value = 'error'
    backendState.value = 'error'
    assembleError.value = e instanceof Error ? e.message : String(e)
    return
  }

  // Poll until both zips are ready.
  const maxWaitMs = 60 * 60 * 1000 // 60 minutes
  const startedAt = Date.now()
  let delayMs = 5_000

  while (isActive.value && Date.now() - startedAt < maxWaitMs) {
    try {
      const status: AssembleStatus = await projectApi.getAssemblingStatus(projectId)

      const fUrl = status?.frontend?.zipUrl
      const bUrl = status?.backend?.zipUrl
      if (typeof fUrl === 'string' && fUrl) frontendZipUrl.value = fUrl
      if (typeof bUrl === 'string' && bUrl) backendZipUrl.value = bUrl

      // Best-effort state mapping (backend can choose its own status strings).
      if (frontendZipUrl.value) frontendState.value = 'done'
      if (backendZipUrl.value) backendState.value = 'done'

      if (allDone.value) return

      if (status?.frontend?.status && !frontendZipUrl.value) frontendState.value = 'running'
      if (status?.backend?.status && !backendZipUrl.value) backendState.value = 'running'
    } catch {
      // ignore transient errors
    }

    await sleep(delayMs)
    delayMs = Math.min(30_000, Math.round(delayMs * 1.15))
  }

  if (!allDone.value) {
    assembleError.value = 'Assembling is taking longer than expected. Please check again in a moment.'
    if (!frontendZipUrl.value) frontendState.value = 'error'
    if (!backendZipUrl.value) backendState.value = 'error'
  }
}

onMounted(() => {
  const qName = route.query?.projectName
  if (typeof qName === 'string') {
    try {
      projectName.value = decodeURIComponent(qName)
    } catch {
      projectName.value = qName
    }
  }

  // Start immediately after arriving from the Syncing page.
  startAssembling()
})
</script>

<template>
  <div class="status-view">
    <div class="header-nav fade-in">
      <button type="button" class="back-link" @click="router.push({ path: '/projects' })">
        <ArrowLeft :size="18" /> Back to Projects
      </button>
    </div>

    <div class="content container">
      <div class="status-header fade-in">
        <h1>{{ projectName || 'Project' }}</h1>
        <p class="subtitle">Assembling</p>
      </div>

      <ProjectStatusDisplay :status="'assembling'" :projectName="projectName || 'Project'" />

      <div v-if="!allDone" class="play-standalone">
        <PlayWhileYouWait />
      </div>

      <div class="glass fade-in plan-card">
        <h2 class="section-title">Assemble</h2>

        <p class="muted">Frontend agent: {{ frontendState }}</p>
        <p class="muted">Backend agent: {{ backendState }}</p>

        <div v-if="assembleError" class="error-msg" style="margin-top: 0.75rem;">{{ assembleError }}</div>

        <div v-if="allDone" class="download-actions" style="margin-top: 1rem;">
          <a class="btn-primary" :href="frontendZipUrl" target="_blank" rel="noopener noreferrer">Download frontend zip</a>
          <a class="btn-primary" :href="backendZipUrl" target="_blank" rel="noopener noreferrer">Download backend zip</a>
        </div>
      </div>
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

.error-msg {
  color: rgba(239, 68, 68, 0.95);
  font-size: 0.8125rem;
}

.download-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>
