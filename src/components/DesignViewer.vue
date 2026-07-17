<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronDown,
  ChevronRight,
  Clipboard,
  ClipboardCheck,
  Library,
  PenTool,
} from 'lucide-vue-next'
import type { PlanShape } from '@/components/PlanViewer.vue'

type LibraryPull = {
  libraryName?: string
  instanceName?: string
  spec?: string
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

// ---------------------------------------------------------------------------
// Concept-spec parsing: specs are markdown with `**heading**` section lines at
// column 0 (purpose, principle, state, actions, queries, lifecycle cleanups)
// and `name (args) : (result)` signature lines inside actions/queries. We parse
// them into structured sections so the review reads like documentation, not a
// raw dump.
// ---------------------------------------------------------------------------

type SpecSection = { heading: string; lines: string[] }

const HEADING_RE = /^\*\*([a-zA-Z][a-zA-Z ]*)\*\*\s*(.*)$/
const SIGNATURE_RE = /^(?:\*\*system\*\*\s+)?_?[a-zA-Z]\w*\s*\(.*$/

const parseSpecSections = (spec: string): SpecSection[] => {
  const sections: SpecSection[] = []
  let current: SpecSection | null = null
  for (const rawLine of (spec || '').split('\n')) {
    const line = rawLine.trimEnd()
    const heading = line.match(HEADING_RE)
    if (heading && !rawLine.startsWith(' ')) {
      // `**concept** Name [Params]` header line and section headings both match;
      // treat the concept header as its own section so the title can use it.
      current = { heading: heading[1].trim().toLowerCase(), lines: [] }
      if (heading[2]?.trim()) current.lines.push(heading[2].trim())
      sections.push(current)
      continue
    }
    if (!current) {
      current = { heading: '', lines: [] }
      sections.push(current)
    }
    current.lines.push(rawLine)
  }
  return sections
}

const sectionText = (sections: SpecSection[], heading: string): string =>
  sections
    .filter((s) => s.heading === heading)
    .flatMap((s) => s.lines)
    .join('\n')
    .trim()

/** Operation names listed in a set of sections (actions / queries / cleanups). */
const operationNames = (sections: SpecSection[], headings: string[]): string[] => {
  const names: string[] = []
  for (const s of sections) {
    if (!headings.includes(s.heading)) continue
    for (const rawLine of s.lines) {
      if (rawLine.startsWith(' ') || rawLine.startsWith('\t')) continue
      const line = rawLine.trim()
      if (!SIGNATURE_RE.test(line)) continue
      const name = line.replace(/^\*\*system\*\*\s+/, '').split('(')[0].trim()
      if (name) names.push(name)
    }
  }
  return names
}

type ConceptCard = {
  name: string
  kind: 'library' | 'custom'
  purpose: string
  actionNames: string[]
  queryNames: string[]
  spec: string
}

const toCard = (name: string, kind: 'library' | 'custom', spec?: string): ConceptCard => {
  const sections = parseSpecSections(spec || '')
  return {
    name,
    kind,
    purpose: sectionText(sections, 'purpose').split('\n')[0] || '',
    actionNames: operationNames(sections, ['actions', 'lifecycle cleanups']),
    queryNames: operationNames(sections, ['queries']),
    spec: spec || '',
  }
}

const cards = computed<ConceptCard[]>(() => {
  const design = props.design || ({} as DesignShape)
  const pulls = Array.isArray(design.libraryPulls) ? design.libraryPulls : []
  const customs = Array.isArray(design.customConcepts) ? design.customConcepts : []
  return [
    ...pulls.map((p) => toCard(p.libraryName || p.instanceName || 'Concept', 'library', p.spec)),
    ...customs.map((c) => toCard(c.name || 'Concept', 'custom', c.spec)),
  ]
})

const libraryCount = computed(() => cards.value.filter((c) => c.kind === 'library').length)
const customCount = computed(() => cards.value.filter((c) => c.kind === 'custom').length)

/** Render one spec for the expanded view: keep section headings bold, signature
 *  lines emphasized, body lines dimmed — a documentation feel without a markdown lib. */
type SpecRenderLine = { kind: 'heading' | 'signature' | 'body'; text: string }
const renderSpec = (spec: string): SpecRenderLine[] => {
  const out: SpecRenderLine[] = []
  for (const rawLine of (spec || '').split('\n')) {
    const line = rawLine.trimEnd()
    const heading = line.match(HEADING_RE)
    if (heading && !rawLine.startsWith(' ')) {
      out.push({ kind: 'heading', text: heading[1].trim() + (heading[2] ? ' ' + heading[2].trim() : '') })
      continue
    }
    if (!rawLine.startsWith(' ') && SIGNATURE_RE.test(line.trim()) && line.trim().length > 0) {
      out.push({ kind: 'signature', text: line })
      continue
    }
    out.push({ kind: 'body', text: rawLine })
  }
  // Trim leading/trailing blank body lines
  while (out.length && out[0].kind === 'body' && !out[0].text.trim()) out.shift()
  while (out.length && out[out.length - 1].kind === 'body' && !out[out.length - 1].text.trim()) out.pop()
  return out
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
        <span class="count-chip"><Library :size="13" /> {{ libraryCount }} from library</span>
        <span class="count-chip"><PenTool :size="13" /> {{ customCount }} designed for this app</span>
      </div>

      <div class="top-actions">
        <button class="btn-chip" type="button" @click="tryCopy" :title="copied ? 'Copied' : 'Copy JSON'">
          <ClipboardCheck v-if="copied" :size="14" />
          <Clipboard v-else :size="14" />
          <span>{{ copied ? 'Copied' : 'Copy JSON' }}</span>
        </button>

        <button class="btn-chip" type="button" @click="showRaw = !showRaw">
          <ChevronDown v-if="showRaw" :size="14" />
          <ChevronRight v-else :size="14" />
          <span>{{ showRaw ? 'Hide raw' : 'Raw' }}</span>
        </button>
      </div>
    </div>

    <div v-if="!cards.length" class="empty">No concepts selected yet.</div>

    <div class="cards">
      <details v-for="(card, idx) in cards" :key="idx" class="card">
        <summary class="card-summary">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <div class="card-head">
            <div class="card-title-row">
              <span class="card-name">{{ card.name }}</span>
              <span :class="['kind-badge', card.kind]">
                <Library v-if="card.kind === 'library'" :size="11" />
                <PenTool v-else :size="11" />
                {{ card.kind === 'library' ? 'Library' : 'Custom' }}
              </span>
            </div>
            <p v-if="card.purpose" class="card-purpose">{{ card.purpose }}</p>
            <div class="card-ops">
              <span v-if="card.actionNames.length" class="ops-chip">
                {{ card.actionNames.length }} action{{ card.actionNames.length === 1 ? '' : 's' }}
              </span>
              <span v-if="card.queryNames.length" class="ops-chip">
                {{ card.queryNames.length }} quer{{ card.queryNames.length === 1 ? 'y' : 'ies' }}
              </span>
            </div>
          </div>
        </summary>

        <div class="card-body">
          <div v-if="card.spec" class="spec-doc">
            <template v-for="(line, lIdx) in renderSpec(card.spec)" :key="lIdx">
              <div v-if="line.kind === 'heading'" class="spec-heading">{{ line.text }}</div>
              <div v-else-if="line.kind === 'signature'" class="spec-signature">{{ line.text }}</div>
              <div v-else class="spec-body-line">{{ line.text || ' ' }}</div>
            </template>
          </div>
          <div v-else class="empty">Specification not available for this concept.</div>
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
  gap: 0.9rem;
  background: transparent;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.count-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-dim);
  border: 1px solid var(--border);
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
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
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.78rem;
}

.btn-chip:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.2s;
}

