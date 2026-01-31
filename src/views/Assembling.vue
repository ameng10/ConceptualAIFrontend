<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi } from '@/services/api'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import PlayWhileYouWait from '@/components/PlayWhileYouWait.vue'
import { ArrowLeft } from 'lucide-vue-next'

type AgentState = 'idle' | 'loading' | 'starting' | 'running' | 'done' | 'error'

type BuildStatus = {
  status: 'processing' | 'complete' | 'error'
  frontend?: { status?: string; downloadUrl?: string | null }
  backend?: { status?: string; downloadUrl?: string | null }
}

const route = useRoute()
const router = useRouter()

const projectId = route.params.id as string
const projectName = ref<string>('')

const isActive = ref(true)
onUnmounted(() => {
  isActive.value = false
})

const frontendState = ref<AgentState>('loading')
const backendState = ref<AgentState>('loading')

const frontendDownloadUrl = ref<string>('')
const backendDownloadUrl = ref<string>('')

const buildError = ref('')
const isAlreadyAssembledProject = ref(false)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const allDone = computed(() => Boolean(frontendDownloadUrl.value) && Boolean(backendDownloadUrl.value))
const hasAnyDownload = computed(() => Boolean(frontendDownloadUrl.value) || Boolean(backendDownloadUrl.value))

const downloadingFrontend = ref(false)
const downloadingBackend = ref(false)

const downloadFrontend = async () => {
  if (!frontendDownloadUrl.value || downloadingFrontend.value) return
  downloadingFrontend.value = true
  try {
    const filename = `${projectName.value || 'project'}_frontend.zip`
    await projectApi.downloadFile(frontendDownloadUrl.value, filename)
  } catch (e) {
    buildError.value = `Frontend download failed: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    downloadingFrontend.value = false
  }
}

const downloadBackend = async () => {
  if (!backendDownloadUrl.value || downloadingBackend.value) return
  downloadingBackend.value = true
  try {
    const filename = `${projectName.value || 'project'}_backend.zip`
    await projectApi.downloadFile(backendDownloadUrl.value, filename)
  } catch (e) {
    buildError.value = `Backend download failed: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    downloadingBackend.value = false
  }
}

const startBuild = async () => {
  buildError.value = ''
  frontendDownloadUrl.value = ''
  backendDownloadUrl.value = ''

  frontendState.value = 'starting'
  backendState.value = 'starting'

  try {
    // Single request to start the build process (both frontend and backend)
    await projectApi.startBuild(projectId)

    frontendState.value = 'running'
    backendState.value = 'running'
  } catch (e) {
    frontendState.value = 'error'
    backendState.value = 'error'
    buildError.value = e instanceof Error ? e.message : String(e)
    return
  }

  // Poll until both downloads are ready.
  const maxWaitMs = 60 * 60 * 1000 // 60 minutes
  const startedAt = Date.now()
  let delayMs = 5_000

  while (isActive.value && Date.now() - startedAt < maxWaitMs) {
    try {
      const status: BuildStatus = await projectApi.getBuildStatus(projectId)

      // Extract download URLs from response
      const fUrl = status?.frontend?.downloadUrl
      const bUrl = status?.backend?.downloadUrl
      if (typeof fUrl === 'string' && fUrl) frontendDownloadUrl.value = fUrl
      if (typeof bUrl === 'string' && bUrl) backendDownloadUrl.value = bUrl

      // Update state based on individual status
      if (status?.frontend?.status === 'complete') frontendState.value = 'done'
      else if (status?.frontend?.status === 'processing') frontendState.value = 'running'
      
      if (status?.backend?.status === 'complete') backendState.value = 'done'
      else if (status?.backend?.status === 'processing') backendState.value = 'running'

      // Check if overall build is complete or errored
      if (status?.status === 'complete') return
      if (status?.status === 'error') {
        buildError.value = 'Build failed. Please try again.'
        if (!frontendDownloadUrl.value) frontendState.value = 'error'
        if (!backendDownloadUrl.value) backendState.value = 'error'
        return
      }
    } catch {
      // ignore transient errors
    }

    await sleep(delayMs)
    delayMs = Math.min(30_000, Math.round(delayMs * 1.15))
  }

  if (!allDone.value) {
    buildError.value = 'Build is taking longer than expected. Please check again in a moment.'
    if (!frontendDownloadUrl.value) frontendState.value = 'error'
    if (!backendDownloadUrl.value) backendState.value = 'error'
  }
}

