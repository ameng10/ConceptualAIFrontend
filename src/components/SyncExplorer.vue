<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ChevronRight, Folder, FileText } from 'lucide-vue-next'

export type SyncFile = {
  path: string
  contents?: string
  size?: number
}

export type SyncGroup = {
  name: string
  files: SyncFile[]
}

export type SyncPayload = {
  groups: SyncGroup[]
  raw?: any
}

const props = defineProps<{
  syncs: any
}>()

const safeStringify = (value: any, space = 2) => {
  const seen = new WeakSet<object>()
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') return String(val)
        if (typeof val === 'function') return '[Function]'
        if (val && typeof val === 'object') {
          if (seen.has(val)) return '[Circular]'
          seen.add(val)
        }
        return val
      },
      space,
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return `"[Unserializable sync payload: ${msg}]"`
  }
}

const stripCodeFences = (text: string) => {
  // Common backend shape: "```yaml\n...\n```"
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) return text
  const lines = trimmed.split('\n')
  // Remove first fence line and last fence line
  if (lines.length >= 2 && lines[0].startsWith('```') && lines[lines.length - 1].startsWith('```')) {
    return lines.slice(1, -1).join('\n')
  }
  return text
}

const normalize = (raw: any): SyncPayload => {
  const payload = raw?.result && typeof raw.result === 'object' ? raw.result : raw

  const groups: SyncGroup[] = []

  const toTextList = (items: unknown) => {
    if (!Array.isArray(items)) return ''
    return items.map((s) => `- ${String(s)}`).join('\n')
  }

  // Overview / index
  if (Array.isArray(payload?.syncs) && payload.syncs.length) {
    groups.push({
      name: 'Overview',
      files: [
        {
          path: 'syncs.txt',
          contents: toTextList(payload.syncs),
        },
        {
          path: 'syncs.json',
          contents: safeStringify(payload.syncs, 2),
        },
      ],
    })
  }

  // API.md: { syncs: [...], apiDefinition: {...}, endpointBundles: [...] }
  const apiDef = payload?.apiDefinition
  if (apiDef && typeof apiDef === 'object') {
    const encoding = String(apiDef.encoding ?? 'txt')
    const ext = encoding.toLowerCase() === 'yaml' ? 'yaml' : encoding.toLowerCase() === 'json' ? 'json' : 'txt'
    const contentRaw = typeof apiDef.content === 'string' ? apiDef.content : safeStringify(apiDef, 2)
    const content = typeof apiDef.content === 'string' ? stripCodeFences(apiDef.content) : contentRaw

    groups.push({
      name: 'API Definition',
      files: [
        {
          path: `openapi.${ext}`,
          contents: content,
        },
      ],
    })
  }

  const endpointBundles: any[] = Array.isArray(payload?.endpointBundles) ? payload.endpointBundles : []
  if (endpointBundles.length) {
    const bundleGroups: SyncGroup[] = endpointBundles.map((b, idx) => {
      const endpoint = b?.endpoint ?? {}
      const method = String(endpoint?.method ?? endpoint?.httpMethod ?? '').toUpperCase()
      const path = String(endpoint?.path ?? endpoint?.route ?? '')
      const name = method && path ? `${method} ${path}` : `Endpoint Bundle ${idx + 1}`

      const files: SyncFile[] = []

      // Endpoint metadata
      files.push({
        path: 'endpoint.json',
        contents: safeStringify(endpoint, 2),
      })

      // Sync definitions for this endpoint
      if (Array.isArray(b?.syncs) && b.syncs.length) {
        files.push({
          path: 'syncs.txt',
          contents: toTextList(b.syncs),
        })
        files.push({
          path: 'syncs.json',
          contents: safeStringify(b.syncs, 2),
        })
      }

      // Generated sync file (TypeScript)
      if (typeof b?.syncFile === 'string' && b.syncFile.trim().length) {
        files.push({
          path: 'syncs.ts',
          contents: b.syncFile,
        })
      }

      // Generated tests
      if (typeof b?.testFile === 'string') {
        files.push({
          path: 'endpoint.test.ts',
          contents: b.testFile,
        })
      }

      // Compile info (often includes non-serializable objects)
      if (b?.compile !== undefined) {
        files.push({
          path: 'compile.json',
          contents: safeStringify(b.compile, 2),
        })
      }

      return { name, files }
    })

    // Render each endpoint as its own group (folder)
    groups.push(...bundleGroups)
  }

  return { groups, raw }
}

const normalized = computed(() => normalize(props.syncs))

const openGroups = ref<Record<string, boolean>>({})
const openFiles = ref<Record<string, boolean>>({})

const onGroupToggle = (groupName: string, e: Event) => {
  const el = e.currentTarget as HTMLDetailsElement | null
  if (!el) return
  openGroups.value[groupName] = el.open
}

const onFileToggle = (key: string, e: Event) => {
  const el = e.currentTarget as HTMLDetailsElement | null
  if (!el) return
  openFiles.value[key] = el.open
}
</script>

<template>
  <div class="impl">
    <div class="impl-top">
      <h3 class="impl-title">Sync output</h3>
      <div class="impl-sub">Generated API definition and endpoint bundles</div>
    </div>

    <div v-if="!normalized.groups.length" class="empty">No sync files found in the sync payload.</div>

    <div v-else class="concepts">
      <details
        v-for="g in normalized.groups"
        :key="g.name"
        class="concept"
        :open="openGroups[g.name] ?? true"
        @toggle="onGroupToggle(g.name, $event)"
      >
        <summary class="concept-summary">
          <span class="twisty">
            <ChevronRight class="chev chev-right" :size="16" />
            <ChevronDown class="chev chev-down" :size="16" />
          </span>
          <Folder :size="16" />
          <span class="concept-name">{{ g.name }}</span>
          <span class="pill">{{ g.files.length }}</span>
        </summary>

        <div v-show="openGroups[g.name] ?? true" class="concept-body">
          <div v-if="!g.files.length" class="empty">No files.</div>

          <details
            v-for="f in g.files"
            :key="`${g.name}::${f.path}`"
            class="file"
            :open="openFiles[`${g.name}::${f.path}`] ?? false"
            @toggle="onFileToggle(`${g.name}::${f.path}`, $event)"
          >
            <summary class="file-summary">
              <span class="twisty">
                <ChevronRight class="chev chev-right" :size="16" />
                <ChevronDown class="chev chev-down" :size="16" />
              </span>
              <FileText :size="16" />
              <span class="file-path monospace">{{ f.path }}</span>
              <span v-if="f.size" class="pill">{{ f.size }}b</span>
            </summary>

            <div v-show="openFiles[`${g.name}::${f.path}`] ?? false" class="file-body">
              <pre v-if="f.contents" class="file-pre">{{ f.contents }}</pre>
              <div v-else class="empty">No contents returned for this file.</div>
            </div>
          </details>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
/* Reuse ImplementationExplorer look/feel */
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
  color: var(--text-dim);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}

.file-path {
  color: var(--text);
}

.monospace {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85rem;
}

.concept-body,
.file-body {
  padding: 0.75rem;
  border-top: 1px solid var(--glass-border);
}

.file-pre {
  margin: 0;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text);
  overflow: auto;
  white-space: pre;
}
</style>