.card[open],
.card:hover {
  border-color: rgba(255, 255, 255, 0.22);
}

.card-summary {
  list-style: none;
  cursor: pointer;
  user-select: none;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}

.card-summary::-webkit-details-marker {
  display: none;
}

.card-head {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.card-name {
  font-weight: 700;
  font-size: 0.95rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.kind-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
}

.kind-badge.library {
  color: rgba(96, 165, 250, 0.95);
  background: rgba(96, 165, 250, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.25);
}

.kind-badge.custom {
  color: rgba(192, 132, 252, 0.95);
  background: rgba(192, 132, 252, 0.12);
  border: 1px solid rgba(192, 132, 252, 0.25);
}

.card-purpose {
  margin: 0;
  font-size: 0.84rem;
  color: var(--text-dim);
  line-height: 1.45;
}

.card-ops {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.ops-chip {
  font-size: 0.72rem;
  color: var(--text-dim);
  border: 1px solid var(--border);
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}

.card-body {
  border-top: 1px solid var(--border);
  padding: 0.9rem 1rem;
}

.spec-doc {
  max-height: 420px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.8rem;
  line-height: 1.55;
}

.spec-heading {
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.72rem;
  margin: 0.9rem 0 0.25rem;
}

.spec-heading:first-child {
  margin-top: 0;
}

.spec-signature {
  color: var(--primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.spec-body-line {
  color: var(--text-dim);
  white-space: pre-wrap;
  word-break: break-word;
}

.twisty {
  position: relative;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  margin-top: 0.1rem;
}

.chev {
  position: absolute;
  top: 1px;
  left: 1px;
  color: var(--text-dim);
  opacity: 0.85;
}

details[open] > summary .twisty .chev-right {
  display: none;
}

details:not([open]) > summary .twisty .chev-down {
  display: none;
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
