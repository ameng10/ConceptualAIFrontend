<script setup lang="ts">
import { computed, ref } from 'vue'
import { ExternalLink, FileText, Github, LifeBuoy, CreditCard } from 'lucide-vue-next'
import type { DemoCardData } from './demos'
import DemoPromptModal from './DemoPromptModal.vue'

const props = defineProps<{
  demo: DemoCardData
  /** Clone copies in the looping track are inert; don't mount their modals. */
  interactive?: boolean
}>()

const variantKey = ref<'v1' | 'v2'>('v1')
const showPrompt = ref(false)

const activeVariant = computed(() =>
  props.demo.variants?.find((v) => v.key === variantKey.value),
)

const badges = computed(() => activeVariant.value?.badges ?? props.demo.badges)
const liveUrl = computed(() => activeVariant.value?.liveUrl ?? props.demo.liveUrl)
const image = computed(() => activeVariant.value?.image ?? props.demo.image)

const promptExcerpt = computed(() => props.demo.prompt.slice(0, 300))
const repos = computed(() => activeVariant.value?.repos ?? props.demo.repos)
const repoLinks = computed(() => [
  { label: 'Frontend repo', url: repos.value.frontend },
  { label: 'Backend repo', url: repos.value.backend },
])
const demoHost = computed(() => {
  const url = liveUrl.value
  if (url) {
    try {
      return new URL(url).host
    } catch {
      // fall through to the placeholder host
    }
  }
  return `${props.demo.slug}${variantKey.value === 'v2' ? '-v2' : ''}.rdavislee.deno.net`
})
</script>

<template>
  <article class="demo-card glass" :aria-label="`${demo.name} demo`">
    <!-- Screenshot (browser-framed) or styled prompt-card placeholder -->
    <div class="shot">
      <div class="shot-chrome">
        <span class="chrome-dot" /><span class="chrome-dot" /><span class="chrome-dot" />
        <span class="chrome-url">{{ demoHost }}</span>
      </div>
      <img
        v-if="image"
        :src="image"
        :alt="`${demo.name} screenshot`"
        class="shot-img"
        loading="lazy"
        decoding="async"
      />
      <div v-else class="shot-placeholder" aria-hidden="true">
        <pre class="shot-prompt-ghost">{{ promptExcerpt }}</pre>
        <div class="shot-name-mark">{{ demo.name }}</div>
      </div>
      <div v-if="demo.supportHub" class="support-flag">
        <LifeBuoy :size="12" />
        <span>Also our real support desk</span>
      </div>
    </div>

    <div class="card-body">
      <div class="card-title-row">
        <h3 class="card-name">{{ demo.name }}</h3>
        <div v-if="demo.variants" class="variant-toggle" role="group" :aria-label="`${demo.name} version`">
          <button
            v-for="v in demo.variants"
            :key="v.key"
            type="button"
            class="variant-btn"
            :class="{ on: variantKey === v.key }"
            @click="variantKey = v.key"
          >
            {{ v.key }}
          </button>
        </div>
      </div>

      <p class="card-tagline">{{ demo.tagline }}</p>

      <div v-if="demo.diff && variantKey === 'v2'" class="diff-strip">
        <span class="diff-item patched">Patched: {{ demo.diff.patched.join(', ') }}</span>
        <span class="diff-item added">Added: {{ demo.diff.added.join(', ') }}</span>
        <span class="diff-item unchanged">
          {{ demo.diff.unchangedSample.join(', ') }} + {{ demo.diff.unchangedCount - demo.diff.unchangedSample.length }} more — byte-for-byte unchanged
        </span>
      </div>

      <div class="badge-row">
        <span v-for="badge in badges" :key="badge" class="badge-chip">{{ badge }}</span>
      </div>

      <div v-if="demo.testCard" class="test-note">
        <CreditCard :size="13" />
        <span>Test mode — card 4242 4242 4242 4242</span>
      </div>

      <div class="card-actions">
        <button type="button" class="card-btn secondary" @click="showPrompt = true">
          <FileText :size="15" />
          See the prompt
        </button>
        <a
          v-if="liveUrl"
          :href="liveUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="card-btn primary"
        >
          Open live app
          <ExternalLink :size="15" />
        </a>
        <span v-else class="card-btn soon" aria-disabled="true">Launching soon</span>
      </div>

      <div class="repo-actions">
        <template v-for="repo in repoLinks" :key="repo.label">
          <a
            v-if="repo.url"
            :href="repo.url"
            target="_blank"
            rel="noopener noreferrer"
            class="repo-btn"
          >
            <Github :size="14" />
            {{ repo.label }}
          </a>
          <span v-else class="repo-btn disabled" aria-disabled="true" title="Repos go public at launch">
            <Github :size="14" />
            {{ repo.label }}
          </span>
        </template>
      </div>
    </div>

    <DemoPromptModal
      v-if="showPrompt && interactive !== false"
      :demo="demo"
      :variantKey="variantKey"
      @close="showPrompt = false"
    />
  </article>
