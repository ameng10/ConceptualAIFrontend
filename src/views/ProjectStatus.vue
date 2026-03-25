<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi, type Project } from '@/services/api'
import { usePolling } from '@/composables/usePolling'
import { isHttp524 } from '@/services/http-errors'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import ClarificationDialog from '@/components/ClarificationDialog.vue'
import PlanViewer from '@/components/PlanViewer.vue'
import DesignViewer from '@/components/DesignViewer.vue'
import PlayWhileYouWait from '@/components/PlayWhileYouWait.vue'
import { ArrowLeft, RotateCcw, Share2 } from 'lucide-vue-next'
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

const planToastShown = ref(false)
const designToastShown = ref(false)
const planningError = ref('')

// Revert
const isReverting = ref(false)
const revertError = ref('')
const REVERT_BLOCKED_STATUSES = ['planning', 'planning_complete', 'awaiting_clarification', 'awaiting_input']
const canRevert = computed(() => {
  const status = planningStatus.value ?? project.value?.status
  if (!status) return false
  return !REVERT_BLOCKED_STATUSES.includes(status)
})

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

const isPastPlanningStage = computed(() => {
  const status = planningStatus.value ?? project.value?.status
  return Boolean(status && PAST_PLANNING_STATUSES.includes(status as any))
})

const tryHydrateFromQuery = () => {
  const statusQ = route.query?.planningStatus
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
const shouldPollProjectStatus = (status: string | null | undefined) =>
  Boolean(status) && (isPlanInProgressStatus(String(status)) || isDesignInProgressStatus(String(status)))

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
    const status = p.status
    planningStatus.value = status
    accepted.value = Boolean(status && PAST_PLANNING_STATUSES.includes(status as any))

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

    // Stop polling once this page reaches a stable non-in-progress state.
    if (!shouldPollProjectStatus(status)) {
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

onMounted(() => {
  tryHydrateFromQuery()
  void tickProject()
  if (shouldPollProjectStatus(planningStatus.value)) {
    projectPoll.start()
  }
})

const handleAcceptDesign = () => {
  if (!designDoc.value) return

  // Move the user to the dedicated implementing page (clean waiting experience).
  // We pass the design payload so the implementing page can kick off the agent.
  router.push({
    path: `/project/${projectId}/implementing`,
    query: {
      projectName: projectName.value ? encodeURIComponent(projectName.value) : undefined,
    },
  })
}

const handleAcceptPlan = () => {
  if (!planDoc.value?.plan) return
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
      designStatus.value = 'error'
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

const handleRevert = async () => {
  isReverting.value = true
  revertError.value = ''
  try {
    await projectApi.revertProject(projectId)
    const updatedProject = await projectApi.getProject(projectId)
    project.value = updatedProject
    const newStatus = updatedProject.status

    // Reset design state
    accepted.value = false
    designDoc.value = null
    designStatus.value = 'idle'
    designError.value = ''
    planDoc.value = null
    planningStatus.value = newStatus
    planToastShown.value = false
    designToastShown.value = false

    // Refetch plan — it persists after reverting from design stage
    try {
      const plan = await projectApi.getPlan(projectId)
      if (plan) {
        planDoc.value = { status: 'complete', plan }
        planningStatus.value = 'planning_complete'
        if (project.value) project.value = { ...project.value, status: 'planning_complete' }
      }
    } catch {
      // Plan may not be available; let the waiting state show
    }
  } catch (err) {
    if (isHttp524(err)) return
    revertError.value = err instanceof Error ? err.message : String(err)
  } finally {
    isReverting.value = false
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

  <div v-if="planningStatus !== 'complete'" class="play-standalone">
        <PlayWhileYouWait />
      </div>

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
            <button class="btn-secondary" type="button" :disabled="isModifying" @click="handleModifyPlan">
              <span v-if="!isModifying">Modify plan</span>
              <span v-else>Modifying…</span>
            </button>
          </div>
        </div>

      </div>

      <div v-if="accepted || isPastPlanningStage" class="glass fade-in plan-card">
        <h2 class="section-title">Design</h2>
        <p v-if="designStatus === 'starting'" class="muted">Sending accepted plan to the design agent…</p>
        <p v-else-if="designStatus === 'started'" class="muted">Design agent started.</p>
        <p v-else-if="designStatus === 'error'" class="muted">Failed to start design.</p>
        <div v-if="designError" class="error-msg">{{ designError }}</div>

          <div v-if="designDoc" class="json" style="margin-top: 1rem;">
            <DesignViewer :design="designDoc" />
          </div>

        <div v-if="designDoc" class="review-actions">
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
              Accept design
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
            <button class="btn-secondary" type="button" :disabled="isModifyingDesign" @click="handleModifyDesign">
              <span v-if="!isModifyingDesign">Modify design</span>
              <span v-else>Modifying…</span>
            </button>
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

      <div v-if="canRevert" class="glass fade-in revert-card">
        <div class="revert-row">
          <div class="revert-info">
            <span class="revert-label">Revert to previous stage</span>
            <span class="revert-desc">Undo the current stage and clear its artifacts.</span>
          </div>
          <button class="btn-revert" type="button" :disabled="isReverting" @click="handleRevert">
            <RotateCcw :size="15" />
            <span>{{ isReverting ? 'Reverting…' : 'Revert' }}</span>
          </button>
        </div>
        <div v-if="revertError" class="error-msg" style="margin-top: 0.5rem;">{{ revertError }}</div>
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
</style>
