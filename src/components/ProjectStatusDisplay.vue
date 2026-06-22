<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, Circle, Loader2, AlertCircle, Download } from 'lucide-vue-next'

const props = defineProps<{
  status: string
  projectName: string
  holdPlanningActive?: boolean
  planAccepted?: boolean
  showDownloadButton?: boolean
  downloadDisabled?: boolean
  downloadLabel?: string
}>()

const emit = defineEmits<{
  download: []
}>()

const steps = [
  { id: 'planning', label: 'Planning' },
  { id: 'building', label: 'Building' },
  { id: 'complete', label: 'Complete' }
]

// Map every backend status onto one of the three high-level bubbles.
const PLANNING_STATUSES = [
  'planning',
  'planned',
  'planning_complete',
  'awaiting_clarification',
  'awaiting_input',
]
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
  'assembled',
]

const currentStepIndex = computed(() => {
  const status = props.status
  if (status === 'error') return -1
  // Once the plan is accepted, we are at (or past) the Building bubble.
  if (props.planAccepted) return 1
  if (props.holdPlanningActive) return 0
  if (PLANNING_STATUSES.includes(status)) return 0
  if (BUILDING_STATUSES.includes(status)) return 1
  if (status === 'complete') return 2
  return -1
})

const getStepStatus = (index: number) => {
  const status = props.status
  if (status === 'error') return 'error'
  // When fully complete, every prior step including "Complete" should render as complete.
  if (status === 'complete') {
    return index <= currentStepIndex.value ? 'complete' : 'pending'
  }
  if (index < currentStepIndex.value) return 'complete'
  if (index === currentStepIndex.value) return 'active'
  return 'pending'
}
</script>

<template>
  <div class="status-card glass fade-in" :data-hold-planning="holdPlanningActive ? 'true' : 'false'">
    <div class="card-header">
      <h2>{{ projectName }}</h2>
      <div v-if="status === 'complete'" class="badge badge-success">
        <CheckCircle2 :size="14" /> Ready for download
      </div>
      <div v-else-if="status === 'error'" class="badge badge-error">
        <AlertCircle :size="14" /> System Error
      </div>
      <div v-else class="badge badge-info">
        <Loader2 :size="14" class="spin" /> Processing...
      </div>
    </div>

    <div class="steps-container">
      <div v-for="(step, index) in steps" :key="step.id" class="step" :class="getStepStatus(index)">
        <div class="step-icon">
          <CheckCircle2 v-if="getStepStatus(index) === 'complete'" :size="20" />
          <Loader2 v-else-if="getStepStatus(index) === 'active'" :size="20" class="spin" />
          <Circle v-else :size="20" />
        </div>
        <div class="step-content">
          <span class="step-label">{{ step.label }}</span>
        </div>
        <div v-if="index < steps.length - 1" class="step-line"></div>
      </div>
    </div>

    <div v-if="status === 'complete' && showDownloadButton !== false" class="actions">
      <button 
        class="btn btn-primary" 
        type="button"
        :disabled="downloadDisabled"
        @click="emit('download')"
      >
        <Download :size="18" />
        {{ downloadLabel || 'Download Generated Project' }}
      </button>
    </div>

    <div v-if="status === 'error'" class="error-msg">
      <p>Something went wrong during generation. Our engineers are looking into it.</p>
    </div>
  </div>
</template>

<style scoped>
.status-card {
  padding: 2.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-info { background: rgba(99, 102, 241, 0.2); color: var(--primary); }
.badge-success { background: rgba(16, 185, 129, 0.2); color: var(--accent); }
.badge-error { background: rgba(239, 68, 68, 0.2); color: var(--error); }

.steps-container {
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-bottom: 3rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border: 2px solid var(--border);
  color: var(--text-dim);
  transition: all 0.3s ease;
}

.step.complete .step-icon {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.step.active .step-icon {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
}

/* Special mode: keep Planning active/spinning until the user accepts the plan */
.status-card[data-hold-planning='true'] .step.active .step-icon {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.45);
}

.step-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-dim);
  text-align: center;
}

.step.active .step-label,
.step.complete .step-label {
  color: var(--text);
}

.step-line {
  position: absolute;
  top: 20px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--border);
  z-index: -1;
}

.step.complete .step-line {
  background: var(--accent);
}

.actions {
  display: flex;
  justify-content: center;
}

.error-msg {
  text-align: center;
  color: var(--error);
  font-size: 0.875rem;
}

.spin {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
