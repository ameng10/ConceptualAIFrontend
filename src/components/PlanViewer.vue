<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronDown,
  ChevronRight,
  Clipboard,
  ClipboardCheck,
  Database,
  FileText,
  ListChecks,
  Route,
  ScrollText,
} from 'lucide-vue-next'

type PlanEntity = Record<
  string,
  {
    description?: string
    properties?: string[]
  }
>

type PlanSection<T> = Array<T>

export type PlanShape = {
  summary?: string
  entities?: PlanSection<PlanEntity>
  user_flows?: PlanSection<Record<string, { description?: string; steps?: string[] }>>
  pages?: PlanSection<Record<string, { description?: string; elements?: string[] }>>
  technical_requirements?: string[]
  [k: string]: any
}

const props = defineProps<{
  plan: PlanShape
}>()

const showRaw = ref(false)
const copied = ref(false)

const normalized = computed(() => {
  const plan = props.plan || ({} as PlanShape)
  return {
    summary: plan.summary,
    entities: Array.isArray(plan.entities) ? plan.entities : [],
    userFlows: Array.isArray(plan.user_flows) ? plan.user_flows : [],
    pages: Array.isArray(plan.pages) ? plan.pages : [],
    technical: Array.isArray(plan.technical_requirements) ? plan.technical_requirements : [],
  }
})

const tryCopy = async () => {
  copied.value = false
  try {
    await navigator.clipboard.writeText(JSON.stringify(props.plan, null, 2))
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1200)
  } catch {
    // ignore (clipboard permissions)
  }
}
</script>

