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
  properties?: string[] | Record<string, string>
  }
>

type PlanSection<T> = Array<T>

export type PlanShape = {
  summary?: string
  entities?: PlanSection<PlanEntity>
  // Support both shapes:
  // 1) [{ "Flow name": { steps: [...] } }]
  // 2) [{ flow_name: "...", steps: [...] }]
  user_flows?: PlanSection<any>
  // Support both shapes:
  // 1) [{ "Page name": { description, elements } }]
  // 2) [{ page_name: "...", description, elements }]
  pages?: PlanSection<any>
  technical_requirements?: string[]
  [k: string]: any
}

const getSingleKey = (obj: unknown) => {
  if (!obj || typeof obj !== 'object') return null
  const keys = Object.keys(obj as Record<string, unknown>)
  if (keys.length !== 1) return null
  return keys[0]
}

const getEntityName = (entityWrapper: unknown) => {
  const k = getSingleKey(entityWrapper)
  return k || 'Entity'
}

const getEntityDetails = (entityWrapper: unknown) => {
  if (!entityWrapper || typeof entityWrapper !== 'object') return null
  const key = getSingleKey(entityWrapper)
  if (!key) return null
  return (entityWrapper as any)[key] as any
}

const coerceDescriptionObject = (value: unknown) => {
  if (typeof value === 'string') {
    return { description: value }
  }
  return value
}

const stringToSteps = (value: string) => {
  const normalized = value.replace(/\s*→\s*/g, '->')
  if (!normalized.includes('->')) return null
  const steps = normalized
    .split('->')
    .map((s) => s.trim())
    .filter(Boolean)
  return steps.length ? steps : null
}

const getFlowName = (flowWrapper: unknown) => {
  if (flowWrapper && typeof flowWrapper === 'object' && typeof (flowWrapper as any).name === 'string') {
    return (flowWrapper as any).name as string
  }
  if (flowWrapper && typeof flowWrapper === 'object' && typeof (flowWrapper as any).title === 'string') {
    return (flowWrapper as any).title as string
  }
  if (flowWrapper && typeof flowWrapper === 'object' && typeof (flowWrapper as any).flow === 'string') {
    return (flowWrapper as any).flow as string
  }
  if (flowWrapper && typeof flowWrapper === 'object' && typeof (flowWrapper as any).flow_name === 'string') {
    return (flowWrapper as any).flow_name as string
  }
  const k = getSingleKey(flowWrapper)
  return k || 'Flow'
}

const getFlowDetails = (flowWrapper: unknown) => {
  // If the flow is already in structured form, return it directly.
  if (flowWrapper && typeof flowWrapper === 'object' && !Array.isArray(flowWrapper)) {
    const obj = flowWrapper as any
    if (
      typeof obj.name === 'string' ||
      typeof obj.title === 'string' ||
      typeof obj.flow_name === 'string' ||
      typeof obj.description === 'string' ||
      Array.isArray(obj.steps) ||
      Array.isArray(obj.actions)
    ) {
      // Some plans use `actions: string[]` instead of `steps: string[]`.
      if (!Array.isArray(obj.steps) && Array.isArray(obj.actions)) {
        return { ...obj, steps: obj.actions }
      }
      // Some plans use `actions` as a string with arrow separators.
      if (!Array.isArray(obj.steps) && typeof obj.actions === 'string') {
        const steps = stringToSteps(obj.actions)
        return steps ? { ...obj, steps, description: obj.description ?? obj.actions } : { ...obj, description: obj.description ?? obj.actions }
      }
      return obj
    }
  }
  const key = getSingleKey(flowWrapper)
  if (!key) return null
  const raw = (flowWrapper as any)[key] as any
  if (typeof raw === 'string') {
    const steps = stringToSteps(raw)
    return steps ? { description: raw, steps } : { description: raw }
  }
  // Wrapper may contain { actions: [...] } instead of { steps: [...] }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && !Array.isArray((raw as any).steps) && Array.isArray((raw as any).actions)) {
    return { ...(raw as any), steps: (raw as any).actions }
  }
  return raw
}

const getPageName = (pageWrapper: unknown) => {
  if (pageWrapper && typeof pageWrapper === 'object' && typeof (pageWrapper as any).name === 'string') {
    return (pageWrapper as any).name as string
  }
  if (pageWrapper && typeof pageWrapper === 'object' && typeof (pageWrapper as any).title === 'string') {
    return (pageWrapper as any).title as string
  }
  if (pageWrapper && typeof pageWrapper === 'object' && typeof (pageWrapper as any).page === 'string') {
    return (pageWrapper as any).page as string
  }
  if (pageWrapper && typeof pageWrapper === 'object' && typeof (pageWrapper as any).page_name === 'string') {
    return (pageWrapper as any).page_name as string
  }
  const k = getSingleKey(pageWrapper)
  return k || 'Page'
}

