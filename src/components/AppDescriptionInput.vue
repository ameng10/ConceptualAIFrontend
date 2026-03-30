<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowRight, Type, MessageSquare } from 'lucide-vue-next'
import PipelineAutocompleteToggle from '@/components/PipelineAutocompleteToggle.vue'

const props = withDefaults(
  defineProps<{
    initialName?: string
    initialDescription?: string
    initialEnableAutocomplete?: boolean
    showAutocompleteToggle?: boolean
    submitLabel?: string
  }>(),
  {
    showAutocompleteToggle: true,
    submitLabel: 'Generate Backend',
  },
)

const emit = defineEmits<{
  (
    e: 'submit',
    description: string,
    name: string,
    enableAutocomplete: boolean,
    done: (ok: boolean, errorMessage?: string) => void,
  ): void
}>()

const description = ref('')
const name = ref('')
const isSubmitting = ref(false)
const enableAutocomplete = ref(false)

type TypewriterOptions = {
  startDelayMs: number
  typeDelayMs: number
  deleteDelayMs: number
  pauseAfterTypedMs: number
  pauseAfterDeletedMs: number
}

const createPairedTypewriterPlaceholders = (
  leftPhrases: string[],
  rightPhrases: string[],
  options: TypewriterOptions,
) => {
  const leftText = ref('')
  const rightText = ref('')

  const pairCount = Math.min(leftPhrases.length, rightPhrases.length)
  let phraseIndex = 0
  let leftCharIndex = 0
  let rightCharIndex = 0
  let isDeleting = false
  let tickTimeout: number | null = null

  const clear = () => {
    if (tickTimeout !== null) {
      window.clearTimeout(tickTimeout)
      tickTimeout = null
    }
  }

  const schedule = (delayMs: number) => {
    clear()
    tickTimeout = window.setTimeout(tick, delayMs)
  }

  const tick = () => {
    if (pairCount <= 0) return
    const leftPhrase = leftPhrases[phraseIndex] ?? ''
    const rightPhrase = rightPhrases[phraseIndex] ?? ''

    if (!isDeleting) {
      if (leftCharIndex < leftPhrase.length) leftCharIndex += 1
      if (rightCharIndex < rightPhrase.length) rightCharIndex += 1

      leftText.value = leftPhrase.slice(0, leftCharIndex)
      rightText.value = rightPhrase.slice(0, rightCharIndex)

      const leftDone = leftCharIndex >= leftPhrase.length
      const rightDone = rightCharIndex >= rightPhrase.length
      if (leftDone && rightDone) {
        isDeleting = true
        schedule(options.pauseAfterTypedMs)
        return
      }

      schedule(options.typeDelayMs)
      return
    }

    // Deleting
    if (leftCharIndex > 0) leftCharIndex -= 1
    if (rightCharIndex > 0) rightCharIndex -= 1

    leftText.value = leftPhrase.slice(0, leftCharIndex)
    rightText.value = rightPhrase.slice(0, rightCharIndex)

    const leftEmpty = leftCharIndex <= 0
    const rightEmpty = rightCharIndex <= 0
    if (leftEmpty && rightEmpty) {
      isDeleting = false
      phraseIndex = (phraseIndex + 1) % pairCount
      schedule(options.pauseAfterDeletedMs)
      return
    }

    schedule(options.deleteDelayMs)
  }

  const start = () => {
    leftText.value = ''
    rightText.value = ''
    phraseIndex = 0
    leftCharIndex = 0
    rightCharIndex = 0
    isDeleting = false
    schedule(options.startDelayMs)
  }

  return {
    leftText,
    rightText,
    start,
    stop: clear,
  }
}

const namePlaceholderPhrases = [
  'Stuffed Animal Social',
  'Dental Office Scheduler',
  'Restaurant Reservations',
]

const requirementsPlaceholderPhrases = [
  'Build me a social media app for my stuffed animals...',
  'Build me an app for my dental office for scheduling patients...',
  'Create a website for my restaurant to manage reservations...',
]

