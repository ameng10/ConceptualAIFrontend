<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi, type Project } from '@/services/api'
import { usePolling } from '@/composables/usePolling'
import { isHttp524 } from '@/services/http-errors'
import { navigateOnCompletion } from '@/services/project-stage-routing'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import ClarificationDialog from '@/components/ClarificationDialog.vue'
import PlanViewer from '@/components/PlanViewer.vue'
import DesignViewer from '@/components/DesignViewer.vue'
import { ArrowLeft, Share2 } from 'lucide-vue-next'
import { toastDesignUpdated, toastPlanReady, toastPlanUpdated } from '@/services/toast'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string

const project = ref<Project | null>(null)
const planningStatus = ref<string | null>(null)
const planDoc = ref<any | null>(null)
const showClarification = ref(false)
const questions = ref<string[]>([])
const projectName = ref<string>('')

// Merged Planning review: one turn produces plan + concepts + quote; the user
// reviews all three together with one approve and per-scope modify inputs.
const feedback = ref('')
const isModifying = ref(false)
const modifyError = ref('')
const accepted = ref(false)
const designError = ref('')
const designDoc = ref<any | null>(null)
const quote = ref<
  { actions: number; queries: number; credits: number; iteration?: boolean; newOps?: number } | null
>(null)

// Design-scoped modify (PUT /design) — re-patches concepts + quote only.
const designFeedback = ref('')
const isModifyingDesign = ref(false)
const modifyDesignError = ref('')

const planToastShown = ref(false)
const planningError = ref('')

const toErrorMessage = (err: unknown, fallback: string) => {
  const anyErr = err as any
  return anyErr?.response?.data?.error || anyErr?.response?.data?.message || (err instanceof Error ? err.message : fallback)
}


// Statuses where design has already started or is in progress - don't allow "Accept plan" to start design again
const IN_PROGRESS_STATUSES = [
  'planning',
  'designing',
  'design_complete',
  'implementing',
  'implemented',
  'sync_generating',
  'syncs_generated',
  'syncing',
  'building',
  'assembling',
  'assembled',
  'complete',
  'error',
  'awaiting_clarification',
  'awaiting_input',
] as const

// Statuses where we're past planning - design already started or complete. The awaiting_*
// statuses are NOT past planning: the plan isn't accepted yet, we're parked waiting on the
// user's clarification answers, so they stay on the planning side. Otherwise `accepted` /
// `isPastPlanningStage` flip on during clarification and the pipeline graphic wrongly jumps to
// "Building" behind the clarification dialog.
const PAST_PLANNING_STATUSES = IN_PROGRESS_STATUSES.filter(
  (s) => s !== 'planning' && s !== 'awaiting_clarification' && s !== 'awaiting_input',
)

const canStartDesign = computed(() => {
  const status = planningStatus.value ?? project.value?.status
  if (status && IN_PROGRESS_STATUSES.includes(status as any)) return false
  return true
})

const isPastPlanningStage = computed(() => {
  const status = planningStatus.value ?? project.value?.status
  return Boolean(status && PAST_PLANNING_STATUSES.includes(status as any))
})

const tryHydrateFromQuery = () => {
  const statusQ =
    typeof route.query?.planningStatus === 'string'
      ? route.query.planningStatus
      : typeof route.query?.projectStatus === 'string'
        ? route.query.projectStatus
        : null
  if (statusQ && typeof statusQ === 'string') {
    planningStatus.value = statusQ
  }

  const nameQ = route.query?.projectName
  if (nameQ && typeof nameQ === 'string') {
    try {
      projectName.value = decodeURIComponent(nameQ)
    } catch {
      projectName.value = nameQ
    }
  }
}

// The merged planning turn covers plan generation AND concept design ("designing" is a
// design-scoped modify re-running inside the same stage).
const isPlanInProgressStatus = (status: string) =>
  status === 'planning' ||
  status === 'designing' ||
  status === 'awaiting_clarification' ||
  status === 'awaiting_input'

