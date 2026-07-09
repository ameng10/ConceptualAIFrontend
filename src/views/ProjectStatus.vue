<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi, type Project } from '@/services/api'
import { socialApi } from '@/services/social-api'
import { usePolling } from '@/composables/usePolling'
import { isHttp524 } from '@/services/http-errors'
import { navigateOnCompletion } from '@/services/project-stage-routing'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import ClarificationDialog from '@/components/ClarificationDialog.vue'
import PlanViewer from '@/components/PlanViewer.vue'
import DesignViewer from '@/components/DesignViewer.vue'
import { ArrowLeft, Share2 } from 'lucide-vue-next'
import { toastDesignReady, toastDesignUpdated, toastPlanReady, toastPlanUpdated } from '@/services/toast'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string

const project = ref<Project | null>(null)
const planningStatus = ref<string | null>(null)
const planDoc = ref<any | null>(null)
const showClarification = ref(false)
const questions = ref<string[]>([])
const projectName = ref<string>('')

// Plan review actions
const feedback = ref('')
const isModifying = ref(false)
const modifyError = ref('')
const accepted = ref(false)
const designStatus = ref<'idle' | 'starting' | 'started' | 'error'>('idle')
const designError = ref('')
const designDoc = ref<any | null>(null)

// Design review actions
const designFeedback = ref('')
const isModifyingDesign = ref(false)
const modifyDesignError = ref('')

// Advanced setting: only advanced users review/modify the concept design.
const showConceptDesign = ref(false)

const planToastShown = ref(false)
const designToastShown = ref(false)
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

// Statuses where we're past planning - design already started or complete
const PAST_PLANNING_STATUSES = IN_PROGRESS_STATUSES.filter((s) => s !== 'planning')

const canStartDesign = computed(() => {
  const status = planningStatus.value ?? project.value?.status
  if (status && IN_PROGRESS_STATUSES.includes(status as any)) return false
  return true
})

// Statuses where we're past design - implementing or later; don't allow "Accept design" again
const PAST_DESIGN_STATUSES = [
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
] as const

const canAcceptDesign = computed(() => {
  const status = planningStatus.value ?? project.value?.status
  if (status && PAST_DESIGN_STATUSES.includes(status as any)) return false
  return true
})

