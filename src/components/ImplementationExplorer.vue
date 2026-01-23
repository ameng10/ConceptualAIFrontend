<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ChevronRight, Folder, FileText } from 'lucide-vue-next'

export type ImplementationFile = {
  path: string
  contents?: string
  content?: string
  text?: string
  size?: number
}

export type ImplementationConcept = {
  name: string
  files: ImplementationFile[]
}

export type ImplementationPayload = {
  concepts: ImplementationConcept[]
  raw?: any
}

const props = defineProps<{
  implementation: any
}>()

const normalize = (impl: any): ImplementationPayload => {
  const raw = impl

  // API.md: { implementations: { ConceptName: { code, tests, spec, ... }, ... } }
  // In our view we may pass either the full response or just the implementations object.
  const implementationsObj: Record<string, any> | null =
    (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as any).implementations && typeof (raw as any).implementations === 'object'
      ? (raw as any).implementations
      : null) ||
    (raw && typeof raw === 'object' && !Array.isArray(raw) && !(raw as any).concepts
      ? (raw as any)
      : null)

  if (implementationsObj && Object.keys(implementationsObj).length) {
    const concepts: ImplementationConcept[] = Object.entries(implementationsObj).map(([conceptName, v]) => {
      const files: ImplementationFile[] = []
      if (typeof v?.code === 'string') files.push({ path: 'code.ts', contents: v.code })
      if (typeof v?.tests === 'string') files.push({ path: 'tests.ts', contents: v.tests })
      if (typeof v?.spec === 'string') files.push({ path: 'spec.md', contents: v.spec })

      // Some backends return { files: { path: contents } } or { files: [{path,contents}] }
      if (Array.isArray(v?.files)) {
        for (const f of v.files) {
          if (!f) continue
          files.push({
            path: String(f?.path ?? f?.filePath ?? f?.name ?? 'file'),
            contents: typeof f?.contents === 'string' ? f.contents : typeof f?.content === 'string' ? f.content : undefined,
            text: typeof f?.text === 'string' ? f.text : undefined,
            size: typeof f?.size === 'number' ? f.size : undefined,
          })
        }
      } else if (v?.files && typeof v.files === 'object') {
        for (const [p, c] of Object.entries(v.files)) {
          files.push({ path: String(p), contents: typeof c === 'string' ? c : JSON.stringify(c, null, 2) })
        }
      }

      return { name: conceptName, files }
    })

    return { concepts, raw }
  }

  const conceptsArr: any[] =
    (Array.isArray(raw?.concepts) && raw.concepts) ||
    (Array.isArray(raw?.result?.concepts) && raw.result.concepts) ||
    (Array.isArray(raw?.implementation?.concepts) && raw.implementation.concepts) ||
    []

  const concepts: ImplementationConcept[] = conceptsArr
    .map((c) => {
      const name = String(c?.name ?? c?.conceptName ?? c?.id ?? 'Concept')
      const filesArr: any[] = Array.isArray(c?.files) ? c.files : Array.isArray(c?.artifacts) ? c.artifacts : []
      const files: ImplementationFile[] = filesArr.map((f) => ({
        path: String(f?.path ?? f?.filePath ?? f?.name ?? 'file'),
        contents: typeof f?.contents === 'string' ? f.contents : undefined,
        content: typeof f?.content === 'string' ? f.content : undefined,
        text: typeof f?.text === 'string' ? f.text : undefined,
        size: typeof f?.size === 'number' ? f.size : undefined,
      }))
      return { name, files }
    })
    .filter((c) => c.name)

  return { concepts, raw }
}

const normalized = computed(() => normalize(props.implementation))

const openConcepts = ref<Record<string, boolean>>({})
const openFiles = ref<Record<string, boolean>>({})

const toggleConcept = (conceptName: string) => {
  openConcepts.value[conceptName] = !openConcepts.value[conceptName]
}

const toggleFile = (key: string) => {
  openFiles.value[key] = !openFiles.value[key]
}

const fileText = (f: ImplementationFile) => f.contents ?? f.content ?? f.text ?? ''
</script>

<template>
  <div class="impl">
    <div class="impl-top">
      <h3 class="impl-title">Implementation output</h3>
      <div class="impl-sub">Concepts and generated files</div>
    </div>

    <div v-if="!normalized.concepts.length" class="empty">
      No concepts/files found in the implementation payload.
    </div>

    <div v-else class="concepts">
      <details
        v-for="c in normalized.concepts"
        :key="c.name"
        class="concept"
        :open="openConcepts[c.name] ?? true"
        @toggle.prevent
      >
        <summary class="concept-summary" @click.prevent="toggleConcept(c.name)">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <Folder :size="16" />
          <span class="concept-name">{{ c.name }}</span>
          <span class="pill">{{ c.files.length }}</span>
        </summary>

        <div v-show="openConcepts[c.name] ?? true" class="concept-body">
          <div v-if="!c.files.length" class="empty">No files.</div>

          <details
            v-for="f in c.files"
            :key="`${c.name}::${f.path}`"
            class="file"
            :open="openFiles[`${c.name}::${f.path}`] ?? false"
            @toggle.prevent
          >
            <summary class="file-summary" @click.prevent="toggleFile(`${c.name}::${f.path}`)">
              <span class="twisty">
                <ChevronRight class="chev chev-right" :size="16" />
                <ChevronDown class="chev chev-down" :size="16" />
              </span>
              <FileText :size="16" />
              <span class="file-path monospace">{{ f.path }}</span>
              <span v-if="f.size" class="pill">{{ f.size }}b</span>
            </summary>

            <div v-show="openFiles[`${c.name}::${f.path}`] ?? false" class="file-body">
              <pre v-if="fileText(f)" class="file-pre">{{ fileText(f) }}</pre>
              <div v-else class="empty">No contents returned for this file.</div>
            </div>
          </details>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.impl {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.impl-top {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.impl-title {
  margin: 0;
  font-size: 1rem;
}

.impl-sub {
  color: var(--text-dim);
  font-size: 0.85rem;
}

.empty {
  padding: 0.75rem;
  color: var(--text-dim);
  border: 1px dashed var(--glass-border);
  border-radius: 12px;
}

.concepts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.concept,
.file {
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
}

.concept-summary,
.file-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
  user-select: none;
  list-style: none;
}

.concept-summary::-webkit-details-marker,
.file-summary::-webkit-details-marker {
  display: none;
}

.twisty {
  width: 26px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
}

.chev-down {
  display: none;
}

details[open] > summary .chev-right {
  display: none;
}

details[open] > summary .chev-down {
  display: inline;
}

.concept-name {
  font-weight: 700;
}

.pill {
  margin-left: auto;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-dim);
}

.concept-body {
  padding: 0.75rem;
  border-top: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.file-body {
  border-top: 1px solid var(--glass-border);
}

.file-pre {
  margin: 0;
  padding: 0.8rem;
  font-size: 0.8rem;
  line-height: 1.35;
  overflow: auto;
}

.monospace {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
</style>