</template>

<style scoped>
.demo-card {
  display: flex;
  flex-direction: column;
  width: min(460px, 85vw);
  flex: 0 0 auto;
  overflow: hidden;
  scroll-snap-align: center;
}

.shot {
  position: relative;
  border-bottom: 1px solid var(--glass-border);
  background: rgba(2, 6, 23, 0.5);
}

.shot-chrome {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid var(--glass-border);
}

.chrome-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--glass-border);
}

.chrome-url {
  margin-left: 0.5rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-dim);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.shot-img,
.shot-placeholder {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.shot-placeholder {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(420px circle at 15% 0%, var(--grad-color-1), transparent 60%),
    radial-gradient(360px circle at 90% 20%, var(--grad-color-2), transparent 60%),
    rgba(2, 6, 23, 0.72);
}

.shot-prompt-ghost {
  position: absolute;
  inset: 0.9rem;
  margin: 0;
  color: rgba(226, 232, 240, 0.22);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, black 55%, transparent 95%);
  -webkit-mask-image: linear-gradient(to bottom, black 55%, transparent 95%);
}

.shot-name-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: transparent;
  background-image: var(--grad-neon);
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow: none;
}

.support-flag {
  position: absolute;
  top: 2.6rem;
  right: 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--neon-teal);
  font-size: 0.68rem;
  font-weight: 800;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.1rem 1.2rem 1.25rem;
  flex: 1;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-name {
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.variant-toggle {
  display: inline-flex;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  overflow: hidden;
}

.variant-btn {
  min-width: 44px;
  min-height: 30px;
  padding: 0.2rem 0.7rem;
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  transition: var(--transition);
}

.variant-btn.on {
  background: var(--grad-accent);
  color: #042f2e;
}

.card-tagline {
  color: var(--text-dim);
  font-size: 0.9rem;
  line-height: 1.55;
}

.diff-strip {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.6rem 0.75rem;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: rgba(2, 6, 23, 0.35);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.7rem;
  line-height: 1.4;
}

[data-theme='light'] .diff-strip {
  background: rgba(15, 23, 42, 0.05);
}

.diff-item.patched { color: var(--await); }
.diff-item.added { color: var(--neon-teal); }
.diff-item.unchanged { color: var(--text-dim); }

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.badge-chip {
  padding: 0.26rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-dim);
  font-size: 0.7rem;
  font-weight: 700;
}

.test-note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-dim);
  font-size: 0.72rem;
  font-weight: 600;
}

.card-actions {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.card-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0.55rem 0.95rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
  transition: var(--transition);
}

.card-btn.secondary {
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
}

.card-btn.secondary:hover {
  background: var(--input-bg);
}

.card-btn.primary {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: var(--grad-neon);
  color: #042f2e;
}

.card-btn.primary:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.card-btn.soon {
  border: 1px dashed var(--glass-border);
  color: var(--text-dim);
  cursor: default;
}

.repo-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.repo-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 36px;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  transition: var(--transition);
}

a.repo-btn:hover {
  background: var(--input-bg);
  color: var(--text);
}

.repo-btn.disabled {
  border-style: dashed;
  opacity: 0.55;
  cursor: default;
}
</style>
