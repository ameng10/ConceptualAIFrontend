import { onUnmounted, ref } from 'vue'

type PollTask = () => Promise<void> | void

export function usePolling(task: PollTask, intervalMs = 30_000) {
  const timer = ref<ReturnType<typeof setInterval> | null>(null)
  const isRunning = ref(false)
  let inFlight = false

  const runOnce = async () => {
    if (inFlight) return
    inFlight = true
    try {
      await task()
    } finally {
      inFlight = false
    }
  }

  const stop = () => {
    if (!timer.value) return
    clearInterval(timer.value)
    timer.value = null
    isRunning.value = false
  }

  const start = (opts?: { immediate?: boolean }) => {
    stop()
    if (opts?.immediate) {
      void runOnce()
    }
    timer.value = setInterval(() => {
      void runOnce()
    }, intervalMs)
    isRunning.value = true
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isRunning,
    runOnce,
    start,
    stop,
  }
}
