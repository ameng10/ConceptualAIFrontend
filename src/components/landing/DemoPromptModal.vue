<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ExternalLink, X, CreditCard } from 'lucide-vue-next'
import type { DemoCardData } from './demos'

const props = defineProps<{
  demo: DemoCardData
  variantKey?: 'v1' | 'v2'
}>()

const emit = defineEmits<{ close: [] }>()

const closeBtn = ref<HTMLButtonElement | null>(null)
let restoreFocusTo: HTMLElement | null = null

const activeVariant = computed(() =>
  props.demo.variants?.find((v) => v.key === (props.variantKey ?? 'v1')),
)

const liveUrl = computed(() => activeVariant.value?.liveUrl ?? props.demo.liveUrl)
const badges = computed(() => activeVariant.value?.badges ?? props.demo.badges)

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  restoreFocusTo = document.activeElement as HTMLElement | null
  document.addEventListener('keydown', onKeydown)
  closeBtn.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  restoreFocusTo?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div class="prompt-overlay" @click.self="emit('close')">
      <div class="prompt-modal glass" role="dialog" aria-modal="true" :aria-label="`The prompt that built ${demo.name}`">
        <div class="prompt-modal-head">
          <div>
            <div class="prompt-kicker">This exact prompt — nothing else — built this app.</div>
            <h3 class="prompt-title">{{ demo.name }}</h3>
          </div>
          <button ref="closeBtn" type="button" class="prompt-close" aria-label="Close" @click="emit('close')">
            <X :size="18" />
          </button>
        </div>

        <div class="prompt-body">
          <pre class="prompt-pre"><code>{{ demo.prompt }}</code></pre>

          <div v-if="demo.iterationPrompt && variantKey === 'v2'" class="iteration-block">
            <div class="iteration-label">Then one iteration prompt added AI moderation:</div>
            <pre class="prompt-pre iteration-pre"><code>{{ demo.iterationPrompt }}</code></pre>
          </div>

          <div v-if="demo.tryList.length" class="try-block">
            <div class="try-label">Try this</div>
            <ul class="try-list">
              <li v-for="item in demo.tryList" :key="item">{{ item }}</li>
            </ul>
          </div>

          <div class="prompt-badges">
            <span v-for="badge in badges" :key="badge" class="prompt-badge">
              {{ badge }}
            </span>
          </div>
        </div>

        <div class="prompt-foot">
          <div v-if="demo.testCard" class="test-card-chip">
            <CreditCard :size="14" />
            <span>Test mode — card 4242 4242 4242 4242</span>
          </div>
          <div class="prompt-foot-actions">
            <a
              v-if="liveUrl"
              :href="liveUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary live-btn"
            >
              Open live app
              <ExternalLink :size="15" />
            </a>
            <span v-else class="launching-chip">Launching soon</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.prompt-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.prompt-modal {
  width: min(720px, 100%);
  max-height: min(85vh, 900px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.prompt-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--glass-border);
}

.prompt-kicker {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--neon-teal);
}

.prompt-title {
  margin-top: 0.35rem;
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.prompt-close {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-dim);
  cursor: pointer;
  transition: var(--transition);
}

.prompt-close:hover {
  color: var(--text);
  background: var(--input-bg);
}

.prompt-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
}

.prompt-pre {
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(2, 6, 23, 0.55);
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 40vh;
  overflow-y: auto;
}

[data-theme='light'] .prompt-pre {
  background: #0f172a;
  border-color: rgba(15, 23, 42, 0.2);
}

.iteration-block {
  margin-top: 1rem;
}

.iteration-label {
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--await);
}

.iteration-pre {
  max-height: 22vh;
}

.try-block {
  margin-top: 1.25rem;
}

.try-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.try-list {
  margin-top: 0.5rem;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.4rem;
  color: var(--text-dim);
  font-size: 0.9rem;
  line-height: 1.5;
}

.prompt-badges {
  margin-top: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.prompt-badge {
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-dim);
  font-size: 0.72rem;
  font-weight: 700;
}

.prompt-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.5rem 1.25rem;
  border-top: 1px solid var(--glass-border);
}

.test-card-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: 700;
}

.prompt-foot-actions {
  margin-left: auto;
}

.live-btn {
  border-radius: 12px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  text-decoration: none;
}

.launching-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  border: 1px dashed var(--glass-border);
  color: var(--text-dim);
  font-size: 0.85rem;
  font-weight: 700;
}
</style>
