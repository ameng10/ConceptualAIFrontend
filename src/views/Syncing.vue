<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi } from '@/services/api'
import ImplementationExplorer from '@/components/ImplementationExplorer.vue'
import DesignViewer from '@/components/DesignViewer.vue'
import SyncExplorer from '@/components/SyncExplorer.vue'
import PlayWhileYouWait from '@/components/PlayWhileYouWait.vue'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import GeminiCredentialsForm from '@/components/GeminiCredentialsForm.vue'
import { ArrowLeft, ChevronDown, Clipboard, ClipboardCheck } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const projectId = route.params.id as string
const projectName = ref<string>('')
const initialProjectStatus = ref<string>('')

const syncStatus = ref<'starting' | 'started' | 'error'>('starting')
const syncError = ref('')
const syncDoc = ref<any | null>(null)

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

const isActive = ref(true)
onUnmounted(() => {
  isActive.value = false
})

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

const isSyncGenerationComplete = (status: unknown) => String(status || '') === 'syncs_generated'

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

  // Default UI state.
  syncStatus.value = 'started'

  // Best-effort: load previous stage docs for the bottom dropdowns.
  // Do not block sync visibility on these requests.
  ;(async () => {
    try {
      const d = await projectApi.getDesign(projectId)
      if (isActive.value) designDoc.value = d
    } catch {
      // ignore
    }
  })()
  ;(async () => {
    try {
      const impl = await projectApi.getImplementation(projectId)
      if (isActive.value) implementationDoc.value = impl
    } catch {
      // ignore
    }
  })()

  // If the project is already in the completion state, fetch sync artifacts once.
  // No polling.
  const alreadyComplete = isSyncGenerationComplete(initialProjectStatus.value)
  if (alreadyComplete) {
    try {
      const raw = await projectApi.getSyncs(projectId)
      syncDoc.value = unwrapSyncPayload(raw)
      return
    } catch {
      // Fall through to starting generation.
    }
  }

  // Otherwise, start generation and rely on the POST response.
  // No polling: backend is expected to hold the request until results are ready.
  try {
    syncStatus.value = 'starting'
    const res = await projectApi.startSyncGeneration(projectId)
    syncStatus.value = 'started'

    const payload = unwrapSyncPayload(res)
    const hasSyncs = Array.isArray((payload as any)?.syncs) && (payload as any).syncs.length > 0
    const hasApiDefinition = Boolean((payload as any)?.apiDefinition)
    const hasEndpointBundles = Array.isArray((payload as any)?.endpointBundles) && (payload as any).endpointBundles.length > 0
    if (hasSyncs || hasApiDefinition || hasEndpointBundles) {
      syncDoc.value = payload
    }
  } catch (e) {
    syncStatus.value = 'error'
    syncError.value = e instanceof Error ? e.message : String(e)
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
      <div class="actions">
        <GeminiCredentialsForm class="header-gemini" />
      </div>
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

          <div style="margin-top: 1rem; display: flex; justify-content: flex-start;">
            <button
              class="btn-primary"
              type="button"
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
</style>
