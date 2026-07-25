<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    show: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    danger: false,
  }
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal glass fade-in">
      <div class="modal-header">
        <AlertTriangle :size="24" class="icon" :class="{ danger }" />
        <div class="header-text">
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button class="btn btn-primary" :class="{ 'btn-danger': danger }" @click="emit('confirm')">
          {{ confirmLabel }}
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
  max-width: 440px;
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
  flex: 0 0 auto;
}

.icon.danger {
  color: #f87171;
}

.header-text h3 {
  margin-bottom: 0.25rem;
}

.header-text p {
  color: var(--text-dim);
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
}

.btn-danger {
  background: #dc2626;
  border-color: #dc2626;
}

.btn-danger:hover {
  background: #b91c1c;
}

@media (max-width: 520px) {
  .modal {
    padding: 1.25rem;
  }

  .modal-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
</style>
