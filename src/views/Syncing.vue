<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi } from '@/services/api'
import { usePolling } from '@/composables/usePolling'
import { isHttp524 } from '@/services/http-errors'
import ImplementationExplorer from '@/components/ImplementationExplorer.vue'
import DesignViewer from '@/components/DesignViewer.vue'
import SyncExplorer from '@/components/SyncExplorer.vue'
import PlayWhileYouWait from '@/components/PlayWhileYouWait.vue'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import { ArrowLeft, ChevronDown, Clipboard, ClipboardCheck, RotateCcw } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const projectId = route.params.id as string
const projectName = ref<string>('')
const initialProjectStatus = ref<string>('')
const projectStatus = ref<string | null>(null)

// Statuses where build has already started or is complete - don't allow "Build" again
const PAST_SYNC_STATUSES = [
  'building',
  'assembling',
  'assembled',
  'complete',
  'error',
] as const

const canBuild = computed(() => {
  const status = projectStatus.value ?? initialProjectStatus.value
  if (status && PAST_SYNC_STATUSES.includes(status as any)) return false
  return true
})

const syncStatus = ref<'starting' | 'started' | 'error'>('starting')
const syncError = ref('')
const syncDoc = ref<any | null>(null)
const toErrorMessage = (err: unknown, fallback: string) => {
  const anyErr = err as any
  return anyErr?.response?.data?.error || anyErr?.response?.data?.message || (err instanceof Error ? err.message : fallback)
}

const isTransientPollingError = (err: unknown) => isHttp524(err)

const safeStringify = (value: any, space = 2) => {
  const seen = new WeakSet<object>()
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') return String(val)
        if (typeof val === 'function') return '[Function]'
        if (val && typeof val === 'object') {
          if (seen.has(val)) return '[Circular]'
          seen.add(val)
        }
        return val
      },
      space,
    )
  } catch (e) {
    // Last-resort fallback so the UI doesn't crash.
    const msg = e instanceof Error ? e.message : String(e)
    return `"[Unserializable sync payload: ${msg}]"`
  }
}

const rawOpen = ref(false)
const syncJson = computed(() => {
  // Avoid heavy stringify work unless user opens the Raw JSON section.
  if (!rawOpen.value) return ''
  return syncDoc.value ? safeStringify(syncDoc.value, 2) : ''
})

const rawCopied = ref(false)
const tryCopyRawJson = async () => {
  rawCopied.value = false
  try {
    const text = syncDoc.value ? safeStringify(syncDoc.value, 2) : ''
    await navigator.clipboard.writeText(text)
    rawCopied.value = true
    window.setTimeout(() => (rawCopied.value = false), 1200)
  } catch {
    // ignore (clipboard permissions)
  }
}

const designDoc = ref<any | null>(null)
const implementationDoc = ref<any | null>(null)

const unwrapSyncPayload = (raw: any) => {
  const candidates = [raw, raw?.result, raw?.response, raw?.data, raw?.payload].filter(Boolean)
  for (const c of candidates) {
    const hasSyncs = Array.isArray((c as any)?.syncs) && (c as any).syncs.length > 0
    const hasApiDefinition = Boolean((c as any)?.apiDefinition)
    const hasEndpointBundles = Array.isArray((c as any)?.endpointBundles) && (c as any).endpointBundles.length > 0
    if (hasSyncs || hasApiDefinition || hasEndpointBundles) return c
  }
  return raw
}

const hasSyncArtifacts = (payload: any) =>
  Boolean(payload && (
    (Array.isArray(payload?.syncs) && payload.syncs.length > 0) ||
    payload?.apiDefinition ||
    (Array.isArray(payload?.endpointBundles) && payload.endpointBundles.length > 0)
  ))

const isSyncInProgress = (payload: any) => {
  const topStatus = String(payload?.status ?? '')
  const syncStatus = String(payload?.syncs?.status ?? '')
  return topStatus === 'sync_generating' || syncStatus === 'sync_generating'
}

