<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronDown,
  ChevronRight,
  Clipboard,
  ClipboardCheck,
  Library,
  ScrollText,
  Wrench,
} from 'lucide-vue-next'
import PlanViewer, { type PlanShape } from '@/components/PlanViewer.vue'

type LibraryPull = {
  libraryName?: string
  instanceName?: string
  bindings?: Record<string, string>
}

type CustomConcept = {
  name?: string
  spec?: string
}

export type DesignShape = {
  plan?: PlanShape
  libraryPulls?: LibraryPull[]
  customConcepts?: CustomConcept[]
  [k: string]: any
}

const props = defineProps<{
  design: DesignShape
}>()

const showRaw = ref(false)
const copied = ref(false)

const normalized = computed(() => {
  const design = props.design || ({} as DesignShape)
  return {
  plan: (design as any)?.plan,
    libraryPulls: Array.isArray(design.libraryPulls) ? design.libraryPulls : [],
    customConcepts: Array.isArray(design.customConcepts) ? design.customConcepts : [],
  }
})

const formatBindings = (bindings?: Record<string, string>) => {
  if (!bindings) return []
  return Object.entries(bindings)
    .map(([k, v]) => `${k} → ${v}`)
    .sort((a, b) => a.localeCompare(b))
}

const tryCopy = async () => {
  copied.value = false
  try {
    await navigator.clipboard.writeText(JSON.stringify(props.design, null, 2))
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1200)
  } catch {
    // ignore
  }
}
</script>