<template>
  <div class="plan-viewer">
    <div class="plan-top">
      <div class="plan-top-left">
        <ScrollText :size="18" class="plan-top-icon" />
        <h3 class="plan-title">Plan</h3>
      </div>

      <div class="plan-top-actions">
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
      <details v-if="normalized.summary" class="section" open>
        <summary class="section-summary">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <div class="section-title-row">
            <FileText :size="16" />
            <h4>Summary</h4>
          </div>
        </summary>
        <div class="section-body">
          <p class="summary-text">{{ normalized.summary }}</p>
        </div>
      </details>

      <details class="section" open>
        <summary class="section-summary">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <div class="section-title-row">
            <Database :size="16" />
            <h4>Entities</h4>
            <span class="pill">{{ normalized.entities.length }}</span>
          </div>
        </summary>

        <div class="section-body">
          <div v-if="!normalized.entities.length" class="empty">No entities found.</div>

          <details v-for="(entityWrapper, idx) in normalized.entities" :key="idx" class="item" open>
            <summary class="item-summary">
              <span class="twisty">
                <ChevronRight class="chev chev-right" :size="16" />
                <ChevronDown class="chev chev-down" :size="16" />
              </span>
              <span class="item-title">{{ Object.keys(entityWrapper)[0] || 'Entity' }}</span>
            </summary>

            <div class="item-body">
              <p v-if="(Object.values(entityWrapper)[0] as any)?.description" class="item-desc">
                {{ (Object.values(entityWrapper)[0] as any).description }}
              </p>

              <ul v-if="Array.isArray((Object.values(entityWrapper)[0] as any)?.properties)" class="bullets">
                <li v-for="(p, pIdx) in (Object.values(entityWrapper)[0] as any).properties" :key="pIdx">{{ p }}</li>
              </ul>
            </div>
          </details>
        </div>
      </details>

      <details class="section" open>
        <summary class="section-summary">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <div class="section-title-row">
            <Route :size="16" />
            <h4>User flows</h4>
            <span class="pill">{{ normalized.userFlows.length }}</span>
          </div>
        </summary>

        <div class="section-body">
          <div v-if="!normalized.userFlows.length" class="empty">No user flows found.</div>

          <details v-for="(flowWrapper, idx) in normalized.userFlows" :key="idx" class="item" open>
            <summary class="item-summary">
              <span class="twisty">
                <ChevronRight class="chev chev-right" :size="16" />
                <ChevronDown class="chev chev-down" :size="16" />
              </span>
              <span class="item-title">{{ Object.keys(flowWrapper)[0] || 'Flow' }}</span>
            </summary>

            <div class="item-body">
              <p v-if="(Object.values(flowWrapper)[0] as any)?.description" class="item-desc">
                {{ (Object.values(flowWrapper)[0] as any).description }}
              </p>
              <ol v-if="Array.isArray((Object.values(flowWrapper)[0] as any)?.steps)" class="steps">
                <li v-for="(s, sIdx) in (Object.values(flowWrapper)[0] as any).steps" :key="sIdx">{{ s }}</li>
              </ol>
            </div>
          </details>
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
            <h4>Pages</h4>
            <span class="pill">{{ normalized.pages.length }}</span>
          </div>
        </summary>

        <div class="section-body">
          <div v-if="!normalized.pages.length" class="empty">No pages found.</div>

          <details v-for="(pageWrapper, idx) in normalized.pages" :key="idx" class="item" open>
            <summary class="item-summary">
              <span class="twisty">
                <ChevronRight class="chev chev-right" :size="16" />
                <ChevronDown class="chev chev-down" :size="16" />
              </span>
              <span class="item-title">{{ Object.keys(pageWrapper)[0] || 'Page' }}</span>
            </summary>

            <div class="item-body">
              <p v-if="(Object.values(pageWrapper)[0] as any)?.description" class="item-desc">
                {{ (Object.values(pageWrapper)[0] as any).description }}
              </p>
              <ul v-if="Array.isArray((Object.values(pageWrapper)[0] as any)?.elements)" class="bullets">
                <li v-for="(e, eIdx) in (Object.values(pageWrapper)[0] as any).elements" :key="eIdx">{{ e }}</li>
              </ul>
            </div>
          </details>
        </div>
      </details>

      <details class="section" open>
        <summary class="section-summary">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <div class="section-title-row">
            <ListChecks :size="16" />
            <h4>Technical requirements</h4>
            <span class="pill">{{ normalized.technical.length }}</span>
          </div>
        </summary>

        <div class="section-body">
          <div v-if="!normalized.technical.length" class="empty">No requirements found.</div>

          <ul v-else class="bullets">
            <li v-for="(r, idx) in normalized.technical" :key="idx">{{ r }}</li>
          </ul>
        </div>
      </details>
    </div>

    <div v-if="showRaw" class="raw glass-inner">
      <pre>{{ JSON.stringify(plan, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.plan-viewer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: transparent;
}

.plan-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.plan-top-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.plan-title {
  font-size: 1rem;
  margin: 0;
}

.plan-top-icon {
  color: var(--primary);
}

.plan-top-actions {
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
  border: 1px solid var(--glass-border);
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

.summary-text {
  color: var(--text);
  margin-top: 0.5rem;
}

.section-header {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text);
}

.section-header h4 {
  font-size: 0.95rem;
}

.pill {
  margin-left: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-dim);
  border: 1px solid var(--glass-border);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
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

/* Some browsers apply default styling to details/summary; ensure it's transparent. */
details,
summary {
  background: transparent;
}

.section-summary::-webkit-details-marker {
  display: none;
}

.section-title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.section-body {
  padding: 0 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: transparent;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
  /* Remove the gray header background */
  background: transparent;
}

/* Hide default details marker */
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

.item-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: transparent;
}

.item-desc {
  color: var(--text-dim);
  font-size: 0.875rem;
}

.bullets,
.steps {
  margin-left: 1.15rem;
  color: var(--text);
}

.bullets li,
.steps li {
  padding: 0.15rem 0;
}

.empty {
  color: var(--text-dim);
  font-size: 0.875rem;
}

.raw pre {
  max-height: 420px;
  overflow: auto;
  font-size: 0.82rem;
  line-height: 1.4;
}

@media (max-width: 860px) {
  /* Already stacked, nothing to change */
}
</style>
