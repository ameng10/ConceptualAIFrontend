<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi } from '@/services/api'
import { usePolling } from '@/composables/usePolling'
import { isHttp524 } from '@/services/http-errors'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import PlayWhileYouWait from '@/components/PlayWhileYouWait.vue'
import { ArrowDownToLine, ArrowLeft, RotateCcw, MonitorPlay, Square, ExternalLink } from 'lucide-vue-next'

type AgentState = 'idle' | 'loading' | 'starting' | 'running' | 'done' | 'error'

type BuildStatus = {
  status: 'processing' | 'complete' | 'error'
  frontend?: { status?: 'processing' | 'complete' | 'error' | string; downloadUrl?: string | null }
  backend?: { status?: 'processing' | 'complete' | 'error' | string; downloadUrl?: string | null }
  message?: string
}

const route = useRoute()
const router = useRouter()

const projectId = route.params.id as string
const projectName = ref<string>('')
const projectLifecycleStatus = ref<string | null>(null)

const frontendState = ref<AgentState>('loading')
const backendState = ref<AgentState>('loading')

const frontendDownloadUrl = ref<string>('')
const backendDownloadUrl = ref<string>('')

const buildError = ref('')
const buildInfo = ref('')
const isReverting = ref(false)
const revertError = ref('')

type PreviewState = 'idle' | 'launching' | 'processing' | 'ready' | 'stopping' | 'error'
const previewState = ref<PreviewState>('idle')
const previewUrl = ref<string>('')
const previewError = ref<string>('')

const toErrorMessage = (err: unknown, fallback: string) => {
  const anyErr = err as any
  return anyErr?.response?.data?.error || anyErr?.response?.data?.message || (err instanceof Error ? err.message : fallback)
}

const isTransientPollingError = (err: unknown) => isHttp524(err)

const allDone = computed(() => Boolean(frontendDownloadUrl.value) && Boolean(backendDownloadUrl.value))
const hasAnyDownload = computed(() => Boolean(frontendDownloadUrl.value) || Boolean(backendDownloadUrl.value))
const hasTerminalProjectStatus = computed(
  () => projectLifecycleStatus.value === 'assembled' || projectLifecycleStatus.value === 'complete',
)
const displayStatus = computed(() =>
  allDone.value || hasTerminalProjectStatus.value ? 'complete' : 'assembling',
)

const downloadingFrontend = ref(false)
const downloadingBackend = ref(false)

const downloadFrontend = async () => {
  if (!frontendDownloadUrl.value || downloadingFrontend.value) return
  downloadingFrontend.value = true
  try {
    const filename = `${projectName.value || 'project'}_frontend.zip`
    await projectApi.downloadFile(frontendDownloadUrl.value, filename)
  } catch (e) {
    if (!isHttp524(e)) {
      buildError.value = `Frontend download failed: ${e instanceof Error ? e.message : String(e)}`
    }
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
    if (!isHttp524(e)) {
      buildError.value = `Backend download failed: ${e instanceof Error ? e.message : String(e)}`
    }
  } finally {
    downloadingBackend.value = false
  }
}

const normalizeDownloadUrl = (raw: unknown): string => {
  if (typeof raw === 'string') return raw.trim()
  if (raw && typeof raw === 'object') {
    const maybeNested =
      (raw as any).downloadUrl ??
      (raw as any).url ??
      (raw as any).href ??
      ''
    return typeof maybeNested === 'string' ? maybeNested.trim() : ''
  }
  return ''
}

const extractDownloadUrls = (payload: any) => {
  const frontendUrl =
    payload?.frontend?.downloadUrl ??
    payload?.frontendDownloadUrl ??
    payload?.downloads?.frontend ??
    payload?.downloadUrls?.frontend ??
    ''
  const backendUrl =
    payload?.backend?.downloadUrl ??
    payload?.backendDownloadUrl ??
    payload?.downloads?.backend ??
    payload?.downloadUrls?.backend ??
    ''

  return {
    frontendUrl: normalizeDownloadUrl(frontendUrl),
    backendUrl: normalizeDownloadUrl(backendUrl),
  }
}