const fetchExistingDownloads = async (): Promise<boolean> => {
  // For already-assembled projects, just fetch the download URLs without starting build.
  // Returns true if at least one download URL was found.
  frontendState.value = 'loading'
  backendState.value = 'loading'
  
  try {
    const status: BuildStatus = await projectApi.getBuildStatus(projectId)
    console.log('Build status response:', status)
    
    const fUrl = status?.frontend?.downloadUrl
    const bUrl = status?.backend?.downloadUrl
    
    let foundAny = false
    if (typeof fUrl === 'string' && fUrl) {
      frontendDownloadUrl.value = fUrl
      frontendState.value = 'done'
      foundAny = true
    } else {
      frontendState.value = 'idle'
    }
    if (typeof bUrl === 'string' && bUrl) {
      backendDownloadUrl.value = bUrl
      backendState.value = 'done'
      foundAny = true
    } else {
      backendState.value = 'idle'
    }
    return foundAny
  } catch (e) {
    // Don't set error here - we'll try starting build if this fails
    console.warn('Failed to fetch existing downloads:', e)
    frontendState.value = 'idle'
    backendState.value = 'idle'
    return false
  }
}

onMounted(async () => {
  const qName = route.query?.projectName
  if (typeof qName === 'string') {
    try {
      projectName.value = decodeURIComponent(qName)
    } catch {
      projectName.value = qName
    }
  }

  // Check if project is already assembled (from projectStatus query param).
  const projectStatus = route.query?.projectStatus
  const isAlreadyAssembled = projectStatus === 'assembled' || projectStatus === 'complete'
  isAlreadyAssembledProject.value = isAlreadyAssembled

  if (isAlreadyAssembled) {
    // Already assembled - just fetch existing download URLs, don't restart build.
    const foundDownloads = await fetchExistingDownloads()
    if (!foundDownloads) {
      // Project marked as assembled but no downloads found - show error
      buildError.value = 'Project is marked as assembled but download URLs could not be retrieved. The backend may still be processing.'
    }
  } else {
    // First, try to fetch existing downloads in case build already completed.
    const hasExistingDownloads = await fetchExistingDownloads()
    if (hasExistingDownloads && allDone.value) {
      // Both downloads already available - no need to start build.
      return
    }
    // Start build process.
    startBuild()
  }
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
        <p class="subtitle">Building</p>
      </div>

      <ProjectStatusDisplay 
        :status="allDone || isAlreadyAssembledProject ? 'complete' : 'assembling'" 
        :projectName="projectName || 'Project'"
        :showDownloadButton="false"
      />

      <div v-if="!allDone && !isAlreadyAssembledProject" class="play-standalone">
        <PlayWhileYouWait />
      </div>

      <div class="glass fade-in plan-card">
        <h2 class="section-title">{{ allDone || hasAnyDownload ? 'Downloads Ready' : 'Build' }}</h2>

        <p v-if="!hasAnyDownload" class="muted">Frontend: {{ frontendState }}</p>
        <p v-if="!hasAnyDownload" class="muted">Backend: {{ backendState }}</p>

        <div v-if="buildError" class="error-msg" style="margin-top: 0.75rem;">{{ buildError }}</div>

        <!-- Show download buttons if any download is available -->
        <div v-if="hasAnyDownload" class="download-actions" style="margin-top: 1rem;">
          <button 
            v-if="frontendDownloadUrl" 
            class="btn-primary" 
            type="button"
            :disabled="downloadingFrontend"
            @click="downloadFrontend"
          >
            {{ downloadingFrontend ? 'Downloading...' : 'Download Frontend' }}
          </button>
          <button 
            v-if="backendDownloadUrl" 
            class="btn-primary" 
            type="button"
            :disabled="downloadingBackend"
            @click="downloadBackend"
          >
            {{ downloadingBackend ? 'Downloading...' : 'Download Backend' }}
          </button>
        </div>
        
        <p v-if="hasAnyDownload && !allDone" class="muted" style="margin-top: 0.75rem;">
          Waiting for {{ !frontendDownloadUrl ? 'frontend' : 'backend' }} to complete...
        </p>
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
