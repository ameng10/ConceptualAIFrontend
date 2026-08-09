<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Users } from 'lucide-vue-next'
import {
  adminApi,
  clearAdminToken,
  type AdminBuild,
} from '@/services/admin-api'

const router = useRouter()
const builds = ref<AdminBuild[]>([])
const loading = ref(false)
const error = ref('')
const failuresOnly = ref(false)
const selected = ref<AdminBuild | null>(null)
const transcriptFor = ref('')
const transcript = ref('')
const transcriptTruncated = ref(false)
const transcriptLoading = ref(false)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    builds.value = await adminApi.getBuilds({ hasFailures: failuresOnly.value || undefined, limit: 100 })
  } catch (e: any) {
    const status = e?.response?.status
    if (status === 401 || status === 403) {
      clearAdminToken()
      router.replace('/admin')
      return
    }
    error.value = e?.response?.data?.error || e?.message || 'Failed to load builds'
  } finally {
    loading.value = false
  }
}

const select = async (b: AdminBuild) => {
  selected.value = selected.value?._id === b._id ? null : b
  transcriptFor.value = ''
  transcript.value = ''
}

const showTranscript = async (b: AdminBuild, endpointName: string) => {
  transcriptLoading.value = true
  transcriptFor.value = endpointName
  transcript.value = ''
  transcriptTruncated.value = false
  try {
    const res = await adminApi.getTranscript(b._id, endpointName)
    transcript.value = res.transcript ?? '(no transcript stored)'
    transcriptTruncated.value = res.truncated
  } catch (e: any) {
    transcript.value = `(failed to load transcript: ${e?.message || 'error'})`
  } finally {
    transcriptLoading.value = false
  }
}

// Leave the observatory WITHOUT signing out. Admin access rides the ordinary
// session now (the server gates each /admin route on _isAdmin), so this is an
// exit from a view, not the end of a session — clearing anything here would
// drop the operator out of the app entirely, which is not what leaving a
// dashboard should do. The admin-realm token is left untouched for the same
// reason; the 401/403 handler in load() is still what clears a stale one.
const backToApp = () => {
  router.push('/build')
}