const isPayloadProcessing = (payload: BuildStatus | any): boolean => {
  const overallStatus = String(payload?.status ?? '').toLowerCase()
  const frontendStatus = String(payload?.frontend?.status ?? '').toLowerCase()
  const backendStatus = String(payload?.backend?.status ?? '').toLowerCase()
  return overallStatus === 'processing' || frontendStatus === 'processing' || backendStatus === 'processing'
}

const pollBuildStatusOnce = async (): Promise<boolean> => {
  const status: BuildStatus = await projectApi.getBuildStatus(projectId)
  const foundAny = applyBuildPayload(status)

  if (allDone.value) {
    buildInfo.value = ''
    buildPoll.stop()
    return true
  }

  if ((status?.status === 'processing' || isPayloadProcessing(status)) && !buildError.value) {
    buildInfo.value = foundAny
      ? 'Build is still running. Waiting for remaining artifacts...'
      : 'Build is running in the containerized session. Polling every 30 seconds...'
  }
  return foundAny
}

const buildPoll = usePolling(async () => {
  try {
    await pollBuildStatusOnce()
  } catch (e) {
    if (isTransientPollingError(e)) {
      // Keep polling on transient gateway timeouts.
      return
    }
    buildError.value = toErrorMessage(e, 'Failed to poll build status.')
    frontendState.value = 'error'
    backendState.value = 'error'
    buildPoll.stop()
  }
}, 30_000)

const pollProjectStateOnce = async () => {
  const project = await projectApi.getProject(projectId)
  projectLifecycleStatus.value = project?.status ?? null
  if (project?.name) {
    projectName.value = project.name
  }

  if (hasTerminalProjectStatus.value) {
    if (!allDone.value && !buildError.value) {
      buildInfo.value = hasAnyDownload.value
        ? 'Project is complete. Waiting for the remaining download artifact...'
        : 'Project is complete. Finalizing build artifacts...'
    }

    try {
      await pollBuildStatusOnce()
    } catch (e) {
      if (!isTransientPollingError(e)) {
        throw e
      }
    }

    if (allDone.value) {
      buildPoll.stop()
      projectPoll.stop()
    }
  }
}

const projectPoll = usePolling(async () => {
  try {
    await pollProjectStateOnce()
  } catch (e) {
    if (isTransientPollingError(e)) {
      return
    }
  }
}, 30_000)

const applyBuildPayload = (payload: BuildStatus | any): boolean => {
  const { frontendUrl, backendUrl } = extractDownloadUrls(payload)
  const overallStatus = String(payload?.status ?? '').toLowerCase()
  const frontendStatus = String(payload?.frontend?.status ?? '').toLowerCase()
  const backendStatus = String(payload?.backend?.status ?? '').toLowerCase()

  if (frontendUrl) {
    frontendDownloadUrl.value = frontendUrl
    frontendState.value = 'done'
  } else if (frontendStatus === 'error') {
    frontendState.value = 'error'
  } else if (frontendStatus === 'processing' || overallStatus === 'processing') {
    frontendState.value = 'running'
  } else if (frontendState.value === 'loading' || frontendState.value === 'starting') {
    frontendState.value = 'idle'
  }

  if (backendUrl) {
    backendDownloadUrl.value = backendUrl
    backendState.value = 'done'
  } else if (backendStatus === 'error') {
    backendState.value = 'error'
  } else if (backendStatus === 'processing' || overallStatus === 'processing') {
    backendState.value = 'running'
  } else if (backendState.value === 'loading' || backendState.value === 'starting') {
    backendState.value = 'idle'
  }

  if ((overallStatus === 'error' || frontendStatus === 'error' || backendStatus === 'error') && !buildError.value) {
    const message =
      (typeof payload?.error === 'string' && payload.error) ||
      (typeof payload?.message === 'string' && payload.message) ||
      'Build failed in the containerized session.'
    buildError.value = message
  }

  return Boolean(frontendUrl || backendUrl)
}

