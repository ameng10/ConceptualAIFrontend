<script setup lang="ts">
import { ref, watch } from 'vue'
import { HelpCircle, CheckCircle2 } from 'lucide-vue-next'

const props = defineProps<{
  questions: string[]
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', answers: Record<string, string>): void
}>()

const answers = ref<Record<string, string>>({})

watch(() => props.questions, (newQuestions) => {
  newQuestions.forEach(q => {
    if (!(q in answers.value)) {
      answers.value[q] = ''
    }
  })
}, { immediate: true })

const handleSubmit = () => {
  emit('submit', answers.value)
}
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
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="questions.some(q => !answers[q])"
        >
          <CheckCircle2 :size="18" />
          Continue Planning
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
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