const fmtDuration = (b: AdminBuild) => {
  if (!b.finishedAt) return '—'
  const ms = new Date(b.finishedAt).getTime() - new Date(b.startedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const min = Math.floor(ms / 60000)
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`
}

const failedCount = (b: AdminBuild) =>
  b.endpoints.filter((e) => e.status === 'failed' || e.status === 'hung').length

const fmtCost = (b: AdminBuild) => {
  if (typeof b.costUsd !== 'number') return '—'
  return `$${b.costUsd.toFixed(2)}${b.costIsLowerBound ? '+' : ''}`
}

onMounted(load)
</script>

<template>
  <div class="admin-builds">
    <div class="toolbar">
      <h1>Builds</h1>
      <label class="filter">
        <input v-model="failuresOnly" type="checkbox" @change="load" />
        failures only
      </label>
      <router-link class="btn-icon" title="Accounts (comp / delete)" to="/admin/accounts">
        <Users :size="16" />
      </router-link>
      <button class="btn-icon" title="Refresh" @click="load"><RefreshCw :size="16" /></button>
      <button class="btn-icon" title="Back to app" @click="backToApp"><ArrowLeft :size="16" /></button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="dim">Loading…</p>
    <p v-else-if="builds.length === 0" class="dim">No build records yet.</p>

    <div v-if="builds.length" class="grid-scroll">
    <table class="grid">
      <thead>
        <tr>
          <th>started</th>
          <th>kind</th>
          <th>project</th>
          <th>owner</th>
          <th>outcome</th>
          <th>failed eps</th>
          <th>duration</th>
          <th>credits</th>
          <th>cost</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="b in builds" :key="b._id">
          <tr class="row" :class="{ active: selected?._id === b._id }" @click="select(b)">
            <td>{{ new Date(b.startedAt).toLocaleString() }}</td>
            <td>{{ b.kind }}</td>
            <td class="ellip" :title="b.project">{{ b.projectName || b.project }}</td>
            <td class="ellip" :title="b.owner">{{ b.ownerEmail || b.owner }}</td>
            <td>
              <span class="chip" :class="b.outcome || 'running'">{{ b.outcome || 'running' }}</span>
            </td>
            <td>{{ failedCount(b) || '' }}</td>
            <td>{{ fmtDuration(b) }}</td>
            <td>{{ b.credits ?? '—' }}</td>
            <td>{{ fmtCost(b) }}</td>
          </tr>
          <tr v-if="selected?._id === b._id" class="detail">
            <td colspan="9">
              <div class="stages">
                <span
                  v-for="(outcome, stage) in b.stageOutcomes"
                  :key="stage"
                  class="chip"
                  :class="outcome.status === 'complete' ? 'complete' : 'failed'"
                >
                  {{ stage }}: {{ outcome.status }}
                </span>
              </div>
              <div v-if="b.endpoints.length" class="endpoints">
                <div v-for="ep in b.endpoints" :key="ep.name" class="endpoint">
                  <span class="chip" :class="ep.status">{{ ep.status }}</span>
                  <span class="mono">{{ ep.name }}</span>
                  <span class="dim">{{ ep.iterations }} iters · {{ ep.escalationPath.join(' → ') }}</span>
                  <span v-if="ep.failReason" class="dim">{{ ep.failReason }}</span>
                  <button
                    v-if="ep.hasTranscript"
                    class="btn-link"
                    @click.stop="showTranscript(b, ep.name)"
                  >
                    transcript
                  </button>
                </div>
              </div>
              <p v-else class="dim">No endpoint records.</p>
              <div v-if="transcriptFor" class="transcript">
                <div class="transcript-head">
                  <strong class="mono">{{ transcriptFor }}</strong>
                  <span v-if="transcriptTruncated" class="chip failed">TRUNCATED</span>
                </div>
                <pre v-if="!transcriptLoading">{{ transcript }}</pre>
                <p v-else class="dim">Loading transcript…</p>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    </div>
  </div>
</template>

<style scoped>
.admin-builds {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.toolbar h1 {
  font-size: 1.25rem;
  margin-right: auto;
}

.filter {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.grid-scroll {
  /* A single long value must scroll the table, never stretch a column and push
     the headers out of step with their cells. */
  overflow-x: auto;
}

.grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  /* Fixed layout + explicit widths: with `auto`, an unbroken 36-char id sizes
     its column from content and every other column re-flows around it. */
  table-layout: fixed;
  min-width: 900px;
}

/* started, kind, project, owner, outcome, failed, duration, credits, cost */
.grid th:nth-child(1), .grid td:nth-child(1) { width: 14%; }
.grid th:nth-child(2), .grid td:nth-child(2) { width: 7%; }
.grid th:nth-child(3), .grid td:nth-child(3) { width: 21%; }
.grid th:nth-child(4), .grid td:nth-child(4) { width: 21%; }
.grid th:nth-child(5), .grid td:nth-child(5) { width: 10%; }
.grid th:nth-child(6), .grid td:nth-child(6) { width: 7%; }
.grid th:nth-child(7), .grid td:nth-child(7) { width: 7%; }
.grid th:nth-child(8), .grid td:nth-child(8) { width: 6%; }
.grid th:nth-child(9), .grid td:nth-child(9) { width: 7%; }

/* Long single-token values (ids, emails) truncate instead of forcing width. */
.ellip {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The expanded detail row spans everything and must NOT inherit the fixed
   column widths or its content gets clipped. */
.grid td[colspan] {
  width: auto;
  white-space: normal;
  overflow: visible;
}

.grid th {
  text-align: left;
  padding: 0.5rem 0.6rem;
  white-space: nowrap;
  color: var(--text-dim);
  font-weight: 500;
  border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
}

.grid td {
  text-align: left;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: top;
}

.row {
  cursor: pointer;
}

.row:hover,
.row.active {
  background: rgba(255, 255, 255, 0.04);
}

.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
}

.dim {
  color: var(--text-dim);
  font-size: 0.85rem;
}

.error {
  color: #f87171;
}

.chip {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.chip.complete,
.chip.converged {
  color: #4ade80;
  border-color: #4ade8055;
}

.chip.failed,
.chip.hung,
.chip.aborted {
  color: #f87171;
  border-color: #f8717155;
}

.chip.running {
  color: #facc15;
  border-color: #facc1555;
}

/* Neither success nor failure: the run never finished because its project was
   removed. Muted so it reads as "no longer relevant" rather than an incident. */
.chip.deleted {
  color: #a1a1aa;
  border-color: #a1a1aa55;
  text-decoration: line-through;
}

.stages,
.endpoints {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.5rem 0;
}

.endpoints {
  flex-direction: column;
}

.endpoint {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: underline;
  padding: 0;
}

.transcript {
  margin-top: 0.75rem;
}

.transcript-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
}

.transcript pre {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  max-height: 480px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