const startBuild = async () => {
  buildError.value = ''
  buildInfo.value = ''
  frontendDownloadUrl.value = ''
  backendDownloadUrl.value = ''

  frontendState.value = 'starting'
  backendState.value = 'starting'

  try {
    await projectApi.startBuild(projectId)
    frontendState.value = 'running'
    backendState.value = 'running'
    buildInfo.value = 'Build started. Polling every 30 seconds...'
    try {
      await pollBuildStatusOnce()
    } catch (e) {
      if (!isTransientPollingError(e)) throw e
    }
    if (!allDone.value && !buildError.value) {
      buildPoll.start()
      projectPoll.start()
    }
  } catch (e) {
    if (isTransientPollingError(e)) {
      // Treat 524 on trigger as transient: build may already be in-flight.
      frontendState.value = 'running'
      backendState.value = 'running'
      buildInfo.value = 'Build request timed out, continuing to poll every 30 seconds...'
      buildPoll.start({ immediate: true })
      projectPoll.start({ immediate: true })
      return
    }
    frontendState.value = 'error'
    backendState.value = 'error'
    buildInfo.value = ''
    buildError.value = toErrorMessage(e, 'Failed to start build.')
    return
  }
}

const fetchExistingDownloads = async (): Promise<boolean> => {
  // Returns true if at least one download URL was found.
  buildInfo.value = ''
  frontendState.value = 'loading'
  backendState.value = 'loading'

  try {
    let foundAny = false
    try {
      foundAny = await pollBuildStatusOnce()
    } catch (e) {
      if (!isTransientPollingError(e)) throw e
    }
    // Keep polling whenever build is not finished and no non-transient error is present.
    // This covers cases where backend is ready but frontend is still processing,
    // and cases where the first status read hit a transient 524.
    if (!allDone.value && !buildError.value) {
      buildPoll.start()
      projectPoll.start()
    }
    return foundAny
  } catch (e) {
    frontendState.value = 'idle'
    backendState.value = 'idle'
    buildError.value = toErrorMessage(e, 'Failed to fetch build status.')
    return false
  }
}