// Building statuses that the backend auto-advances through. While in any of these, this page
// stays mounted as a read-only "Building…" progress view (the 3-bubble indicator with Building
// active) and keeps polling until the project completes.
const BUILDING_STATUSES = [
  'design_complete',
  'implementing',
  'implemented',
  'sync_generating',
  'syncs_generated',
  'syncing',
  'building',
  'assembling',
]
const isBuildingStatus = (status: string | null | undefined) =>
  Boolean(status) && BUILDING_STATUSES.includes(String(status))

// Keep polling while the planning turn is in progress or the backend is auto-building. We stop
// once the user is parked at the review gate or the project reaches a terminal/complete status
// (which navigates away to the completed page).
const shouldPollProjectStatus = (status: string | null | undefined) => {
  if (!status) return false
  const s = String(status)
  if (isPlanInProgressStatus(s)) return true
  return isBuildingStatus(s)
}

const refreshPlan = async () => {
  const review = await projectApi.getPlanReview(projectId)
  if (!review || typeof review !== 'object') return
  const planPayload = (review as any).plan ?? review

  const status = String((planPayload as any)?.status ?? '')
  if (status === 'planning') {
    planDoc.value = { status: 'processing' }
    if (planningStatus.value !== 'designing') planningStatus.value = 'planning'
    return
  }

  if (status === 'awaiting_clarification' || status === 'awaiting_input') {
    const qs = Array.isArray((planPayload as any)?.questions) ? (planPayload as any).questions : []
    questions.value = qs
    showClarification.value = true
    planDoc.value = { status: 'needs_clarification' }
    planningStatus.value = 'awaiting_clarification'
    return
  }

  // Any non-status plan payload is the ready merged review: plan + concepts + quote.
  planDoc.value = { status: 'complete', plan: planPayload }
  designDoc.value = (review as any).concepts ?? null
  quote.value = (review as any).quote ?? null
  planningStatus.value = 'planning_complete'
  if (project.value) project.value = { ...project.value, status: 'planning_complete' as any }
  if (!planToastShown.value) {
    toastPlanReady()
    planToastShown.value = true
  }
}

const tickProject = async () => {
  try {
    const p = await projectApi.getProject(projectId)
    project.value = p
    if (p?.name) {
      projectName.value = p.name
    }
    const status = p.status
    const iterating = Boolean((p as any)?.iterating)
    planningStatus.value = status
    accepted.value = Boolean(status && PAST_PLANNING_STATUSES.includes(status as any))

    // During an iteration the backend re-enters Planning (full_pipeline) or jumps to a building
    // status (frontend_only). Until it has actually moved off the prior terminal status, keep the
    // user on the plan-review page instead of bouncing back to the completed page; otherwise the
    // brief `complete`/`assembled` window would route them straight back out of the editor.
    const iterationParkedOnPlan =
      iterating && (status === 'complete' || status === 'assembled')

    // Polling refreshes the on-page state (progress indicator, plan/design docs). The only route
    // change it drives is the final hop to the completed/downloads page once THIS project finishes
    // — and `navigateOnCompletion` only fires for the project currently in the URL, so a poll for
    // another sandbox can't yank the user between projects. (During an iteration the brief
    // complete/assembled window is parked on the plan, so we skip it.)
    if (!iterationParkedOnPlan) {
      const navigated = await navigateOnCompletion(
        router,
        route,
        projectId,
        status,
        p.name ?? projectName.value,
      )
      if (navigated) {
        projectPoll.stop()
        return
      }
    }

    if (isPlanInProgressStatus(status) || status === 'planning_complete') {
      await refreshPlan()
    }

    // Stop polling once this page reaches a stable non-in-progress state. While an iteration is
    // still settling on the prior terminal status, keep polling so we catch the transition into
    // Planning (or a building status).
    if (!shouldPollProjectStatus(status) && !iterationParkedOnPlan) {
      projectPoll.stop()
    }
  } catch (e) {
    if (isHttp524(e)) return
    planningError.value = toErrorMessage(e, 'Failed to refresh project status.')
  }
}

const projectPoll = usePolling(async () => {
  await tickProject()
}, 30_000)