<template>
  <div class="design-viewer">
    <div class="top">
      <div class="top-left">
        <Wrench :size="18" class="top-icon" />
  <h3 class="title">Design output</h3>
      </div>

      <div class="top-actions">
        <button class="btn-chip" type="button" @click="tryCopy" :title="copied ? 'Copied' : 'Copy JSON'">
          <ClipboardCheck v-if="copied" :size="16" />
          <Clipboard v-else :size="16" />
          <span>{{ copied ? 'Copied' : 'Copy JSON' }}</span>
        </button>

        <button class="btn-chip" type="button" @click="showRaw = !showRaw">
          <ChevronDown v-if="showRaw" :size="16" />
          <ChevronRight v-else :size="16" />
          <span>{{ showRaw ? 'Hide raw' : 'Show raw' }}</span>
        </button>
      </div>
    </div>

    <div class="stack">
      <details v-if="normalized.plan" class="section" open>
        <summary class="section-summary">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <div class="section-title-row">
            <ScrollText :size="16" />
            <h4>Plan</h4>
          </div>
        </summary>
        <div class="section-body">
          <PlanViewer :plan="normalized.plan" />
        </div>
      </details>

      <details class="section" open>
        <summary class="section-summary">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <div class="section-title-row">
            <Library :size="16" />
            <h4>Docs pulls</h4>
            <span class="pill">{{ normalized.libraryPulls.length }}</span>
          </div>
        </summary>

        <div class="section-body">
          <div v-if="!normalized.libraryPulls.length" class="empty">No docs pulls found.</div>

          <ul v-else class="pull-list">
            <li v-for="(pull, idx) in normalized.libraryPulls" :key="idx" class="pull-row">
              <div class="pull-main">
                <span class="pull-name monospace">{{ pull.libraryName || pull.instanceName || 'DocsPull' }}</span>
                <span
                  v-if="pull.libraryName && pull.instanceName && pull.libraryName !== pull.instanceName"
                  class="pull-sub"
                >
                  instance {{ pull.instanceName }}
                </span>
              </div>

              <div v-if="pull.bindings" class="pull-bindings">
                <div class="bindings-title">Bindings</div>
                <div v-if="!Object.keys(pull.bindings).length" class="empty">No bindings.</div>
                <ul v-else class="bullets">
                  <li v-for="(b, bIdx) in formatBindings(pull.bindings)" :key="bIdx">{{ b }}</li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </details>

      <details class="section" open>
        <summary class="section-summary">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <div class="section-title-row">
            <ScrollText :size="16" />
            <h4>Custom concepts</h4>
            <span class="pill">{{ normalized.customConcepts.length }}</span>
          </div>
        </summary>

        <div class="section-body">
          <div v-if="!normalized.customConcepts.length" class="empty">No custom concepts found.</div>

          <details v-for="(cc, idx) in normalized.customConcepts" :key="idx" class="item">
            <summary class="item-summary">
              <span class="twisty">
                <ChevronRight class="chev chev-right" :size="16" />
                <ChevronDown class="chev chev-down" :size="16" />
              </span>
              <span class="item-title">{{ cc.name || 'CustomConcept' }}</span>
            </summary>

            <div class="item-body">
              <div v-if="cc.spec" class="spec">
                <pre class="spec-pre">{{ cc.spec }}</pre>
              </div>
              <div v-else class="empty">No spec provided.</div>
            </div>
          </details>
        </div>
      </details>
    </div>

    <div v-if="showRaw" class="raw">
      <pre>{{ JSON.stringify(design, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.design-viewer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: transparent;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title {
  font-size: 1rem;
  margin: 0;
}

.top-icon {
  color: var(--primary);
}

.top-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.45rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 0.8125rem;
}

.btn-chip:hover {
  background: rgba(255, 255, 255, 0.06);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pull-list {
  margin: 0;
  padding-left: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.pull-row {
  border: 1px solid var(--border);
  outline: 1px solid var(--border);
  outline-offset: -1px;
  border-radius: 14px;
  padding: 0.75rem;
  background: transparent;
  list-style: disc;
}

.pull-main {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.pull-name {
  font-weight: 700;
  color: var(--text);
}

.pull-sub {
  color: var(--text-dim);
  font-size: 0.85rem;
}

.pull-bindings {
  margin-top: 0.6rem;
}

.section {
  border: 1px solid var(--border);
  outline: 1px solid var(--border);
  outline-offset: -1px;
  border-radius: 16px;
  overflow: hidden;
  background: transparent;
}

.section-summary {
  list-style: none;
  cursor: pointer;
  user-select: none;
  padding: 0.9rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: transparent;
}

.section-summary::-webkit-details-marker {
  display: none;
}

details,
summary {
  background: transparent;
}

.section-title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title-row h4 {
  font-size: 0.95rem;
}

.pill {
  margin-left: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-dim);
  border: 1px solid var(--border);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.section-body {
  padding: 0 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: transparent;
}

.item {
  border: 1px solid var(--border);
  outline: 1px solid var(--border);
  outline-offset: -1px;
  border-radius: 14px;
  overflow: hidden;
  background: transparent;
}

.item-summary {
  list-style: none;
  cursor: pointer;
  user-select: none;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
}

.item-summary::-webkit-details-marker {
  display: none;
}

.twisty {
  position: relative;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.chev {
  position: absolute;
  top: 1px;
  left: 1px;
  color: var(--text);
  opacity: 0.85;
}

/* Scope to the current details -> summary -> twisty so nested details don't interfere */
details[open] > summary .twisty .chev-right {
  display: none;
}

details:not([open]) > summary .twisty .chev-down {
  display: none;
}

.item-title {
  font-weight: 700;
  font-size: 0.9rem;
}

.item-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.sub {
  color: var(--text-dim);
  font-size: 0.8rem;
}

.item-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: transparent;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.meta-k {
  color: var(--text-dim);
  font-size: 0.8rem;
}

.meta-v {
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 700;
}

.monospace {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}


.bindings-title {
  font-weight: 700;
  font-size: 0.85rem;
}

.bullets {
  margin-left: 1.15rem;
  color: var(--text);
}

.bullets li {
  padding: 0.15rem 0;
}

.spec {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.spec-pre {
  margin: 0;
  padding: 0.75rem;
  max-height: 320px;
  overflow: auto;
  font-size: 0.82rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.empty {
  color: var(--text-dim);
  font-size: 0.875rem;
}

.raw pre {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.75rem;
  max-height: 420px;
  overflow: auto;
  font-size: 0.82rem;
  line-height: 1.4;
}
</style>