const typewriterOptions: TypewriterOptions = {
  startDelayMs: 450,
  typeDelayMs: 30,
  deleteDelayMs: 14,
  pauseAfterTypedMs: 1600,
  pauseAfterDeletedMs: 300,
}

const pairedTypewriter = createPairedTypewriterPlaceholders(
  namePlaceholderPhrases,
  requirementsPlaceholderPhrases,
  typewriterOptions,
)

const namePlaceholder = computed(() => pairedTypewriter.leftText.value)
const requirementsPlaceholder = computed(() => pairedTypewriter.rightText.value)

onMounted(() => {
  if (props.initialName && !name.value) name.value = props.initialName
  if (props.initialDescription && !description.value) description.value = props.initialDescription
  enableAutocomplete.value = Boolean(props.initialEnableAutocomplete)
  pairedTypewriter.start()
})

onBeforeUnmount(() => {
  pairedTypewriter.stop()
})

const handleSubmit = () => {
  if (!description.value || !name.value) return
  isSubmitting.value = true
  emit('submit', description.value, name.value, enableAutocomplete.value, (ok, errorMessage) => {
    isSubmitting.value = false
    // If parent reports error, keep inputs intact so the user can retry.
    // (Error presentation is handled by the parent view.)
    void errorMessage
    void ok
  })
}
</script>

<template>
  <div class="stacked-input-container fade-in">
    <div class="input-card glass">
      <!-- Project Name Section -->
      <div class="input-group">
        <label class="group-label">
          <Type :size="14" /> Project Name
        </label>
        <input
          v-model="name"
          type="text"
          class="ghost-input"
          :placeholder="namePlaceholder"
          :disabled="isSubmitting"
        />
      </div>

      <div class="divider"></div>

      <!-- Description Section -->
      <div class="input-group">
        <label class="group-label">
          <MessageSquare :size="14" /> Requirements
        </label>
        <textarea
          v-model="description"
          class="ghost-textarea"
          :placeholder="requirementsPlaceholder"
          :disabled="isSubmitting"
          @keydown.enter.prevent.exact="handleSubmit"
        ></textarea>
      </div>

      <div class="input-footer">
        <div class="footer-left">
          <p class="hint">Shift + Enter for new line</p>
          <PipelineAutocompleteToggle
            v-if="props.showAutocompleteToggle"
            v-model="enableAutocomplete"
            compact
            :disabled="isSubmitting"
            label="Autocomplete the rest of the pipeline"
            hint="Automatically continue from planning into later stages."
          />
        </div>
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="!description || !name || isSubmitting"
        >
          <span v-if="!isSubmitting">{{ props.submitLabel }}</span>
          <ArrowRight v-if="!isSubmitting" :size="18" />
          <div v-else class="mini-loader"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stacked-input-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.input-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Gradient border ring (no interior tint) */
.input-card::before {
  content: '';
  position: absolute;
  /* Slightly overlap outside edge to avoid antialiasing “white halo” */
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #3b82f6 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: 1;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.group-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--neon-teal);
  text-shadow: 0 0 10px rgba(45, 212, 191, 0.2);
}

.divider {
  width: 100%;
  height: 1px;
  background: var(--border);
  margin: 1.5rem 0;
}

.ghost-input {
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  color: var(--text);
  font-family: inherit;
  font-size: 1.25rem;
  font-weight: 700;
}

.ghost-textarea {
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  color: var(--text);
  font-family: inherit;
  font-size: 1.0625rem;
  min-height: 100px;
  resize: none;
  line-height: 1.6;
}

.ghost-input:focus, .ghost-textarea:focus {
  outline: none;
}

.ghost-input::placeholder, .ghost-textarea::placeholder {
  color: var(--text-dim);
  opacity: 0.3;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 2rem;
  gap: 1rem;
}

.footer-left {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-dim);
  opacity: 0.6;
}

.btn-primary {
  padding: 0.875rem 2rem;
  font-size: 1rem;
  letter-spacing: -0.01em;
  box-shadow: 0 0 30px rgba(34, 197, 94, 0.15);
}

.mini-loader {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .input-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