const handleClarificationSubmit = async (answers: Record<string, string>) => {
  try {
    planningError.value = ''

    await projectApi.provideClarification(projectId, answers)
    showClarification.value = false
    planDoc.value = { status: 'processing' }
    planningStatus.value = 'planning'
    projectPoll.start()
    await tickProject()
  } catch (error) {
    console.error('Failed to submit clarifications:', error)
  }
}

// Auto-continue when a project is opened sitting at a stage checkpoint (e.g. a later stage
// failed and the status rolled back, and there's no "continue" button). Re-fires the next
// pipeline step:
//   design_complete  -> implement  (legacy parked gate from before the stage merge)
//   implemented      -> syncs
//   syncs_generated  -> build
// If the backend is still actively building, its per-project guard rejects the duplicate
// call harmlessly and polling just shows the real progress.
const maybeAutoContinue = async (status: string | null | undefined): Promise<boolean> => {
  const s = String(status ?? '')
  const fire = async (next: string, call: () => Promise<unknown>) => {
    planningStatus.value = next
    projectPoll.start()
    try {
      await call()
    } catch (err) {
      // 524 (gateway) is expected on long calls; any other rejection (e.g. a run already
      // active) is harmless here — the next poll reconciles the displayed status.
      if (!isHttp524(err)) { /* leave optimistic status; polling corrects it */ }
    }
    await tickProject()
  }
  if (s === 'design_complete') {
    await fire('implementing', () => projectApi.startImplementation(projectId))
    return true
  }
  if (s === 'implemented') {
    await fire('sync_generating', () => projectApi.startSyncGeneration(projectId))
    return true
  }
  if (s === 'syncs_generated') {
    await fire('building', () => projectApi.startBuild(projectId))
    return true
  }
  return false
}

onMounted(async () => {
  tryHydrateFromQuery()
  await tickProject()
  const status = planningStatus.value ?? project.value?.status
  const continued = await maybeAutoContinue(status)
  if (!continued && shouldPollProjectStatus(status)) {
    projectPoll.start()
  }
})

const handleAcceptPlan = () => {
  if (!planDoc.value?.plan) return
  planningError.value = ''
  designError.value = ''
  const previousAccepted = accepted.value
  const previousPlanningStatus = planningStatus.value
  // Accept the merged review: the build starts directly at implementing (the design
  // already ran inside the planning turn).
  accepted.value = true
  planningStatus.value = 'implementing'
  projectPoll.start()
  projectApi
    .startDesign(projectId, planDoc.value.plan)
    .then(async () => {
      await tickProject()
    })
    .catch((err) => {
      if (isHttp524(err)) return
      // If the build never actually started, restore the review state
      // so the user can reconnect and immediately try again.
      accepted.value = previousAccepted
      planningStatus.value = previousPlanningStatus
      designError.value = err instanceof Error ? err.message : String(err)
    })
}

const handleModifyPlan = async () => {
  modifyError.value = ''
  if (!feedback.value.trim()) {
    modifyError.value = 'Please describe what you want to change.'
    return
  }

  isModifying.value = true
  try {
    await projectApi.modifyPlan(projectId, feedback.value.trim())
    // One modify re-runs the whole merged turn: plan, then design + quote.
    planDoc.value = { status: 'processing' }
    designDoc.value = null
    quote.value = null
    planningStatus.value = 'planning'
    projectPoll.start()
    accepted.value = false
    feedback.value = ''
    toastPlanUpdated()
    await tickProject()
  } catch (err) {
    if (isHttp524(err)) return
    modifyError.value = err instanceof Error ? err.message : String(err)
  } finally {
    isModifying.value = false
  }
}

const handleModifyDesign = async () => {
  modifyDesignError.value = ''
  if (!designDoc.value) {
    modifyDesignError.value = 'No design to modify yet.'
    return
  }
  if (!designFeedback.value.trim()) {
    modifyDesignError.value = 'Please describe what you want to change.'
    return
  }

  isModifyingDesign.value = true
  try {
    await projectApi.modifyDesign(projectId, designFeedback.value.trim())
    // Design-scoped modify re-runs inside the merged stage; the review re-parks at
    // planning_complete with re-patched concepts + quote.
    designDoc.value = null
    quote.value = null
    planDoc.value = { status: 'processing' }
    planningStatus.value = 'designing'
    projectPoll.start()
    designFeedback.value = ''
    toastDesignUpdated()
    await tickProject()
  } catch (err) {
    if (isHttp524(err)) return
    modifyDesignError.value = err instanceof Error ? err.message : String(err)
  } finally {
    isModifyingDesign.value = false
  }
}
</script>

