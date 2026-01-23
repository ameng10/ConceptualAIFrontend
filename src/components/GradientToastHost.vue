<script setup lang="ts">
import { computed } from 'vue'
import { X, CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-vue-next'
import { useToasts, type Toast, type ToastKind } from '@/services/toast'

const { toasts, remove } = useToasts()

const iconFor = (kind?: ToastKind) => {
  switch (kind) {
    case 'success':
      return CheckCircle2
    case 'warning':
      return AlertTriangle
    case 'error':
      return AlertCircle
    default:
      return Info
  }
}

const sorted = computed(() => [...toasts.value].sort((a, b) => a.createdAt - b.createdAt))

const ariaLabel = (t: Toast) => `${t.title ? `${t.title}: ` : ''}${t.message}`
</script>

<template>
  <div class="toast-host" aria-live="polite" aria-relevant="additions">
    <transition-group name="toast" tag="div" class="toast-stack">
      <div v-for="t in sorted" :key="t.id" class="toast" role="status" :aria-label="ariaLabel(t)">
        <div class="toast-gradient" />
        <div class="toast-inner">
          <component :is="iconFor(t.kind)" :size="18" class="toast-icon" />
          <div class="toast-text">
            <div v-if="t.title" class="toast-title">{{ t.title }}</div>
            <div class="toast-message">{{ t.message }}</div>
          </div>
          <button class="toast-close" type="button" @click="remove(t.id)" title="Dismiss">
            <X :size="16" />
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  width: min(560px, calc(100vw - 2rem));
  pointer-events: none;
}

.toast-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toast {
  pointer-events: auto;
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.toast-gradient {
  position: absolute;
  inset: 0;
  background: var(--grad-wave);
  opacity: 0.35;
  filter: saturate(1.1);
}

.toast-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 0.95rem;
  background: rgba(2, 6, 23, 0.55);
}

:root[data-theme='light'] .toast-inner,
[data-theme='light'] .toast-inner {
  background: rgba(255, 255, 255, 0.65);
}

.toast-icon {
  color: var(--primary);
  flex: 0 0 auto;
}

.toast-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.toast-title {
  font-weight: 800;
  font-size: 0.9rem;
  line-height: 1.1;
}

.toast-message {
  font-size: 0.85rem;
  color: var(--text-dim);
  line-height: 1.2;
}

.toast-close {
  pointer-events: auto;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
  border-radius: 10px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 0 0 auto;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.14);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: transform 180ms ease, opacity 180ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