const handleRevert = async () => {
  isReverting.value = true
  revertError.value = ''
  try {
    await projectApi.revertProject(projectId)
    await projectApi.getProject(projectId)
    router.push({
      path: `/project/${projectId}/syncing`,
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

const pollPreviewStatusOnce = async () => {
  try {
    const res = await projectApi.getPreviewStatus(projectId)
    if (res.status === 'ready') {
      previewUrl.value = res.frontendUrl || ''
      previewState.value = 'ready'
      previewError.value = ''
      previewPoll.stop()
    } else if (res.status === 'processing') {
      previewState.value = 'processing'
      previewError.value = ''
    } else if (res.status === 'error') {
      previewState.value = 'error'
      previewError.value = res.error || 'Preview failed to start.'
      previewPoll.stop()
    } else if (res.status === 'expired' || res.status === 'none') {
      previewState.value = 'idle'
      previewPoll.stop()
    }
  } catch (e) {
    console.error('Failed to poll preview status', e)
  }
}

const previewPoll = usePolling(pollPreviewStatusOnce, 60_000)

const handleLaunchPreview = async () => {
  previewState.value = 'launching'
  previewError.value = ''
  previewUrl.value = ''
  try {
    const res = await projectApi.launchPreview(projectId)
    if (res.status === 'previewing') {
      previewState.value = 'processing'
      previewPoll.start({ immediate: true })
    }
  } catch (e) {
    previewState.value = 'error'
    previewError.value = toErrorMessage(e, 'Failed to launch preview.')
  }
}

const handleStopPreview = async () => {
  if (previewState.value === 'stopping') return
  previewState.value = 'stopping'
  previewUrl.value = '' // Hides iframe immediately
  previewError.value = ''
  try {
    await projectApi.teardownPreview(projectId)
    previewState.value = 'idle'
    previewPoll.stop()
  } catch (e) {
    previewState.value = 'error'
    previewError.value = toErrorMessage(e, 'Failed to stop preview.')
    console.error('Failed to stop preview', e)
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

  // Determine lifecycle status from the project record (authoritative), with
  // query param as a fallback for older navigation paths.
  let lifecycleStatus = typeof route.query?.projectStatus === 'string' ? route.query.projectStatus : ''
  try {
    const project = await projectApi.getProject(projectId)
    projectLifecycleStatus.value = project?.status ?? null
    if (project?.name) {
      projectName.value = project.name
    }
    if (project?.status) lifecycleStatus = String(project.status)
  } catch {
    // If project fetch fails, continue with query-param fallback.
  }

  const isAlreadyBuilding = lifecycleStatus === 'building'
  const isAlreadyAssembled = lifecycleStatus === 'assembled' || lifecycleStatus === 'complete'

  if (isAlreadyAssembled || isAlreadyBuilding) {
    await fetchExistingDownloads()
    if (isAlreadyAssembled) {
      try {
        const res = await projectApi.getPreviewStatus(projectId)
        if (res.status === 'processing' || res.status === 'ready') {
          previewState.value = res.status
          if (res.status === 'ready') {
            previewUrl.value = res.frontendUrl || ''
          } else {
            previewPoll.start({ immediate: true })
          }
        }
      } catch (e) {
        // ignore errors on initial load checkout
      }
    }
    return
  }

  // First, try to fetch existing downloads in case a prior build already completed.
  const hasExistingDownloads = await fetchExistingDownloads()
  if (hasExistingDownloads) {
    return
  }

  // No existing build artifacts found -> trigger a new build.
  await startBuild()
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
        :status="displayStatus"
        :projectName="projectName || 'Project'"
        :showDownloadButton="false"
      />

      <div v-if="!allDone" class="play-standalone">
        <PlayWhileYouWait />
      </div>

      <div class="glass fade-in plan-card">
        <h2 class="section-title">{{ allDone || hasAnyDownload || hasTerminalProjectStatus ? 'Downloads Ready' : 'Build' }}</h2>

        <p v-if="!hasAnyDownload" class="muted">Frontend: {{ frontendState }}</p>
        <p v-if="!hasAnyDownload" class="muted">Backend: {{ backendState }}</p>
        <p v-if="hasTerminalProjectStatus && !allDone" class="muted" style="margin-top: 0.75rem;">
          Project status is `{{ projectLifecycleStatus }}`. Waiting for build downloads to finish syncing to the status endpoint...
        </p>

        <div v-if="buildError" class="error-msg" style="margin-top: 0.75rem;">{{ buildError }}</div>
        <p v-else-if="buildInfo" class="muted" style="margin-top: 0.75rem;">{{ buildInfo }}</p>

        <!-- Show download buttons if any download is available -->
        <div v-if="hasAnyDownload" class="download-actions" style="margin-top: 1rem;">
          <button
            v-if="frontendDownloadUrl"
            class="download-btn frontend-btn"
            type="button"
            :disabled="downloadingFrontend"
            @click="downloadFrontend"
          >
            <span class="download-icon-wrap">
              <ArrowDownToLine :size="16" />
            </span>
            {{ downloadingFrontend ? 'Downloading Frontend…' : 'Download Frontend ZIP' }}
          </button>
          <button
            v-if="backendDownloadUrl"
            class="download-btn backend-btn"
            type="button"
            :disabled="downloadingBackend"
            @click="downloadBackend"
          >
            <span class="download-icon-wrap">
              <ArrowDownToLine :size="16" />
            </span>
            {{ downloadingBackend ? 'Downloading Backend…' : 'Download Backend ZIP' }}
          </button>
        </div>

        <p v-if="hasAnyDownload && !allDone" class="muted" style="margin-top: 0.75rem;">
          Waiting for {{ !frontendDownloadUrl ? 'frontend' : 'backend' }} to complete...
        </p>

        <!-- Preview Actions Section -->
        <div v-if="allDone" style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--glass-border);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div class="revert-info">
              <span class="revert-label">Live Preview</span>
              <span class="revert-desc">Launch a hosted preview of your generated application.</span>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button
                v-if="previewState === 'idle' || previewState === 'error' || previewState === 'launching'"
                class="btn-preview btn-preview-launch"
                type="button"
                :disabled="previewState === 'launching'"
                @click="handleLaunchPreview"
              >
                <MonitorPlay :size="15" />
                <span>{{ previewState === 'launching' ? 'Launching…' : 'Launch Preview' }}</span>
              </button>

              <button
                v-else
                class="btn-preview btn-preview-stop"
                type="button"
                :disabled="previewState === 'stopping'"
                @click="handleStopPreview"
              >
                <div v-if="previewState === 'stopping'" class="spinner" style="width: 14px; height: 14px; border-top-color: inherit; border-color: rgba(239, 68, 68, 0.3); border-top-color: rgba(239, 68, 68, 0.9);"></div>
                <Square v-else :size="15" />
                <span>{{ previewState === 'stopping' ? 'Stopping…' : 'Stop Preview' }}</span>
              </button>
            </div>
          </div>

          <div v-if="previewError" class="error-msg" style="margin-top: 0.5rem;">{{ previewError }}</div>

          <div v-if="previewState === 'processing'" class="preview-loading-card">
            <div class="spinner"></div>
            <span>Starting preview environment. This may take a minute...</span>
          </div>
        </div>

        <!-- Preview Iframe Section -->
        <div v-if="previewState === 'ready' && previewUrl" class="preview-iframe-container fade-in">
          <div class="preview-iframe-header">
            <span class="preview-url">{{ previewUrl }}</span>
            <a :href="previewUrl" target="_blank" rel="noopener noreferrer" class="preview-external-link">
              <ExternalLink :size="14" />
            </a>
          </div>
          <iframe :src="previewUrl" class="preview-iframe" title="Application Preview" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
        </div>

        <div class="revert-row" style="margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--glass-border);">
          <div class="revert-info">
            <span class="revert-label">Revert to previous stage</span>
            <span class="revert-desc">Undo the build and restore sync artifacts.</span>
          </div>
          <button class="btn-revert" type="button" :disabled="isReverting" @click="handleRevert">
            <RotateCcw :size="15" />
            <span>{{ isReverting ? 'Reverting…' : 'Revert' }}</span>
          </button>
        </div>
        <div v-if="revertError" class="error-msg" style="margin-top: 0.5rem;">{{ revertError }}</div>
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

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 12px;
  padding: 0.65rem 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(2, 6, 23, 0.92));
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, filter 0.16s ease;
}

.download-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.download-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.download-icon-wrap {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.14);
}

.frontend-btn {
  border-color: rgba(56, 189, 248, 0.45);
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.12);
}

.frontend-btn .download-icon-wrap {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.17);
}

