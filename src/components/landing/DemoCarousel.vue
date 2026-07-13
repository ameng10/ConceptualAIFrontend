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
 *
 * Loop geometry is measured from the cells themselves (getBoundingClientRect),
 * never derived from scrollWidth: the track's own padding made scrollWidth/3
 * a few px short of the true repeat distance, so every wrap teleport jolted.
 */

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
let settleTimer = 0
let animating = false

const copies = looping ? [0, 1, 2] : [1]

const cells = (): HTMLElement[] => {
  const el = track.value
  return el ? Array.from(el.querySelectorAll<HTMLElement>('.cell')) : []
}

/** Exact loop period: distance between the same card in adjacent copies. */
const period = () => {
  const c = cells()
  if (c.length <= DEMOS.length) return 0
  return c[DEMOS.length].getBoundingClientRect().left - c[0].getBoundingClientRect().left
}

const cardStep = () => {
  const c = cells()
  if (c.length < 2) return 480
  return c[1].getBoundingClientRect().left - c[0].getBoundingClientRect().left
}

/** scrollLeft at which a cell rests under `scroll-snap-align: center`. */
const restingLeft = (cell: HTMLElement) => {
  const el = track.value
  if (!el) return 0
  const t = el.getBoundingClientRect()
  const r = cell.getBoundingClientRect()
  return el.scrollLeft + (r.left + r.width / 2) - (t.left + t.width / 2)
}

/**
 * Teleport by whole periods back into a window centered in the track, leaving
 * balanced runway (~1.5 copies) to each hard end for long flings.
 * Assigning scrollLeft cancels ANY in-flight scroll animation — a touch fling,
 * the post-wheel snap glide, or our own smooth scroll — so this only runs at
 * moments when none can be live: at settle, on finger-down, during self-driven
 * drift, or right before we start a programmatic scroll.
 */
const normalize = (force = false) => {
  const el = track.value
  if (!el || !looping || (animating && !force)) return
  const w = period()
  if (w <= 0) return
  const lo = Math.max(0, w - el.clientWidth / 2)
  while (el.scrollLeft < lo) el.scrollLeft += w
  while (el.scrollLeft > lo + w) el.scrollLeft -= w
}

/**
 * Mid-fling wrap of last resort, once a hard end is less than a card away:
 * cutting the fling short there beats letting it slam into the wall.
 */
const emergencyWrap = () => {
  const el = track.value
  if (!el || !looping || animating) return
  const w = period()
  if (w <= 0) return
  const margin = cardStep()
  const max = el.scrollWidth - el.clientWidth
  if (el.scrollLeft < margin) el.scrollLeft += w
  else if (el.scrollLeft > max - margin) el.scrollLeft -= w
}

/** Active bubble = the cell whose center sits closest to the viewport center. */
const updateDot = () => {
  const el = track.value
  if (!el) return
  const t = el.getBoundingClientRect()
  const center = t.left + t.width / 2
  let best = 0
  let bestDist = Infinity
  cells().forEach((cell, i) => {
    const r = cell.getBoundingClientRect()
    const dist = Math.abs(r.left + r.width / 2 - center)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  })
  activeDot.value = best % DEMOS.length
}

/** Scrolling has come to rest: now wrapping is safe. */
const settle = () => {
  if (settleTimer) {
    window.clearTimeout(settleTimer)
    settleTimer = 0
  }
  animating = false
  normalize()
  updateDot()
}

const onScroll = () => {
  // Debounced fallback for browsers without the `scrollend` event.
  if (settleTimer) window.clearTimeout(settleTimer)
  settleTimer = window.setTimeout(settle, 150)
  if (scrollTicking) return
  scrollTicking = true
  requestAnimationFrame(() => {
    scrollTicking = false
    emergencyWrap()
    updateDot()
  })
}

/** Finger-down pins the scroll — no animation is live, so wrapping is safe. */
const onGrab = () => {
  stopDrift()
  animating = false
  normalize(true)
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
  const el = track.value
  if (!el) return
  // Wrap BEFORE moving so a one-card glide can never cross the wrap threshold.
  normalize(true)
  animating = true
  el.scrollBy({ left: dir * cardStep(), behavior: 'smooth' })
}

const goToDot = (idx: number) => {
  stopDrift()
  const el = track.value
  if (!el) return
  normalize(true)
  // Aim for whichever copy of this card is nearest (may glide through clones).
  const all = cells()
  let target: number | null = null
  for (let copy = 0; copy < copies.length; copy++) {
    const cell = all[copy * DEMOS.length + idx]
    if (!cell) continue
    const left = restingLeft(cell)
    if (target === null || Math.abs(left - el.scrollLeft) < Math.abs(target - el.scrollLeft)) {
      target = left
    }
  }
  if (target === null) return
  animating = true
  el.scrollTo({ left: target, behavior: 'smooth' })
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
    const firstMiddle = cells()[DEMOS.length]
    el.scrollLeft = firstMiddle ? Math.max(0, restingLeft(firstMiddle)) : 0
  }
  updateDot()
  if (!prefersReducedMotion) {
    rafId = requestAnimationFrame(drift)
  }
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (settleTimer) window.clearTimeout(settleTimer)
})
</script>

<template>
  <div
    class="carousel"
    role="region"
    aria-roledescription="carousel"
    aria-label="Demo apps"
    @pointerdown="onGrab"
    @wheel.passive="stopDrift"
    @touchstart.passive="onGrab"
    @keydown="onKeydown"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="hovered = true; stopDrift()"
    @focusout="hovered = false"
  >
    <div
      ref="track"
      class="track"
      :class="{ snapping }"
      tabindex="0"
      @scroll="onScroll"
      @scrollend="settle"
    >
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
