<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'

type DocItem = {
  fileName: string
  title: string
  content: string
}

const docsByPath = import.meta.glob('../../documentation/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const docOrder = [
  'README.md',
  'getting-started-beginner.md',
  'get-gemini-api-key.md',
  'get-mongodb-atlas-url.md',
  'run-generated-app-locally.md',
  'deploy-with-railway.md',
  'concepts-and-syncs.md',
  'design-phase-advanced.md',
  'troubleshooting.md',
]

const prettyFallbackTitle = (fileName: string) =>
  fileName
    .replace(/\.md$/i, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const extractTitle = (content: string, fileName: string) => {
  const firstHeading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return firstHeading || prettyFallbackTitle(fileName)
}

const discoveredDocs: DocItem[] = Object.entries(docsByPath).map(([path, content]) => {
  const fileName = path.split('/').pop() || path.split('\\').pop() || path
  return {
    fileName,
    title: extractTitle(content, fileName),
    content,
  }
})

const docs = computed(() => {
  const ordered = docOrder
    .map((fileName) => discoveredDocs.find((doc) => doc.fileName === fileName))
    .filter((doc): doc is DocItem => Boolean(doc))

  const remaining = discoveredDocs
    .filter((doc) => !docOrder.includes(doc.fileName))
    .sort((a, b) => a.title.localeCompare(b.title))

  return [...ordered, ...remaining]
})

const selectedDocFile = ref('README.md')

const selectedDoc = computed(
  () => docs.value.find((doc) => doc.fileName === selectedDocFile.value) || docs.value[0],
)

const renderedMarkdown = computed(() => {
  if (!selectedDoc.value) return '<p>No documentation found.</p>'
  return marked.parse(selectedDoc.value.content) as string
})

const selectDoc = (fileName: string) => {
  selectedDocFile.value = fileName
}

const onMarkdownClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target) return

  const link = target.closest('a') as HTMLAnchorElement | null
  if (!link) return

  const href = link.getAttribute('href') || ''
  if (!href || href.startsWith('#')) return

  const isInternalDocLink = href.endsWith('.md') || href.includes('.md#')
  if (isInternalDocLink) {
    event.preventDefault()
    const cleanHref = href.replace('./', '')
    const [fileName] = cleanHref.split('#')
    if (!fileName) return
    if (docs.value.some((doc) => doc.fileName === fileName)) {
      selectDoc(fileName)
    }
    return
  }

  if (href.startsWith('http://') || href.startsWith('https://')) {
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
    return
  }

  // Block unknown/non-http link schemes (e.g. local file-like paths such as
  // "C:/.../.git/index") so Vite doesn't try to load repository internals.
  event.preventDefault()
}
</script>

<template>
  <div class="library-view">
    <div class="container fade-in">
      <div class="header">
        <h1 class="animated-gradient-text">Documentation</h1>
        <p class="subtitle">Browse all product guides from the new docs folder.</p>
      </div>

      <div class="docs-layout">
        <aside class="docs-nav glass">
          <h3>Documents</h3>
          <button
            v-for="doc in docs"
            :key="doc.fileName"
            class="doc-link"
            :class="{ active: selectedDoc?.fileName === doc.fileName }"
            @click="selectDoc(doc.fileName)"
            type="button"
          >
            {{ doc.title }}
          </button>
        </aside>

        <section class="docs-content glass" @click="onMarkdownClick">
          <article class="markdown-body" v-html="renderedMarkdown" />
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem 1rem;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: var(--text-dim);
}

.docs-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 1rem;
  min-height: 70vh;
}

.docs-nav {
  padding: 1rem;
  overflow-y: auto;
}

.docs-nav h3 {
  margin-bottom: 0.75rem;
}

.doc-link {
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-dim);
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  margin-bottom: 0.4rem;
  cursor: pointer;
  transition: var(--transition);
}

.doc-link:hover {
  border-color: var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
}

.doc-link.active {
  color: var(--primary);
  border-color: var(--primary);
  background: rgba(6, 182, 212, 0.12);
}

.docs-content {
  padding: 1.25rem 1.5rem;
  overflow: auto;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3),
:deep(.markdown-body h4) {
  margin-top: 1.25rem;
  margin-bottom: 0.65rem;
}

:deep(.markdown-body h1) {
  margin-top: 0;
}

:deep(.markdown-body p),
:deep(.markdown-body li) {
  line-height: 1.6;
  color: var(--text);
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 1.25rem;
}

:deep(.markdown-body code) {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 0.1rem 0.3rem;
}

:deep(.markdown-body pre) {
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.9rem;
  overflow-x: auto;
}

:deep(.markdown-body pre code) {
  background: transparent;
  padding: 0;
}

:deep(.markdown-body a) {
  color: var(--neon-teal);
}

@media (max-width: 960px) {
  .docs-layout {
    grid-template-columns: 1fr;
  }

  .docs-nav {
    max-height: 260px;
  }
}
</style>