<template>
  <div class="status-view">
    <div class="header-nav fade-in">
      <router-link to="/" class="back-link">
        <ArrowLeft :size="18" /> Back to Generator
      </router-link>
      <div class="actions">
        <button class="btn-icon">
          <Share2 :size="18" />
        </button>
      </div>
    </div>

  <div class="content container">
      <div class="status-header fade-in">
        <h1>{{ projectName || 'New Project' }}</h1>
        <p class="subtitle">Workspace</p>
      </div>

      <ProjectStatusDisplay
  :status="((planningStatus as any) || 'planning')"
        :projectName="projectName || 'Project'"
  :holdPlanningActive="!accepted"
  :planAccepted="accepted"
      />

      <div v-if="planDoc && !accepted && !isPastPlanningStage" class="glass fade-in plan-card">
        <template v-if="planDoc.status !== 'complete'">
          <h2 class="section-title">Planning</h2>
          <p v-if="planDoc.status === 'processing'" class="muted">Planning agent is working — drafting the plan, resolving concepts, and pricing…</p>
          <p v-else-if="planDoc.status === 'needs_clarification'" class="muted">Needs clarification to proceed.</p>
          <p v-else-if="planDoc.status === 'error'" class="muted">Planner errored.</p>
          <div v-if="planningError" class="error-msg">{{ planningError }}</div>
        </template>

        <template v-if="planDoc.status === 'complete' && planDoc.plan">
          <div class="review-head">
            <div>
              <h2 class="section-title">Review your blueprint</h2>
              <p class="muted">The plan, the concepts it's built from, and the price — approve once to build.</p>
            </div>
            <div
              v-if="quote"
              class="quote-chip"
              :title="quote.iteration
                ? 'Iteration price: 1 credit base + the new operations this change adds'
                : 'Priced from the actions and queries of the selected concepts'"
            >
              <span class="quote-credits">{{ quote.credits }}</span>
              <span class="quote-unit">credit{{ quote.credits === 1 ? '' : 's' }}</span>
              <span v-if="quote.iteration" class="quote-unit">iteration</span>
            </div>
          </div>
          <div v-if="planningError" class="error-msg">{{ planningError }}</div>

          <section class="review-section">
            <header class="review-section-head">
              <h3>Plan</h3>
              <p class="muted">What your app does, page by page and flow by flow.</p>
            </header>
            <div class="json">
              <PlanViewer :plan="planDoc.plan" />
            </div>
          </section>

          <section class="review-section">
            <header class="review-section-head">
              <h3>Concepts</h3>
              <p class="muted">The tested building blocks your app is assembled from — expand any to read its full specification.</p>
            </header>
            <div v-if="designDoc" class="json">
              <DesignViewer :design="designDoc" />
            </div>
            <p v-else class="muted">Concepts are still being resolved…</p>
          </section>

          <div class="decision-bar">
            <div class="decision-copy">
              <span v-if="quote" class="decision-price">
                {{ quote.credits }} credit{{ quote.credits === 1 ? '' : 's' }}
                <span v-if="quote.iteration" class="decision-price-detail">· iteration — {{ quote.newOps ?? 0 }} new operation{{ (quote.newOps ?? 0) === 1 ? '' : 's' }}</span>
                <span v-else class="decision-price-detail">· {{ quote.actions }} actions + {{ quote.queries }} queries</span>
              </span>
              <span class="decision-hint">Approving starts the build — you can iterate again once it finishes.</span>
            </div>
            <button class="btn-primary btn-approve" type="button" :disabled="accepted || !canStartDesign || !designDoc" @click="handleAcceptPlan">
              Accept &amp; build
            </button>
          </div>
          <div v-if="designError" class="error-msg">{{ designError }}</div>
          <span v-if="accepted" class="accepted-pill">Accepted</span>

          <section class="review-section changes-section">
            <header class="review-section-head">
              <h3>Request changes</h3>
              <p class="muted">One modify updates the plan, concepts, and price together; use the concepts-only box for design-level tweaks.</p>
            </header>

            <div class="modify-grid">
              <div class="modify-block">
                <label class="modify-label">Plan &amp; concepts</label>
                <textarea
                  v-model="feedback"
                  class="modify-input"
                  rows="3"
                  placeholder="Example: Add user accounts and tags for notes."
                  :disabled="isModifying"
                />
                <div v-if="modifyError" class="error-msg">{{ modifyError }}</div>
                <div class="action-row">
                  <button class="btn-secondary" type="button" :disabled="isModifying" @click="handleModifyPlan">
                    <span v-if="!isModifying">Modify plan</span>
                    <span v-else>Modifying…</span>
                  </button>
                </div>
              </div>

              <div class="modify-block">
                <label class="modify-label">Concepts only</label>
                <textarea
                  v-model="designFeedback"
                  class="modify-input"
                  rows="3"
                  placeholder="Example: Split messaging and notifications into separate concepts."
                  :disabled="isModifyingDesign"
                />
                <div v-if="modifyDesignError" class="error-msg">{{ modifyDesignError }}</div>
                <div class="action-row">
                  <button class="btn-secondary" type="button" :disabled="isModifyingDesign || !designDoc" @click="handleModifyDesign">
                    <span v-if="!isModifyingDesign">Modify design</span>
                    <span v-else>Modifying…</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </template>

      </div>

      <div
        v-if="planningStatus !== 'planning_complete' && !planDoc && !designDoc"
        class="waiting-card glass fade-in"
      >
        <div class="loader-beam"></div>
        <p>Planning your backend…</p>
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

