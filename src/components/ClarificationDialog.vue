<script setup lang="ts">
import { ref, watch } from 'vue'
import { HelpCircle, CheckCircle2 } from 'lucide-vue-next'
import PipelineAutocompleteToggle from '@/components/PipelineAutocompleteToggle.vue'

const props = defineProps<{
  questions: string[]
  show: boolean
  enableAutocomplete?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', answers: Record<string, string>, enableAutocomplete: boolean): void
}>()

const answers = ref<Record<string, string>>({})
const submitting = ref(false)
const enableAutocomplete = ref(false)

watch(() => props.questions, (newQuestions) => {
  newQuestions.forEach(q => {
    if (!(q in answers.value)) {
      answers.value[q] = ''
    }
  })
}, { immediate: true })

const handleSubmit = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    // Fire-and-forget: keep the button in a loading state while the parent
    // handles clarification + waiting for the plan, then closes the dialog.
    emit('submit', answers.value, enableAutocomplete.value)
  } finally {
    // Intentionally do not reset `submitting` here.
    // The dialog will be hidden by the parent once planning continues,
    // keeping the UI in a waiting state in the meantime.
  }
}

watch(
  () => props.show,
  (isOpen) => {
    if (!isOpen) submitting.value = false
    if (isOpen) enableAutocomplete.value = Boolean(props.enableAutocomplete)
  }
)
</script>

<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal glass fade-in">
      <div class="modal-header">
        <HelpCircle :size="24" class="icon" />
        <div class="header-text">
          <h3>Almost there!</h3>
          <p>We need a bit more detail to generate the best plan.</p>
        </div>
      </div>

      <div class="questions-list">
        <div v-for="(question, index) in questions" :key="index" class="question-field">
          <label :for="'q-' + index">{{ question }}</label>
          <input
            v-model="answers[question]"
            :id="'q-' + index"
            type="text"
            class="input"
            placeholder="Your answer..."
          />
        </div>
      </div>

      <div class="modal-footer">
        <PipelineAutocompleteToggle
          v-model="enableAutocomplete"
          compact
          :disabled="submitting"
          label="Autocomplete"
        />
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="submitting || questions.some(q => !answers[q])"
        >
          <span v-if="submitting" class="spinner" aria-hidden="true"></span>
          <CheckCircle2 v-else :size="18" />
          <span>{{ submitting ? 'Submitting…' : 'Continue Planning' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  max-width: 600px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
}

.modal-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.icon {
  color: var(--primary);
  margin-top: 0.25rem;
}

.header-text h3 {
  margin-bottom: 0.25rem;
}

.header-text p {
  color: var(--text-dim);
  font-size: 0.875rem;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-right: 0.25rem;
}

.question-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 500;
  font-size: 0.9375rem;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  flex: 0 0 auto;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: rgba(255, 255, 255, 0.95);
  display: inline-block;
  animation: spin 0.75s linear infinite;
}

.btn-primary:disabled {
  opacity: 0.6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .modal-overlay {
    padding: 0.75rem;
  }

  .modal {
    padding: 1.25rem;
    max-height: calc(100vh - 1.5rem);
  }

  .modal-footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
