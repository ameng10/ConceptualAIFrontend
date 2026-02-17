<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi, type Project } from '@/services/api'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import ClarificationDialog from '@/components/ClarificationDialog.vue'
import PlanViewer from '@/components/PlanViewer.vue'
import DesignViewer from '@/components/DesignViewer.vue'
import PlayWhileYouWait from '@/components/PlayWhileYouWait.vue'
import GeminiCredentialsForm from '@/components/GeminiCredentialsForm.vue'
import { ArrowLeft, Share2 } from 'lucide-vue-next'
import { toastDesignReady, toastDesignUpdated, toastPlanReady, toastPlanUpdated } from '@/services/toast'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string
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

const tryHydrateFromQuery = () => {
  const planQ = route.query?.plan
  if (planQ && typeof planQ === 'string') {
    try {
      const decoded = decodeURIComponent(planQ)
      const plan = JSON.parse(decoded)
      planDoc.value = { status: 'complete', plan }
      if (!planToastShown.value) {
        toastPlanReady()
        planToastShown.value = true
      }
    } catch {
      // ignore
    }
  }

  const questionsQ = route.query?.questions
  if (questionsQ && typeof questionsQ === 'string') {
    try {
      const decoded = decodeURIComponent(questionsQ)
      const qs = JSON.parse(decoded)
      if (Array.isArray(qs)) {
        questions.value = qs
        showClarification.value = true
      }
    } catch {
      // ignore
    }
  }

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

const fetchPlanAfterItExists = async () => {
  // Only fetch the plan from the backend *after* we've already received a plan payload.
  // This avoids triggering GET /projects/:id/plan during active planning, which can time out.
  if (!planDoc.value?.plan) return
  try {
    const plan = await projectApi.getPlan(projectId)
    if (plan) {
      planDoc.value = { status: 'complete', plan }
      planningStatus.value = 'planning_complete'
      if (!planToastShown.value) {
        toastPlanReady()
        planToastShown.value = true
      }
    }
  } catch (error) {
    console.error('Failed to fetch project plan:', error)
  }
}

const handleClarificationSubmit = async (answers: Record<string, string>) => {
  try {
    await projectApi.provideClarification(projectId, answers)
    showClarification.value = false
    // After clarifications, planning resumes on the backend.
    // We show a lightweight waiting state and then fetch the plan so the user sees it.
    if (!planDoc.value?.plan) {
      planDoc.value = { status: 'processing' }
    }
    planningStatus.value = 'planning'

    try {
      const plan = await projectApi.getPlan(projectId)
      if (plan) {
        planDoc.value = { status: 'complete', plan }
        planningStatus.value = 'planning_complete'
        if (!planToastShown.value) {
          toastPlanReady()
          planToastShown.value = true
        }
      }
    } catch (e) {
      console.error('Failed to fetch project plan after clarification:', e)
    }
  } catch (error) {
    console.error('Failed to submit clarifications:', error)
  }
}

onMounted(() => {
  tryHydrateFromQuery()
  // View Details behavior:
  // - If design exists: show design phase and render it.
  // - Else if plan exists: show planning phase and render it.
  ;(async () => {
    const statusFromQuery = planningStatus.value
    const shouldPreferPlan = statusFromQuery === 'planning_complete'

    // Only attempt to fetch an existing plan when we have a status that could actually have one.
    // This prevents noisy/early GET /projects/:id/plan calls during active planning or clarification.
    const planFetchAllowed =
      statusFromQuery === 'planning_complete' ||
      statusFromQuery === 'designing' ||
      statusFromQuery === 'design_complete' ||
      statusFromQuery === 'implementing' ||
      statusFromQuery === 'syncing' ||
      statusFromQuery === 'building' ||
      statusFromQuery === 'assembling' ||
      statusFromQuery === 'complete' ||
      statusFromQuery === 'error'

    // Only attempt to fetch an existing design when we have a status that could actually have one.
    // This prevents noisy/early GET /projects/:id/design calls while we're still awaiting clarification.
    const designFetchAllowed =
      statusFromQuery === 'designing' ||
      statusFromQuery === 'design_complete' ||
      statusFromQuery === 'implementing' ||
      statusFromQuery === 'syncing' ||
      statusFromQuery === 'building' ||
      statusFromQuery === 'assembling' ||
      statusFromQuery === 'complete' ||
      statusFromQuery === 'error'

    // If we're explicitly in designing, do a single best-effort fetch.
    // No polling: we rely on the initial POST /design call to hold the connection until ready,
    // or the user can refresh later if the backend returns immediately.
    if (statusFromQuery === 'designing') {
      accepted.value = true
      designStatus.value = 'starting'
      designError.value = ''
      designDoc.value = null

      try {
        const design = await projectApi.getDesign(projectId)
        if (design) {
          designDoc.value = design
          if (!designToastShown.value) {
            toastDesignReady()
            designToastShown.value = true
          }
        }
      } catch {
        // ignore; user can refresh later
      } finally {
        designStatus.value = 'started'
      }
      return
    }

    // If planning is complete, fetch/show the plan first.
    // (Avoid calling getDesign in this case; user explicitly wants getPlan.)
    if (shouldPreferPlan) {
      if (!planDoc.value?.plan) {
        try {
          const plan = await projectApi.getPlan(projectId)
          if (plan) {
            planDoc.value = { status: 'complete', plan }
            planningStatus.value = 'planning_complete'
            if (!planToastShown.value) {
              toastPlanReady()
              planToastShown.value = true
            }
          }
        } catch (e) {
          console.error('Failed to fetch plan:', e)
        }
      } else {
        // We have a plan already; optionally refresh it.
        fetchPlanAfterItExists()
      }
      return
    }

    // Otherwise: prefer design (but only if the status can legitimately have it)
    if (designFetchAllowed) {
      try {
        const design = await projectApi.getDesign(projectId)
        if (design) {
          designDoc.value = design
          accepted.value = true
          planningStatus.value = 'designing'
          if (!designToastShown.value) {
            toastDesignReady()
            designToastShown.value = true
          }
          return
        }
      } catch {
        // ignore
      }
    }

    // 2) Otherwise show plan (hydrate-first, then fetch if allowed)
    if (!planDoc.value?.plan) {
      if (planFetchAllowed) {
        try {
          const plan = await projectApi.getPlan(projectId)
          if (plan) {
            planDoc.value = { status: 'complete', plan }
            planningStatus.value = planningStatus.value || 'planning_complete'
            if (!planToastShown.value) {
              toastPlanReady()
              planToastShown.value = true
            }
          }
        } catch (e) {
          console.error('Failed to fetch plan:', e)
        }
      }
    } else {
      // We have a plan already; optionally refresh it.
      fetchPlanAfterItExists()
    }
  })()
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
  // Hide the plan + kick off design immediately.
  designStatus.value = 'starting'
  designError.value = ''
  designDoc.value = null
  // Move the progress UI to the designing stage right away.
  planningStatus.value = 'designing'
  projectApi
    .startDesign(projectId, planDoc.value.plan)
    .then((res) => {
      designStatus.value = 'started'
      // Try to capture any design payload the backend returns.
      designDoc.value = (res as any)?.design ?? (res as any)?.result ?? res
  toastDesignReady()
  designToastShown.value = true
    })
    .catch((err) => {
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
    const res = await projectApi.modifyPlan(projectId, feedback.value.trim())
    planDoc.value = { status: 'complete', plan: res.plan }
    planningStatus.value = 'planning_complete'
    accepted.value = false
    feedback.value = ''
  toastPlanUpdated()
  // Allow future "Plan ready" toasts if the plan gets re-fetched later.
  planToastShown.value = true
  } catch (err) {
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
    const res = await projectApi.modifyDesign(projectId, designFeedback.value.trim())
    designDoc.value = (res as any).design
    designFeedback.value = ''
  toastDesignUpdated()
  designToastShown.value = true
  } catch (err) {
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
        <GeminiCredentialsForm v-if="planningStatus !== 'complete'" class="header-gemini" />
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

      <div v-if="planDoc && !accepted" class="glass fade-in plan-card">
        <h2 class="section-title">Planner</h2>
        <p v-if="planDoc.status === 'processing'" class="muted">Planning agent is working…</p>
        <p v-else-if="planDoc.status === 'complete'" class="muted">Review the plan, then accept to continue.</p>
        <p v-else-if="planDoc.status === 'needs_clarification'" class="muted">Needs clarification to proceed.</p>
        <p v-else-if="planDoc.status === 'error'" class="muted">Planner errored.</p>

        <div v-if="planDoc.status === 'complete' && planDoc.plan" class="json">
          <PlanViewer :plan="planDoc.plan" />
        </div>

        <div v-if="planDoc.status === 'complete' && planDoc.plan" class="review-actions">
          <div class="review-header">
            <h3 class="review-title">Is this plan good?</h3>
            <span v-if="accepted" class="accepted-pill">Accepted</span>
          </div>

          <div class="review-buttons">
            <button class="btn-primary" type="button" :disabled="accepted" @click="handleAcceptPlan">
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

      <div v-if="accepted" class="glass fade-in plan-card">
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
              :disabled="false"
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
              placeholder="Example: Use a different concept library and simplify the data model."
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

.header-nav .header-gemini {
  max-width: 480px;
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
</style>
