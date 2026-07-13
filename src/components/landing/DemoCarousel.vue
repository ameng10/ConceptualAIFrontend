<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { DEMOS } from './demos'
import DemoCard from './DemoCard.vue'

/**
 * Snap-scroll demo carousel per LANDING_PAGE_PLAN §4:
 * - seamless loop via cloned track thirds (clones are inert + aria-hidden)
 * - slow ambient drift until the FIRST user interaction, then manual forever
 * - pause on hover/focus; no drift at all under prefers-reduced-motion
 * - arrows + dots + native swipe; everything keyboard-reachable
 */

const GAP = 20

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const looping = !prefersReducedMotion

const track = ref<HTMLElement | null>(null)
const activeDot = ref(0)
const driftStopped = ref(prefersReducedMotion)
const snapping = ref(prefersReducedMotion)

const hovered = ref(false)
let rafId = 0
let scrollTicking = false

const copies = looping ? [0, 1, 2] : [1]

const setWidth = () => {
  const el = track.value
  if (!el) return 0
  return el.scrollWidth / copies.length
}

const cardStep = () => {
  const el = track.value
  const first = el?.querySelector<HTMLElement>('.demo-card')
  return first ? first.offsetWidth + GAP : 480
}

const normalize = () => {
  const el = track.value
  if (!el || !looping) return
  const w = setWidth()
  if (w <= 0) return
  if (el.scrollLeft < w * 0.5) el.scrollLeft += w
  else if (el.scrollLeft > w * 1.5) el.scrollLeft -= w
}

const updateDot = () => {
  const el = track.value
  if (!el) return
  const w = looping ? setWidth() : el.scrollWidth
  const offset = looping ? el.scrollLeft % w : el.scrollLeft
  activeDot.value = Math.round(offset / cardStep()) % DEMOS.length
}

const onScroll = () => {
  if (scrollTicking) return
  scrollTicking = true
  requestAnimationFrame(() => {
    scrollTicking = false
    normalize()
    updateDot()
  })
}

const drift = () => {
  if (driftStopped.value) return
  const el = track.value
  if (el && !hovered.value) {
    el.scrollLeft += 0.5
    normalize()
  }
  rafId = requestAnimationFrame(drift)
}

const stopDrift = () => {
  if (driftStopped.value) return
  driftStopped.value = true
  snapping.value = true
  if (rafId) cancelAnimationFrame(rafId)
}

const scrollByCards = (dir: 1 | -1) => {
  stopDrift()
  track.value?.scrollBy({ left: dir * cardStep(), behavior: 'smooth' })
}

const goToDot = (idx: number) => {
  stopDrift()
  const el = track.value
  if (!el) return
  const base = looping ? setWidth() : 0
  el.scrollTo({ left: base + idx * cardStep(), behavior: 'smooth' })
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    scrollByCards(1)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    scrollByCards(-1)
  }
}

onMounted(async () => {
  await nextTick()
  const el = track.value
  if (el && looping) {
    el.scrollLeft = setWidth()
  }
  updateDot()
  if (!prefersReducedMotion) {
    rafId = requestAnimationFrame(drift)
  }
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div
    class="carousel"
    role="region"
    aria-roledescription="carousel"
    aria-label="Demo apps"
    @pointerdown="stopDrift"
    @wheel.passive="stopDrift"
    @touchstart.passive="stopDrift"
    @keydown="onKeydown"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="hovered = true; stopDrift()"
    @focusout="hovered = false"
  >
    <div ref="track" class="track" :class="{ snapping }" tabindex="0" @scroll="onScroll">
      <template v-for="copy in copies" :key="copy">
        <div
          v-for="demo in DEMOS"
          :key="`${copy}-${demo.slug}`"
          class="cell"
          :inert="looping && copy !== 1"
          :aria-hidden="looping && copy !== 1 ? 'true' : undefined"
        >
          <DemoCard :demo="demo" :interactive="!looping || copy === 1" />
        </div>
      </template>
    </div>

    <div class="controls">
      <button type="button" class="arrow" aria-label="Previous demo" @click="scrollByCards(-1)">
        <ChevronLeft :size="18" />
      </button>

      <div class="dots" role="tablist" aria-label="Choose demo">
        <button
          v-for="(demo, idx) in DEMOS"
          :key="demo.slug"
          type="button"
          class="dot"
          :class="{ on: activeDot === idx }"
          :aria-label="`Go to ${demo.name}`"
          :aria-current="activeDot === idx ? 'true' : undefined"
          @click="goToDot(idx)"
        />
      </div>

      <button type="button" class="arrow" aria-label="Next demo" @click="scrollByCards(1)">
        <ChevronRight :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.carousel {
  position: relative;
}

.track {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding: 0.25rem 0.25rem 1rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}

.track::-webkit-scrollbar {
  display: none;
}

.track.snapping {
  scroll-snap-type: x mandatory;
}

.track:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 4px;
  border-radius: 16px;
}

.cell {
  flex: 0 0 auto;
  display: flex;
}

.controls {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
  cursor: pointer;
  transition: var(--transition);
}

.arrow:hover {
  background: var(--input-bg);
  transform: translateY(-1px);
}

.dots {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.dot {
  width: 10px;
  height: 10px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  cursor: pointer;
  transition: var(--transition);
}

.dot.on {
  background: var(--primary);
  border-color: var(--primary);
  box-shadow: var(--neon-glow);
  transform: scale(1.2);
}
</style>