const syncPoll = usePolling(async () => {
  try {
    await pollSyncOnce()
  } catch (e) {
    if (isTransientPollingError(e)) {
      syncStatus.value = 'started'
      // Keep polling on transient gateway timeouts.
      return
    }
    syncStatus.value = 'error'
    syncError.value = toErrorMessage(e, 'Failed to poll sync generation.')
    // Keep polling even after non-transient errors so recovery is automatic.
  }
}, 30_000)

const pollSyncOnce = async () => {
  const p = await projectApi.getProject(projectId)
  const status = p?.status ? String(p.status) : ''
  if (status) projectStatus.value = status

  const raw = await projectApi.getSyncs(projectId)
  const payload = unwrapSyncPayload(raw)

  if (isSyncInProgress(payload)) {
    syncStatus.value = 'started'
    return
  }

  if (hasSyncArtifacts(payload)) {
    syncDoc.value = payload
    syncStatus.value = 'started'
    projectStatus.value = 'syncs_generated'
    syncPoll.stop()
  }
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

  const qStatus = route.query?.projectStatus
  if (typeof qStatus === 'string') {
    initialProjectStatus.value = qStatus
  }

  await Promise.all([
    (async () => {
      try {
        designDoc.value = await projectApi.getDesign(projectId)
      } catch {
        // ignore
      }
    })(),
    (async () => {
      try {
        implementationDoc.value = await projectApi.getImplementation(projectId)
      } catch {
        // ignore
      }
    })(),
  ])

  let resolvedStatus = initialProjectStatus.value || ''
  try {
    const p = await projectApi.getProject(projectId)
    const apiStatus = p?.status ? String(p.status) : ''
    projectStatus.value = apiStatus || null
    // Always trust backend status over query-param fallbacks.
    if (apiStatus) resolvedStatus = apiStatus
  } catch {
    // ignore
  }

  if (resolvedStatus === 'implemented') {
    try {
      syncStatus.value = 'starting'
      await projectApi.startSyncGeneration(projectId)
      projectStatus.value = 'sync_generating'
      resolvedStatus = 'sync_generating'
    } catch (e) {
      if (isHttp524(e)) {
        syncPoll.start()
        return
      }
      syncStatus.value = 'error'
      syncError.value = toErrorMessage(e, 'Failed to generate syncs.')
      return
    }
  }

  if (resolvedStatus === 'sync_generating') {
    syncStatus.value = 'starting'
    // Always start polling in active generation stage.
    // Immediate run gives a fast first refresh; interval keeps polling every 30s.
    syncPoll.start({ immediate: true })
    return
  }

  // Already complete or advanced stage: fetch once so artifacts render.
  try {
    syncStatus.value = 'started'
    await pollSyncOnce()
    if (!syncDoc.value) {
      // If artifacts are not ready yet, keep polling every 30s until they are.
      syncPoll.start()
    }
  } catch (e) {
    if (isHttp524(e)) {
      syncPoll.start()
      return
    }
    syncStatus.value = 'error'
    syncError.value = toErrorMessage(e, 'Failed to fetch syncs.')
    // Even after an initial fetch error, continue polling for eventual consistency.
    syncPoll.start()
  }
}

const isReverting = ref(false)
const revertError = ref('')