// Parked at the advanced design-review gate: the backend stopped at design_complete and is
// waiting for the user to accept (build) or modify the design.
const parkedAtDesignReview = computed(() => {
  const status = planningStatus.value ?? project.value?.status
  return showConceptDesign.value && status === 'design_complete'
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

const isPlanInProgressStatus = (status: string) =>
  status === 'planning' || status === 'awaiting_clarification' || status === 'awaiting_input'

const isDesignInProgressStatus = (status: string) => status === 'designing'

// Building statuses that the backend auto-advances through. While in any of these, this page
// stays mounted as a read-only "Building…" progress view (the 3-bubble indicator with Building
// active) and keeps polling until the project completes.
const BUILDING_STATUSES = [
  'designing',
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

// Keep polling while planning is in progress, the design gate is active, or the backend is
// auto-building. We stop once the user is parked at a human gate (plan/design review) or the
// project reaches a terminal/complete status (which navigates away to the completed page).
const shouldPollProjectStatus = (status: string | null | undefined) => {
  if (!status) return false
  const s = String(status)
  if (isPlanInProgressStatus(s)) return true
  // Advanced users pause at design_complete; everyone else keeps building.
  if (s === 'design_complete') return !showConceptDesign.value
  return isBuildingStatus(s)
}

const refreshPlan = async () => {
  const planPayload = await projectApi.getPlan(projectId)
  if (!planPayload || typeof planPayload !== 'object') return

  const status = String((planPayload as any)?.status ?? '')
  if (status === 'planning') {
    planDoc.value = { status: 'processing' }
    planningStatus.value = 'planning'
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

  // Any non-status plan payload is considered ready plan data.
  planDoc.value = { status: 'complete', plan: planPayload }
  planningStatus.value = 'planning_complete'
  if (project.value) project.value = { ...project.value, status: 'planning_complete' as any }
  if (!planToastShown.value) {
    toastPlanReady()
    planToastShown.value = true
  }
}

const refreshDesign = async () => {
  const designPayload = await projectApi.getDesign(projectId)
  if (!designPayload || typeof designPayload !== 'object') return

  const status = String((designPayload as any)?.status ?? '')
  if (status === 'designing') {
    designStatus.value = 'starting'
    planningStatus.value = 'designing'
    return
  }

  designDoc.value = designPayload
  accepted.value = true
  designStatus.value = 'started'
  if (planningStatus.value === 'designing') {
    planningStatus.value = 'design_complete'
  }
  if (project.value && project.value.status === 'designing') {
    project.value = { ...project.value, status: 'design_complete' as any }
  }
  if (!designToastShown.value) {
    toastDesignReady()
    designToastShown.value = true
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

    const shouldLoadDesign =
      isDesignInProgressStatus(status) ||
      status === 'design_complete' ||
      status === 'implementing' ||
      status === 'implemented' ||
      status === 'sync_generating' ||
      status === 'syncs_generated' ||
      status === 'building' ||
      status === 'assembling' ||
      status === 'assembled' ||
      status === 'complete'

    if (shouldLoadDesign) {
      await refreshDesign()
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
//   design_complete -> implement   (unless the user reviews design first via showConceptDesign)
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
    if (showConceptDesign.value) return false // advanced users review the design first
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
  try {
    const profile = await socialApi.getMyProfile()
    showConceptDesign.value = Boolean(profile?.showConceptDesign)
  } catch {
    // Default advanced setting to off if the profile can't be loaded.
  }
  await tickProject()
  const status = planningStatus.value ?? project.value?.status
  const continued = await maybeAutoContinue(status)
  if (!continued && shouldPollProjectStatus(status)) {
    projectPoll.start()
  }
})

const handleAcceptDesign = () => {
  if (!designDoc.value) return
  designError.value = ''

  // Advanced "accept design" gate: start implementation, then let polling drive the UI through
  // the rest of the auto-build (the backend advances implement -> syncs -> build -> complete).
  const previousPlanningStatus = planningStatus.value
  planningStatus.value = 'implementing'
  projectPoll.start()
  projectApi
    .startImplementation(projectId)
    .then(async () => {
      await tickProject()
    })
    .catch((err) => {
      if (isHttp524(err)) return
      planningStatus.value = previousPlanningStatus
      designError.value = err instanceof Error ? err.message : String(err)
    })
}

const handleAcceptPlan = () => {
  if (!planDoc.value?.plan) return
  planningError.value = ''
  designError.value = ''
  const previousAccepted = accepted.value
  const previousPlanningStatus = planningStatus.value
  const previousDesignStatus = designStatus.value
  accepted.value = true
  designStatus.value = 'starting'
  designError.value = ''
  designDoc.value = null
  planningStatus.value = 'designing'
  projectPoll.start()
  projectApi
    .startDesign(projectId, planDoc.value.plan)
    .then(async () => {
      await tickProject()
    })
    .catch((err) => {
      if (isHttp524(err)) return
      // If the design agent never actually started, restore the review state
      // so the user can reconnect and immediately try again.
      accepted.value = previousAccepted
      planningStatus.value = previousPlanningStatus
      designStatus.value = previousDesignStatus
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
    planDoc.value = { status: 'processing' }
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
    designDoc.value = null
    designStatus.value = 'starting'
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
  :showConceptsStep="showConceptDesign"
      />

      <div v-if="planDoc && !accepted && !isPastPlanningStage" class="glass fade-in plan-card">
        <h2 class="section-title">Planner</h2>
        <p v-if="planDoc.status === 'processing'" class="muted">Planning agent is working…</p>
        <p v-else-if="planDoc.status === 'complete'" class="muted">Review the plan, then accept to continue.</p>
        <p v-else-if="planDoc.status === 'needs_clarification'" class="muted">Needs clarification to proceed.</p>
        <p v-else-if="planDoc.status === 'error'" class="muted">Planner errored.</p>
        <div v-if="planningError" class="error-msg">{{ planningError }}</div>

        <div v-if="planDoc.status === 'complete' && planDoc.plan" class="json">
          <PlanViewer :plan="planDoc.plan" />
        </div>

        <div v-if="planDoc.status === 'complete' && planDoc.plan" class="review-actions">
          <div class="review-header">
            <h3 class="review-title">Is this plan good?</h3>
            <span v-if="accepted" class="accepted-pill">Accepted</span>
          </div>

          <div class="review-buttons">
            <button class="btn-primary" type="button" :disabled="accepted || !canStartDesign || designStatus === 'starting'" @click="handleAcceptPlan">
              Accept plan
            </button>
          </div>

          <div class="modify-block">
            <label class="modify-label">Want changes? Describe what to modify:</label>
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
        </div>

      </div>

      <div v-if="showConceptDesign && (accepted || isPastPlanningStage)" class="glass fade-in plan-card">
        <h2 class="section-title">Design</h2>
        <p v-if="designStatus === 'starting'" class="muted">Design agent is working…</p>
        <p v-else-if="parkedAtDesignReview" class="muted">Concept design is ready — review it below, then accept to start the build.</p>
        <p v-else-if="designStatus === 'started'" class="muted">Design accepted — build in progress.</p>
        <p v-else-if="designStatus === 'error'" class="muted">Failed to start design.</p>
        <div v-if="designError" class="error-msg">{{ designError }}</div>

          <div v-if="designDoc" class="json" style="margin-top: 1rem;">
            <DesignViewer :design="designDoc" />
          </div>

        <!-- Accept/modify only while parked at the gate: once the build starts, a design
             modification would provision a competing design sandbox. -->
        <div v-if="designDoc && canAcceptDesign" class="review-actions">
          <div class="review-header">
            <h3 class="review-title">Is this design good?</h3>
          </div>

          <div class="review-buttons">
            <button
              class="btn-primary"
              type="button"
              :disabled="!canAcceptDesign"
              @click="handleAcceptDesign"
            >
              Accept design &amp; build
            </button>
          </div>

          <div class="modify-block">
            <label class="modify-label">Want changes? Describe what to modify in the design:</label>
            <textarea
              v-model="designFeedback"
              class="modify-input"
              rows="3"
              placeholder="Example: Use a different concept docs set and simplify the data model."
              :disabled="isModifyingDesign"
            />
            <div v-if="modifyDesignError" class="error-msg">{{ modifyDesignError }}</div>
            <div class="action-row">
              <button class="btn-secondary" type="button" :disabled="isModifyingDesign" @click="handleModifyDesign">
                <span v-if="!isModifyingDesign">Modify design</span>
                <span v-else>Modifying…</span>
              </button>
            </div>
          </div>
        </div>
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