const getPageDetails = (pageWrapper: unknown) => {
  // If the page is already in structured form, return it directly.
  if (pageWrapper && typeof pageWrapper === 'object' && !Array.isArray(pageWrapper)) {
    const obj = pageWrapper as any
    if (
      typeof obj.name === 'string' ||
      typeof obj.title === 'string' ||
      typeof obj.page === 'string' ||
      typeof obj.page_name === 'string' ||
      typeof obj.description === 'string' ||
      Array.isArray(obj.elements) ||
      Array.isArray(obj.queries)
    ) {
      return obj
    }
  }
  const key = getSingleKey(pageWrapper)
  if (!key) return null
  return coerceDescriptionObject((pageWrapper as any)[key] as any)
}

const entityPropertiesToLines = (properties: unknown) => {
  if (Array.isArray(properties)) {
    return properties
      .map((p) => {
        if (p && typeof p === 'object') {
          const obj = p as Record<string, unknown>
          const name = typeof obj.name === 'string' ? obj.name : null
          const type = typeof obj.type === 'string' ? obj.type : null
          const desc = typeof obj.description === 'string' ? obj.description : null

          if (name || type || desc) {
            const head = name && type ? `${name}: ${type}` : name ? name : type ? type : ''
            return desc ? (head ? `${head} — ${desc}` : desc) : head
          }
        }
        return String(p)
      })
      .filter((s) => String(s).trim().length)
  }
  if (properties && typeof properties === 'object') {
    return Object.entries(properties as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .sort((a, b) => a.localeCompare(b))
  }
  return []
}

const getEntityNameAny = (entityWrapper: unknown) => {
  if (entityWrapper && typeof entityWrapper === 'object' && typeof (entityWrapper as any).name === 'string') {
    return (entityWrapper as any).name as string
  }
  if (entityWrapper && typeof entityWrapper === 'object' && typeof (entityWrapper as any).title === 'string') {
    return (entityWrapper as any).title as string
  }
  if (entityWrapper && typeof entityWrapper === 'object' && typeof (entityWrapper as any).concept === 'string') {
    return (entityWrapper as any).concept as string
  }
  return getEntityName(entityWrapper)
}

const getEntityDetailsAny = (entityWrapper: unknown) => {
  if (entityWrapper && typeof entityWrapper === 'object' && ((entityWrapper as any).name || (entityWrapper as any).concept)) {
    return entityWrapper as any
  }
  return coerceDescriptionObject(getEntityDetails(entityWrapper))
}

const getEntityAttributesAny = (details: any) => {
  // Some plans use "attributes" instead of "properties".
  // Some plans use "state" to describe the stored data instead.
  const attrs = details?.properties ?? details?.attributes ?? details?.fields ?? details?.state
  // Some plans use state as a human-readable string (e.g. "Users (username, password)").
  // Render it as a single bullet line instead of dropping it.
  if (typeof attrs === 'string') return [attrs]
  return attrs
}

const getEntityDescriptionAny = (details: any) => {
  return details?.description ?? details?.purpose ?? details?.principle
}

const props = defineProps<{
  plan: PlanShape
}>()

const showRaw = ref(false)
const copied = ref(false)

const normalized = computed(() => {
  const plan = props.plan || ({} as PlanShape)

  // Support entities shape where the backend returns:
  // entities: [ { Concept: "...", ConceptState: "...", ... } ]
  // by expanding it into the viewer's preferred "one entity per wrapper" form.
  const normalizeKeyedSection = (
    section: unknown,
    valueCoercer: (v: unknown) => unknown = (v) => v,
    keepObjectPredicate: (obj: Record<string, unknown>) => boolean = () => false,
  ): any[] => {
    if (!Array.isArray(section)) return []
    const expanded: any[] = []
    for (const entry of section) {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const record = entry as Record<string, unknown>
        // Some sections already use the structured shape (e.g. { name, steps })
        // and should be kept as-is even though they have multiple keys.
        if (keepObjectPredicate(record)) {
          expanded.push(entry)
          continue
        }
        const keys = Object.keys(record)
        // If it's already a single-key wrapper, keep it.
        if (keys.length <= 1) {
          expanded.push(entry)
          continue
        }
        // Multi-key object: expand into individual wrappers.
        for (const [k, v] of Object.entries(record)) {
          expanded.push({ [k]: valueCoercer(v) })
        }
        continue
      }
      expanded.push(entry)
    }
    return expanded
  }

  const isStructuredFlowObject = (obj: Record<string, unknown>) => {
    return (
      typeof obj.name === 'string' ||
      typeof obj.flow === 'string' ||
      typeof obj.flow_name === 'string' ||
      typeof obj.title === 'string' ||
      Array.isArray(obj.steps) ||
      typeof obj.description === 'string'
    )
  }

  const isStructuredPageObject = (obj: Record<string, unknown>) => {
    return (
      typeof obj.name === 'string' ||
      typeof obj.page === 'string' ||
      typeof obj.page_name === 'string' ||
      typeof obj.title === 'string' ||
      Array.isArray(obj.elements) ||
      Array.isArray(obj.queries) ||
      typeof obj.description === 'string'
    )
  }

  const isStructuredEntityObject = (obj: Record<string, unknown>) => {
    return (
      typeof obj.name === 'string' ||
      typeof obj.title === 'string' ||
      typeof obj.concept === 'string' ||
      typeof obj.description === 'string' ||
      typeof obj.state === 'string' ||
      Array.isArray(obj.fields) ||
      Array.isArray(obj.attributes) ||
      Array.isArray(obj.properties)
    )
  }

  const normalizeFlows = (flows: unknown) =>
    normalizeKeyedSection(
      flows,
      (v) => {
        if (typeof v === 'string') {
          const steps = stringToSteps(v)
          return steps ? { description: v, steps } : { description: v }
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const obj = v as any
          if (!Array.isArray(obj.steps) && Array.isArray(obj.actions)) {
            return { ...obj, steps: obj.actions }
          }
        }
        return v
      },
      isStructuredFlowObject,
    )

  return {
    summary: plan.summary,
    entities: normalizeKeyedSection(
      plan.entities,
      coerceDescriptionObject,
      isStructuredEntityObject,
    ),
    userFlows: normalizeFlows(plan.user_flows),
    pages: normalizeKeyedSection(plan.pages, coerceDescriptionObject, isStructuredPageObject),
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

      <!-- Legacy plans only: current plans carry no entity list (the data model is the
           state of the selected concepts, shown in the Concepts section of the review). -->
      <details v-if="normalized.entities.length" class="section" open>
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
          <details v-for="(entityWrapper, idx) in normalized.entities" :key="idx" class="item" open>
            <summary class="item-summary">
              <span class="twisty">
                <ChevronRight class="chev chev-right" :size="16" />
                <ChevronDown class="chev chev-down" :size="16" />
              </span>
              <span class="item-title">{{ getEntityNameAny(entityWrapper) }}</span>
            </summary>

            <div class="item-body">
              <p v-if="getEntityDescriptionAny(getEntityDetailsAny(entityWrapper))" class="item-desc">
                {{ getEntityDescriptionAny(getEntityDetailsAny(entityWrapper)) }}
              </p>

              <ul
                v-if="entityPropertiesToLines(getEntityAttributesAny(getEntityDetailsAny(entityWrapper))).length"
                class="bullets"
              >
                <li
                  v-for="(p, pIdx) in entityPropertiesToLines(getEntityAttributesAny(getEntityDetailsAny(entityWrapper)))"
                  :key="pIdx"
                >
                  {{ p }}
                </li>
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
              <span class="item-title">{{ getFlowName(flowWrapper) }}</span>
            </summary>

            <div class="item-body">
              <p v-if="getFlowDetails(flowWrapper)?.description" class="item-desc">
                {{ getFlowDetails(flowWrapper)?.description }}
              </p>
              <ol v-if="Array.isArray(getFlowDetails(flowWrapper)?.steps)" class="steps">
                <li v-for="(s, sIdx) in getFlowDetails(flowWrapper).steps" :key="sIdx">{{ s }}</li>
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
              <span class="item-title">{{ getPageName(pageWrapper) }}</span>
            </summary>

            <div class="item-body">
              <p v-if="getPageDetails(pageWrapper)?.description" class="item-desc">
                {{ getPageDetails(pageWrapper)?.description }}
              </p>
              <ul v-if="Array.isArray(getPageDetails(pageWrapper)?.elements)" class="bullets">
                <li v-for="(e, eIdx) in getPageDetails(pageWrapper).elements" :key="eIdx">{{ e }}</li>
              </ul>
              <ul v-else-if="Array.isArray(getPageDetails(pageWrapper)?.queries)" class="bullets">
                <li v-for="(q, qIdx) in getPageDetails(pageWrapper).queries" :key="qIdx">{{ q }}</li>
              </ul>
            </div>
          </details>
        </div>
      </details>

      <!-- Only show Technical Requirements section if there are any -->
      <details v-if="normalized.technical.length" class="section" open>
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
          <ul class="bullets">
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
