<script setup lang="ts">
import { computed, onMounted, ref, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  projectApi,
  type GithubExportArtifact,
  type GithubExportJob,
  type GithubExportStatusResponse,
  type GithubExportVisibility,
} from '@/services/api'
import { usePolling } from '@/composables/usePolling'
import { isHttp524 } from '@/services/http-errors'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import { requestCredentialReconnect } from '@/services/credential-reconnect'
import { getSharedVaultUnwrapKeyOrThrow, syncGithubCredentialStatus, useGithubCredentials } from '@/services/github-credentials'
import {
  clearPendingGithubExport,
  getPendingGithubExport,
  setPendingGithubExport,
} from '@/services/github-export'
import { ArrowDownToLine, ArrowLeft, MonitorPlay, Square, ExternalLink, Github, Wand2 } from 'lucide-vue-next'

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
const projectIterating = ref(false)

const frontendState = ref<AgentState>('loading')
const backendState = ref<AgentState>('loading')

const frontendDownloadUrl = ref<string>('')
const backendDownloadUrl = ref<string>('')

const buildError = ref('')
const buildInfo = ref('')

// Iteration ("Modify" on the completed project): submit feedback, then follow polled status.
const showModifyDialog = ref(false)
const modifyFeedback = ref('')
const isIterating = ref(false)
const iterateError = ref('')

type PreviewState = 'idle' | 'launching' | 'processing' | 'ready' | 'stopping' | 'error'
const previewState = ref<PreviewState>('idle')
const previewUrl = ref<string>('')
const previewError = ref<string>('')
const githubStatusError = ref('')

const previewExpiresAt = ref<string | null>(null)

const now = ref(Date.now())
const timeRefresh = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(timeRefresh))

