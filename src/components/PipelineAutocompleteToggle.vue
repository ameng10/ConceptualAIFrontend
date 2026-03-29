<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    hint?: string
    disabled?: boolean
    compact?: boolean
  }>(),
  {
    label: 'Autocomplete remaining pipeline stages',
    disabled: false,
    compact: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const handleChange = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <label class="autocomplete-toggle" :class="{ compact: props.compact, disabled: props.disabled }">
    <input
      class="checkbox"
      type="checkbox"
      :checked="props.modelValue"
      :disabled="props.disabled"
      @change="handleChange"
    />
    <span class="copy">
      <span class="label">{{ props.label }}</span>
      <span v-if="props.hint" class="hint">{{ props.hint }}</span>
    </span>
  </label>
</template>

<style scoped>
.autocomplete-toggle {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.7rem;
  cursor: pointer;
  user-select: none;
}

.autocomplete-toggle.compact {
  gap: 0.55rem;
  align-items: center;
}

.autocomplete-toggle.disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.checkbox {
  margin-top: 0.18rem;
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
  flex: 0 0 auto;
}

.copy {
  display: inline-flex;
  flex-direction: column;
  gap: 0.15rem;
}

.label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}

.hint {
  font-size: 0.76rem;
  color: var(--text-dim);
  line-height: 1.25;
  max-width: 44ch;
}

.autocomplete-toggle.compact .label {
  font-size: 0.9rem;
  line-height: 1;
}

.autocomplete-toggle.compact .checkbox {
  margin-top: 0;
  width: 18px;
  height: 18px;
}

.autocomplete-toggle.compact .copy {
  gap: 0;
}

.autocomplete-toggle.compact .hint {
  font-size: 0.74rem;
}
</style>
