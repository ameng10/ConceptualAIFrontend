import { ref } from 'vue'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export type Toast = {
  id: string
  title?: string
  message: string
  kind?: ToastKind
  createdAt: number
  /** Optional. If omitted, the toast persists until manually dismissed. */
  ttlMs?: number
}

const toasts = ref<Toast[]>([])

function genId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function useToasts() {
  const remove = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  const push = (t: Omit<Toast, 'id' | 'createdAt'>) => {
    const toast: Toast = {
      id: genId(),
      createdAt: Date.now(),
      message: t.message,
      title: t.title,
      kind: t.kind,
      ttlMs: t.ttlMs,
    }
    toasts.value = [...toasts.value, toast]

    if (typeof toast.ttlMs === 'number' && toast.ttlMs > 0) {
      window.setTimeout(() => remove(toast.id), toast.ttlMs)
    }
    return toast.id
  }

  return { toasts, push, remove }
}

// Convenience helpers
export function toastPlanReady() {
  return useToasts().push({
    title: 'Plan ready',
    message: 'Your plan is ready to review.',
    kind: 'success',
  })
}

export function toastPlanUpdated() {
  return useToasts().push({
    title: 'Plan updated',
    message: 'Your updated plan is ready.',
    kind: 'success',
  })
}

export function toastDesignReady() {
  return useToasts().push({
    title: 'Design ready',
    message: 'Your design is ready to review.',
    kind: 'success',
  })
}

export function toastDesignUpdated() {
  return useToasts().push({
    title: 'Design updated',
    message: 'Your updated design is ready.',
    kind: 'success',
  })
}