.frontend-btn:hover:not(:disabled) {
  box-shadow: 0 12px 28px rgba(56, 189, 248, 0.2);
}

.backend-btn {
  border-color: rgba(45, 212, 191, 0.45);
  box-shadow: 0 8px 24px rgba(45, 212, 191, 0.12);
}

.backend-btn .download-icon-wrap {
  color: var(--accent);
  background: rgba(45, 212, 191, 0.18);
}

.backend-btn:hover:not(:disabled) {
  box-shadow: 0 12px 28px rgba(45, 212, 191, 0.22);
}

.revert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
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
  padding: 0.55rem 0.9rem;
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

.btn-preview {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s;
}

.btn-preview:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-preview-launch {
  border: 1px solid rgba(45, 212, 191, 0.3);
  background: rgba(45, 212, 191, 0.08);
  color: var(--accent);
}

.btn-preview-launch:hover:not(:disabled) {
  background: rgba(45, 212, 191, 0.14);
  border-color: rgba(45, 212, 191, 0.5);
}

.btn-preview-stop {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
  color: rgba(239, 68, 68, 0.9);
}

.btn-preview-stop:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.5);
}

.preview-loading-card {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-dim);
  font-size: 0.875rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--neon-teal);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-iframe-container {
  margin-top: 1.5rem;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  background: var(--bg-color);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.preview-iframe-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid var(--glass-border);
}

.preview-url {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-family: monospace;
}

.preview-external-link {
  color: var(--text-dim);
  transition: color 0.2s;
}

.preview-external-link:hover {
  color: var(--text);
}

.preview-iframe {
  width: 100%;
  height: 600px;
  border: none;
  background: #ffffff;
}
</style>