const handleRevert = async () => {
  isReverting.value = true
  revertError.value = ''
  try {
    await projectApi.revertProject(projectId)
    await projectApi.getProject(projectId)
    router.push({
      path: `/project/${projectId}/implementing`,
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
        <p class="subtitle">Generating Syncs</p>
      </div>

      <ProjectStatusDisplay :status="'syncing'" :projectName="projectName || 'Project'" />

      <div v-if="!syncDoc" class="play-standalone">
        <PlayWhileYouWait />
      </div>

      <div class="glass fade-in plan-card">
        <h2 class="section-title">Sync Generation</h2>
        <p v-if="syncStatus === 'starting'" class="muted">Starting sync generation…</p>
        <p v-else-if="syncStatus === 'started' && !syncDoc" class="muted">Generating syncs…</p>
        <p v-else-if="syncStatus === 'error'" class="muted">Sync generation failed to start.</p>
        <div v-if="syncError" class="error-msg">{{ syncError }}</div>

        <div v-if="syncDoc" style="margin-top: 1rem;">
          <SyncExplorer :syncs="syncDoc" />

          <div style="margin-top: 1rem; display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <button
              class="btn-primary"
              type="button"
              :disabled="!canBuild"
              @click="router.push({ path: `/project/${projectId}/assembling`, query: { projectName: projectName ? encodeURIComponent(projectName) : undefined } })"
            >
              Build
            </button>
          </div>

          <details
            class="glass dropdown"
            style="margin-top: 1rem;"
            @toggle="rawOpen = ($event.target as HTMLDetailsElement).open"
          >
            <summary class="dropdown-summary">
              <span class="dropdown-summary-left">Raw JSON</span>
              <ChevronDown class="dropdown-chev" :size="18" />
            </summary>
            <div class="dropdown-body">
              <div class="raw-actions">
                <button
                  class="btn-chip"
                  type="button"
                  @click="tryCopyRawJson"
                  :title="rawCopied ? 'Copied' : 'Copy JSON'"
                >
                  <ClipboardCheck v-if="rawCopied" :size="16" />
                  <Clipboard v-else :size="16" />
                  <span>{{ rawCopied ? 'Copied' : 'Copy JSON' }}</span>
                </button>
              </div>
              <div class="json">
                <pre class="raw">{{ syncJson }}</pre>
              </div>
            </div>
          </details>
        </div>

        <div class="revert-row">
          <div class="revert-info">
            <span class="revert-label">Revert to previous stage</span>
            <span class="revert-desc">Undo sync generation and restore the implementation.</span>
          </div>
          <button class="btn-revert" type="button" :disabled="isReverting" @click="handleRevert">
            <RotateCcw :size="15" />
            <span>{{ isReverting ? 'Reverting…' : 'Revert' }}</span>
          </button>
        </div>
        <div v-if="revertError" class="error-msg" style="margin-top: 0.5rem;">{{ revertError }}</div>
      </div>

      <details v-if="implementationDoc" class="glass fade-in dropdown">
        <summary class="dropdown-summary">
          <span class="dropdown-summary-left">Implementation</span>
          <ChevronDown class="dropdown-chev" :size="18" />
        </summary>
        <div class="dropdown-body">
          <ImplementationExplorer :implementation="implementationDoc" />
        </div>
      </details>

      <details v-if="designDoc" class="glass fade-in dropdown">
        <summary class="dropdown-summary">
          <span class="dropdown-summary-left">Design</span>
          <ChevronDown class="dropdown-chev" :size="18" />
        </summary>
        <div class="dropdown-body">
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

.raw {
  margin: 0;
  padding: 0.75rem;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text);
}

.error-msg {
  color: rgba(239, 68, 68, 0.95);
  font-size: 0.8125rem;
}

.dropdown {
  margin-top: 1.25rem;
  padding: 0;
  overflow: hidden;
}

.dropdown-summary {
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

.dropdown-summary::-webkit-details-marker {
  display: none;
}

.dropdown-chev {
  color: var(--text-dim);
  transition: transform 140ms ease;
}

.dropdown[open] .dropdown-chev {
  transform: rotate(180deg);
}

.dropdown-body {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--glass-border);
}

.raw-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

.btn-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: filter 0.15s ease, border-color 0.15s ease;
}

.btn-chip:hover {
  filter: brightness(1.08);
  border-color: rgba(45, 212, 191, 0.35);
}

/* Match ProjectStatus.vue / Implementing.vue accept button styling */
.btn-primary {
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-weight: 600;
  border: 1px solid var(--glass-border);
  cursor: pointer;
  background: var(--primary);
  color: #000;
  border: none;
}

.btn-primary:disabled {
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
</style>