const previewTimeRemaining = computed(() => {
  if (!previewExpiresAt.value || previewState.value !== 'ready') return null
  const diff = new Date(previewExpiresAt.value).getTime() - now.value
  if (diff <= 0) return '0:00'
  const m = Math.floor(diff / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${m}:${s.toString().padStart(2, '0')}`
})

const { hasStoredGithubCredential, hasUnwrapKey: hasSharedVaultUnwrapKey } = useGithubCredentials()

const backendRepoName = ref('')
const frontendRepoName = ref('')
const backendVisibility = ref<GithubExportVisibility>('private')
const frontendVisibility = ref<GithubExportVisibility>('private')
const backendExporting = ref(false)
const frontendExporting = ref(false)
const githubExportStatus = ref<GithubExportStatusResponse>({ backend: null, frontend: null })

const backendExportJob = computed(() => githubExportStatus.value.backend)
const frontendExportJob = computed(() => githubExportStatus.value.frontend)

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

// A build that fails inside the sandbox rolls the project's lifecycle status BACK to a
// sync-stage status (e.g. `syncs_generated`). If that happens while we are on this Build
// page we must not keep showing "Building" forever — detect the rollback and send the user
// back to the (intact) syncing page instead, where they can retry the build safely.
const SYNC_STAGE_STATUSES = [
  'syncs_generated', 'sync_generating', 'syncing', 'implemented', 'implementing',
]
const buildRolledBack = computed(
  () => !!projectLifecycleStatus.value && SYNC_STAGE_STATUSES.includes(projectLifecycleStatus.value),
)
// Only treat a sync-stage status as a ROLLBACK once we've actually seen the build active —
// otherwise the brief `syncs_generated` window while a fresh build is being triggered would
// be misread as a failure and bounce the user out before the build even starts.
const sawBuildActive = ref(false)
const rollbackHandled = ref(false)

const returnToSyncing = (failed: boolean) => {
  // The old Syncing.vue view is retired — send the user to the unified project view, which
  // shows progress and re-attempts the build on open (auto-continue runs once on mount).
  router.replace({
    path: `/project/${projectId}`,
    query: {
      projectName: projectName.value ? encodeURIComponent(projectName.value) : undefined,
      planningStatus: projectLifecycleStatus.value || undefined,
      ...(failed ? { buildFailed: '1' } : {}),
    },
  })
}

const downloadingFrontend = ref(false)
const downloadingBackend = ref(false)

const isExportProcessing = (job: GithubExportJob | null | undefined) => String(job?.status ?? '').toLowerCase() === 'processing'

const formatExportTimestamp = (value?: string) => {
  if (!value) return 'Unknown'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value
  return new Date(timestamp).toLocaleString()
}

const getArtifactDownloadReady = (artifact: GithubExportArtifact) =>
  artifact === 'backend' ? Boolean(backendDownloadUrl.value) : Boolean(frontendDownloadUrl.value)

const getArtifactRepoName = (artifact: GithubExportArtifact) =>
  artifact === 'backend' ? backendRepoName.value : frontendRepoName.value

const getArtifactVisibility = (artifact: GithubExportArtifact) =>
  artifact === 'backend' ? backendVisibility.value : frontendVisibility.value

const setArtifactExporting = (artifact: GithubExportArtifact, value: boolean) => {
  if (artifact === 'backend') {
    backendExporting.value = value
  } else {
    frontendExporting.value = value
  }
}

const getArtifactJob = (artifact: GithubExportArtifact) =>
  artifact === 'backend' ? backendExportJob.value : frontendExportJob.value

const getResumeReturnPath = (artifact: GithubExportArtifact) =>
  router.resolve({
    path: route.path,
    query: {
      ...route.query,
      resumeGithubExport: artifact,
    },
  }).fullPath

const routeExportThroughSettings = (artifact: GithubExportArtifact, reason: string) => {
  const returnPath = getResumeReturnPath(artifact)
  setPendingGithubExport({
    projectId,
    artifact,
    repoName: getArtifactRepoName(artifact).trim() || undefined,
    visibility: getArtifactVisibility(artifact),
    returnPath,
    createdAt: Date.now(),
  })
  githubStatusError.value = reason
  router.push({
    path: '/settings',
    query: {
      returnPath,
    },
  })
}

const isReconnectableGithubExportError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  const lowered = message.toLowerCase()
  return lowered.includes('unwrap key')
}

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
  projectIterating.value = Boolean(project?.iterating)
  if (project?.name) {
    projectName.value = project.name
  }
  if (hasTerminalProjectStatus.value || projectLifecycleStatus.value === 'building') {
    sawBuildActive.value = true
  }

  // Build failed/rolled back to the sync stage while we were watching: stop polling and
  // return to the syncing page (syncs are intact) instead of getting stuck on "Building".
  if (sawBuildActive.value && buildRolledBack.value && !allDone.value && !rollbackHandled.value) {
    rollbackHandled.value = true
    buildPoll.stop()
    projectPoll.stop()
    returnToSyncing(true)
    return
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

const applyGithubExportStatus = (status: GithubExportStatusResponse) => {
  githubExportStatus.value = {
    backend: status?.backend ?? null,
    frontend: status?.frontend ?? null,
  }

  if (status?.backend?.repoName) {
    backendRepoName.value = status.backend.repoName
  }
  if (status?.frontend?.repoName) {
    frontendRepoName.value = status.frontend.repoName
  }
  if (status?.backend?.visibility === 'public' || status?.backend?.visibility === 'private') {
    backendVisibility.value = status.backend.visibility
  }
  if (status?.frontend?.visibility === 'public' || status?.frontend?.visibility === 'private') {
    frontendVisibility.value = status.frontend.visibility
  }
}

const pollGithubExportStatusOnce = async () => {
  const status = await projectApi.getGithubExportStatus(projectId)
  applyGithubExportStatus(status)

  const backendProcessing = isExportProcessing(status.backend)
  const frontendProcessing = isExportProcessing(status.frontend)
  if (!backendProcessing && !frontendProcessing) {
    githubExportPoll.stop()
  }
}

const githubExportPoll = usePolling(async () => {
  try {
    await pollGithubExportStatusOnce()
  } catch (e) {
    githubStatusError.value = toErrorMessage(e, 'Failed to poll GitHub export status.')
    githubExportPoll.stop()
  }
}, 15_000)

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

const triggerGithubExport = async (artifact: GithubExportArtifact) => {
  githubStatusError.value = ''

  if (!getArtifactDownloadReady(artifact)) {
    githubStatusError.value = `The ${artifact} artifact is not ready to export yet.`
    return
  }

  if (!hasStoredGithubCredential.value) {
    routeExportThroughSettings(artifact, 'Connect GitHub in Settings before exporting.')
    return
  }

  let unwrapKey = ''
  try {
    unwrapKey = getSharedVaultUnwrapKeyOrThrow()
  } catch (error) {
    githubStatusError.value =
      error instanceof Error ? error.message : 'Reconnect your credentials by re-entering your password to continue.'
    return
  }

  setArtifactExporting(artifact, true)
  try {
    await projectApi.startGithubExport(
      projectId,
      artifact,
      unwrapKey,
      getArtifactRepoName(artifact),
      getArtifactVisibility(artifact),
    )
    clearPendingGithubExport()
    await pollGithubExportStatusOnce()
    if (isExportProcessing(getArtifactJob(artifact))) {
      githubExportPoll.start()
    }
  } catch (e) {
    if (isReconnectableGithubExportError(e)) {
      requestCredentialReconnect({
        title: 'Reconnect credentials',
        message: 'Re-enter your account password to continue exporting to GitHub.',
      })
    }
    githubStatusError.value = toErrorMessage(e, `Failed to export ${artifact} to GitHub.`)
    try {
      await pollGithubExportStatusOnce()
    } catch {
      // Keep the original export error if status refresh also fails.
    }
  } finally {
    setArtifactExporting(artifact, false)
  }
}

const openModifyDialog = () => {
  iterateError.value = ''
  modifyFeedback.value = ''
  showModifyDialog.value = true
}

const closeModifyDialog = () => {
  if (isIterating.value) return
  showModifyDialog.value = false
}

const submitModify = async () => {
  iterateError.value = ''
  const feedback = modifyFeedback.value.trim()
  if (!feedback) {
    iterateError.value = 'Please describe what you want to change.'
    return
  }

  isIterating.value = true
  try {
    await projectApi.iterate(projectId, feedback)
    showModifyDialog.value = false
    // The backend classifies the feedback and updates the project status. Navigate to the
    // project status route and let polling drive the UI (full_pipeline -> planning;
    // frontend_only -> a building status).
    await router.push({
      path: `/project/${projectId}`,
      query: {
        projectName: projectName.value ? encodeURIComponent(projectName.value) : undefined,
      },
    })
  } catch (e) {
    if (isHttp524(e)) {
      showModifyDialog.value = false
      await router.push({
        path: `/project/${projectId}`,
        query: {
          projectName: projectName.value ? encodeURIComponent(projectName.value) : undefined,
        },
      })
      return
    }
    iterateError.value = toErrorMessage(e, 'Failed to start iteration.')
  } finally {
    isIterating.value = false
  }
}

const initiateAutoExpire = () => {
  if (previewState.value === 'stopping') return
  previewState.value = 'stopping'
  previewError.value = 'Preview automatically expired after 5 minutes.'
  previewUrl.value = ''
  previewExpiresAt.value = null

  // Fire-and-forget to initiate backend reap
  projectApi.getPreviewStatus(projectId).catch(() => {})

  // Check status again after 2 seconds to transition the UI natively based on DB
  setTimeout(() => {
    previewStoppingPoll.start({ immediate: true })
  }, 2000)
}

watch(previewTimeRemaining, (newVal) => {
  if (newVal === '0:00') {
    initiateAutoExpire()
  }
})

const pollPreviewStatusOnce = async () => {
  try {
    const res = await projectApi.getPreviewStatus(projectId)
    if (res.status === 'ready') {
      if (res.expiresAt && Date.now() >= new Date(res.expiresAt).getTime()) {
        initiateAutoExpire()
      } else {
        previewUrl.value = res.frontendUrl || ''
        previewState.value = 'ready'
        previewError.value = ''
        previewExpiresAt.value = res.expiresAt || null
        if (!previewPoll.isRunning.value) {
          previewStoppingPoll.stop()
          previewPoll.start()
        }
      }
    } else if (res.status === 'processing') {
      previewState.value = 'processing'
      previewError.value = ''
      if (!previewPoll.isRunning.value) {
        previewStoppingPoll.stop()
        previewPoll.start()
      }
    } else if (res.status === 'preview_stopping') {
      if (previewState.value === 'ready') {
        previewError.value = 'Preview automatically expired.'
      }
      previewState.value = 'stopping'
      if (!previewStoppingPoll.isRunning.value) {
        previewPoll.stop()
        previewStoppingPoll.start()
      }
    } else if (res.status === 'error') {
      previewState.value = 'error'
      previewError.value = res.error || 'Preview failed to start.'
      previewPoll.stop()
      previewStoppingPoll.stop()
    } else if (res.status === 'expired') {
      const wasActive = previewState.value === 'ready' || previewState.value === 'stopping'
      previewState.value = 'idle'
      if (wasActive && !previewError.value) {
        previewError.value = 'Preview automatically expired.'
      }
      previewExpiresAt.value = null
      previewPoll.stop()
      previewStoppingPoll.stop()
    } else if (res.status === 'none' || res.status === 'preview_stopped') {
      previewState.value = 'idle'
      previewExpiresAt.value = null
      previewPoll.stop()
      previewStoppingPoll.stop()
    }
  } catch (e) {
    console.error('Failed to poll preview status', e)
  }
}

const previewPoll = usePolling(pollPreviewStatusOnce, 30_000)
const previewStoppingPoll = usePolling(pollPreviewStatusOnce, 15_000)

const handleLaunchPreview = async () => {
  previewState.value = 'launching'
  previewError.value = ''
  previewUrl.value = ''
  previewExpiresAt.value = null
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
  previewExpiresAt.value = null
  previewPoll.stop()
  previewStoppingPoll.stop()
  try {
    const response = await projectApi.teardownPreview(projectId)
    if (response.status === 'preview_stopped') {
      previewState.value = 'idle'
      return
    }
    // Poll until backend officially says it's no longer ready/processing/preview_stopping
    let attempts = 0
    while (previewState.value === 'stopping' && attempts < 15) {
      const res = await projectApi.getPreviewStatus(projectId)
      if (res.status === 'none' || res.status === 'expired' || res.status === 'preview_stopped') {
        previewState.value = 'idle'
        break
      } else if (res.status === 'error') {
        previewState.value = 'error'
        previewError.value = res.error || 'Preview failed during teardown.'
        break
      }
      attempts++
      await new Promise(r => setTimeout(r, 60000))
    }
    // Fallback if it exceeds max attempts
    if (previewState.value === 'stopping') {
      previewState.value = 'idle'
    }
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

  try {
    await syncGithubCredentialStatus()
  } catch {
    // GitHub export UI can stay soft-fail if status probe is temporarily unavailable.
  }

  try {
    await pollGithubExportStatusOnce()
    if (isExportProcessing(githubExportStatus.value.backend) || isExportProcessing(githubExportStatus.value.frontend)) {
      githubExportPoll.start()
    }
  } catch {
    // GitHub export status is non-blocking for the build view.
  }

  // Determine lifecycle status from the project record (authoritative), with
  // query param as a fallback for older navigation paths.
  let lifecycleStatus = typeof route.query?.projectStatus === 'string' ? route.query.projectStatus : ''
  try {
    const project = await projectApi.getProject(projectId)
    projectLifecycleStatus.value = project?.status ?? null
    projectIterating.value = Boolean(project?.iterating)
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
    sawBuildActive.value = true
    await fetchExistingDownloads()
    if (isAlreadyAssembled) {
      previewPoll.start({ immediate: true })
    }
    return
  }

  // First, try to fetch existing downloads in case a prior build already completed.
  const hasExistingDownloads = await fetchExistingDownloads()
  if (hasExistingDownloads) {
    const resumeArtifact =
      route.query.resumeGithubExport === 'backend' || route.query.resumeGithubExport === 'frontend'
        ? (route.query.resumeGithubExport as GithubExportArtifact)
        : null
    const pendingExport = getPendingGithubExport()

    if (
      resumeArtifact &&
      pendingExport &&
      pendingExport.projectId === projectId &&
      pendingExport.artifact === resumeArtifact
    ) {
      if (pendingExport.repoName) {
        if (resumeArtifact === 'backend') backendRepoName.value = pendingExport.repoName
        else frontendRepoName.value = pendingExport.repoName
      }
      if (pendingExport.visibility) {
        if (resumeArtifact === 'backend') backendVisibility.value = pendingExport.visibility
        else frontendVisibility.value = pendingExport.visibility
      }

      await triggerGithubExport(resumeArtifact)
      await router.replace({
        path: route.path,
        query: Object.fromEntries(
          Object.entries(route.query).filter(([key]) => key !== 'resumeGithubExport'),
        ),
      })
    }
    return
  }

  // No existing build artifacts yet. The backend auto-advances the build itself now, so this
  // page must NOT trigger a build (that would double-provision a sandbox). fetchExistingDownloads
  // has already started polling, so we simply wait for the backend to finish and surface the
  // download artifacts.
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
            <span v-if="previewTimeRemaining" class="preview-expires" :class="{ 'warning': previewTimeRemaining.startsWith('0:') }">
              Expires in {{ previewTimeRemaining }}
            </span>
            <a :href="previewUrl" target="_blank" rel="noopener noreferrer" class="preview-external-link">
              <ExternalLink :size="14" />
            </a>
          </div>
          <iframe :src="previewUrl" class="preview-iframe" title="Application Preview" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"></iframe>
        </div>

        <div v-if="hasAnyDownload" class="github-export-section">
          <div class="export-section-header">
            <div class="revert-info">
              <span class="revert-label">GitHub Export</span>
              <span class="revert-desc">Export backend and frontend as separate repositories.</span>
            </div>
          </div>

          <p v-if="!hasStoredGithubCredential" class="muted" style="margin-top: 0.75rem;">
            Connect GitHub in Settings before exporting repositories.
          </p>
          <p v-else-if="!hasSharedVaultUnwrapKey" class="muted" style="margin-top: 0.75rem;">
            Re-enter your account password when prompted before exporting to GitHub.
          </p>
          <div v-if="githubStatusError" class="error-msg" style="margin-top: 0.75rem;">{{ githubStatusError }}</div>

          <div class="github-export-grid">
            <div class="github-export-card">
              <div class="github-export-card-header">
                <div>
                  <div class="github-export-title">Backend Repository</div>
                  <div class="github-export-subtitle">Exports the generated backend artifact to its own repo.</div>
                </div>
                <div class="github-status-pill" :class="String(backendExportJob?.status || 'idle').toLowerCase()">
                  {{ backendExportJob?.status || 'idle' }}
                </div>
              </div>

              <div class="github-export-fields">
                <div class="field">
                  <label class="field-label" for="backend-repo-name">Repository name</label>
                  <input
                    id="backend-repo-name"
                    v-model="backendRepoName"
                    class="input"
                    type="text"
                    placeholder="Optional custom repo name"
                  />
                </div>

                <div class="field">
                  <label class="field-label" for="backend-visibility">Visibility</label>
                  <select id="backend-visibility" v-model="backendVisibility" class="input">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              <div class="github-export-actions">
                <button
                  class="download-btn backend-btn"
                  type="button"
                  :disabled="!getArtifactDownloadReady('backend') || backendExporting || isExportProcessing(backendExportJob)"
                  @click="triggerGithubExport('backend')"
                >
                  <span class="download-icon-wrap">
                    <Github :size="16" />
                  </span>
                  {{
                    !getArtifactDownloadReady('backend')
                      ? 'Backend Artifact Not Ready'
                      : backendExporting
                      ? 'Exporting Backend...'
                      : isExportProcessing(backendExportJob)
                        ? 'Backend Export Running...'
                        : backendExportJob?.status === 'stale' || backendExportJob?.status === 'complete'
                            ? 'Re-export Backend to GitHub'
                          : 'Export Backend to GitHub'
                  }}
                </button>

                <a
                  v-if="backendExportJob?.repoUrl"
                  :href="backendExportJob.repoUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="preview-external-link github-repo-link"
                >
                  <ExternalLink :size="14" />
                  <span>Open repository</span>
                </a>
              </div>

              <div v-if="backendExportJob" class="github-export-meta">
                <p v-if="backendExportJob.repoName"><strong>Repo:</strong> {{ backendExportJob.repoName }}</p>
                <p v-if="backendExportJob.repoOwner"><strong>Owner:</strong> {{ backendExportJob.repoOwner }}</p>
                <p v-if="backendExportJob.lastRemoteCheckAt">
                  <strong>Last checked:</strong> {{ formatExportTimestamp(backendExportJob.lastRemoteCheckAt) }}
                </p>
                <p v-if="backendExportJob.logs?.length">
                  <strong>Latest log:</strong> {{ backendExportJob.logs[backendExportJob.logs.length - 1] }}
                </p>
              </div>
            </div>

            <div class="github-export-card">
              <div class="github-export-card-header">
                <div>
                  <div class="github-export-title">Frontend Repository</div>
                  <div class="github-export-subtitle">Exports the generated frontend artifact to its own repo.</div>
                </div>
                <div class="github-status-pill" :class="String(frontendExportJob?.status || 'idle').toLowerCase()">
                  {{ frontendExportJob?.status || 'idle' }}
                </div>
              </div>

              <div class="github-export-fields">
                <div class="field">
                  <label class="field-label" for="frontend-repo-name">Repository name</label>
                  <input
                    id="frontend-repo-name"
                    v-model="frontendRepoName"
                    class="input"
                    type="text"
                    placeholder="Optional custom repo name"
                  />
                </div>

                <div class="field">
                  <label class="field-label" for="frontend-visibility">Visibility</label>
                  <select id="frontend-visibility" v-model="frontendVisibility" class="input">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              <div class="github-export-actions">
                <button
                  class="download-btn frontend-btn"
                  type="button"
                  :disabled="!getArtifactDownloadReady('frontend') || frontendExporting || isExportProcessing(frontendExportJob)"
                  @click="triggerGithubExport('frontend')"
                >
                  <span class="download-icon-wrap">
                    <Github :size="16" />
                  </span>
                  {{
                    !getArtifactDownloadReady('frontend')
                      ? 'Frontend Artifact Not Ready'
                      : frontendExporting
                      ? 'Exporting Frontend...'
                      : isExportProcessing(frontendExportJob)
                        ? 'Frontend Export Running...'
                        : frontendExportJob?.status === 'stale' || frontendExportJob?.status === 'complete'
                            ? 'Re-export Frontend to GitHub'
                          : 'Export Frontend to GitHub'
                  }}
                </button>

                <a
                  v-if="frontendExportJob?.repoUrl"
                  :href="frontendExportJob.repoUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="preview-external-link github-repo-link"
                >
                  <ExternalLink :size="14" />
                  <span>Open repository</span>
                </a>
              </div>

              <div v-if="frontendExportJob" class="github-export-meta">
                <p v-if="frontendExportJob.repoName"><strong>Repo:</strong> {{ frontendExportJob.repoName }}</p>
                <p v-if="frontendExportJob.repoOwner"><strong>Owner:</strong> {{ frontendExportJob.repoOwner }}</p>
                <p v-if="frontendExportJob.lastRemoteCheckAt">
                  <strong>Last checked:</strong> {{ formatExportTimestamp(frontendExportJob.lastRemoteCheckAt) }}
                </p>
                <p v-if="frontendExportJob.logs?.length">
                  <strong>Latest log:</strong> {{ frontendExportJob.logs[frontendExportJob.logs.length - 1] }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modify (iterate) the completed project -->
        <div v-if="hasTerminalProjectStatus || allDone" class="revert-row" style="margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--glass-border);">
          <div class="revert-info">
            <span class="revert-label">Modify this app</span>
            <span class="revert-desc">Describe a change and we'll regenerate the affected parts.</span>
          </div>
          <button class="btn-modify" type="button" :disabled="projectIterating || isIterating" @click="openModifyDialog">
            <Wand2 :size="15" />
            <span>{{ projectIterating ? 'Iterating…' : 'Modify' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- Modify / iterate dialog -->
    <div v-if="showModifyDialog" class="modal-overlay" @click.self="closeModifyDialog">
      <div class="modal glass fade-in">
        <div class="modal-header">
          <Wand2 :size="22" class="modal-icon" />
          <div>
            <h3 class="modal-title">Modify this app</h3>
            <p class="modal-subtitle">Tell us what to change. We'll figure out whether to replan or just regenerate the frontend.</p>
          </div>
        </div>

        <textarea
          v-model="modifyFeedback"
          class="modify-input"
          rows="4"
          placeholder="Example: Add a dark mode toggle and let users edit their profile."
          :disabled="isIterating"
        ></textarea>

        <div v-if="iterateError" class="error-msg" style="margin-top: 0.5rem;">{{ iterateError }}</div>

        <div class="modal-actions">
          <button class="btn-secondary" type="button" :disabled="isIterating" @click="closeModifyDialog">Cancel</button>
          <button class="btn-modify" type="button" :disabled="isIterating" @click="submitModify">
            <Wand2 :size="15" />
            <span>{{ isIterating ? 'Submitting…' : 'Submit changes' }}</span>
          </button>
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

.btn-modify {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid rgba(45, 212, 191, 0.3);
  background: rgba(45, 212, 191, 0.08);
  color: var(--accent);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s;
}

.btn-modify:hover:not(:disabled) {
  background: rgba(45, 212, 191, 0.14);
  border-color: rgba(45, 212, 191, 0.5);
}

.btn-modify:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 560px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-header {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}

.modal-icon {
  color: var(--accent);
  margin-top: 0.2rem;
  flex: 0 0 auto;
}

.modal-title {
  margin: 0 0 0.25rem;
  font-size: 1.15rem;
}

.modal-subtitle {
  margin: 0;
  color: var(--text-dim);
  font-size: 0.875rem;
}

.modify-input {
  width: 100%;
  resize: vertical;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-family: inherit;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
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

.preview-expires {
  font-size: 0.75rem;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
}

.preview-expires.warning {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
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

.github-export-section {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--glass-border);
}

.export-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.github-export-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.github-export-card {
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem;
}

.github-export-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.github-export-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.github-export-subtitle {
  margin-top: 0.25rem;
  font-size: 0.82rem;
  color: var(--text-dim);
}

.github-status-pill {
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-dim);
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: capitalize;
  white-space: nowrap;
}

.github-status-pill.processing {
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.12);
  color: rgba(96, 165, 250, 0.95);
}

.github-status-pill.complete {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.12);
  color: rgba(16, 185, 129, 0.95);
}

.github-status-pill.error {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.12);
  color: rgba(248, 113, 113, 0.98);
}

.github-status-pill.stale {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.12);
  color: rgba(251, 191, 36, 0.98);
}

.github-export-fields {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dim);
}

.github-export-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.github-repo-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0;
}

.github-export-meta {
  margin-top: 0.9rem;
  font-size: 0.82rem;
  color: var(--text-dim);
}

.github-export-meta p {
  margin: 0.35rem 0 0;
  word-break: break-word;
}

@media (max-width: 840px) {
  .github-export-grid,
  .github-export-fields {
    grid-template-columns: 1fr;
  }

  .github-export-card-header {
    flex-direction: column;
  }

  .github-status-pill {
    white-space: normal;
  }
}
</style>