.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-dim);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--text);
}

.btn-icon {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-dim);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.container {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
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

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.subtitle {
  color: var(--text-dim);
}

.waiting-card {
  margin-top: 3rem;
  padding: 1.5rem;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.9375rem;
  overflow: hidden;
  position: relative;
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

.json pre {
  margin: 0;
  padding: 1rem;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--text);
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

.accepted-pill {
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: rgba(34, 197, 94, 0.95);
}

.review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.quote-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  flex: 0 0 auto;
}

.quote-credits {
  font-size: 1.375rem;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.1;
}

.quote-unit {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.review-section {
  margin-top: 1.5rem;
}

.review-section-head {
  margin-bottom: 0.75rem;
}

.review-section-head h3 {
  margin: 0 0 0.2rem;
  font-size: 1rem;
}

.review-section-head .muted {
  font-size: 0.8125rem;
}

.decision-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.decision-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.decision-price {
  font-weight: 700;
  color: var(--text);
}

.decision-price-detail {
  font-weight: 500;
  color: var(--text-dim);
  font-size: 0.8125rem;
}

.decision-hint {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.btn-approve {
  padding: 0.75rem 1.5rem;
  font-size: 0.9375rem;
  flex: 0 0 auto;
}

.changes-section {
  padding-top: 1.25rem;
  border-top: 1px solid var(--glass-border);
}

.modify-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 720px) {
  .modify-grid {
    grid-template-columns: 1fr;
  }

  .decision-bar {
    flex-direction: column;
    align-items: stretch;
  }
}

.review-buttons {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

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

.modify-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem;
}

.modify-label {
  font-size: 0.8125rem;
  color: var(--text-dim);
}

.modify-input {
  width: 100%;
  resize: vertical;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.error-msg {
  color: rgba(239, 68, 68, 0.95);
  font-size: 0.8125rem;
}

.loader-beam {
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(to right, transparent, var(--primary), transparent);
  animation: beam 2s infinite linear;
}

@keyframes beam {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

.loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
}

.revert-card {
  margin-top: 1.5rem;
  padding: 1rem 1.25rem;
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

@media (max-width: 720px) {
  .review-buttons,
  .action-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
