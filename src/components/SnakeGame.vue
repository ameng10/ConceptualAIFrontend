<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Dir = 'up' | 'down' | 'left' | 'right'

type Pt = { r: number; c: number }

// Make Snake smaller (more cells) while keeping the same overall board boundary.
const SIZE = 10
const TICK_MS = 180

const score = ref(0)
const best = ref(0)
const over = ref(false)

const storageKeyBest = 'conceptualai_snake_best'

const dir = ref<Dir>('right')
const pendingDir = ref<Dir>('right')
const snake = ref<Pt[]>([])
const food = ref<Pt>({ r: 0, c: 0 })

let timer: number | null = null

function loadBest() {
  try {
    const v = window.localStorage.getItem(storageKeyBest)
    const n = v ? Number(v) : 0
    if (Number.isFinite(n) && n > 0) best.value = n
  } catch {
    // ignore
  }
}

function saveBest() {
  try {
    window.localStorage.setItem(storageKeyBest, String(best.value))
  } catch {
    // ignore
  }
}

function eq(a: Pt, b: Pt) {
  return a.r === b.r && a.c === b.c
}

function randomEmptyCell(): Pt {
  const occ = new Set(snake.value.map((p) => `${p.r},${p.c}`))
  const empties: Pt[] = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const k = `${r},${c}`
      if (!occ.has(k)) empties.push({ r, c })
    }
  }
  return empties[Math.floor(Math.random() * Math.max(empties.length, 1))] || { r: 0, c: 0 }
}

function reset() {
  score.value = 0
  over.value = false
  dir.value = 'right'
  pendingDir.value = 'right'
  // start length 2 in the middle-left
  const startR = Math.floor(SIZE / 2)
  snake.value = [
    { r: startR, c: 1 },
    { r: startR, c: 0 },
  ]
  food.value = randomEmptyCell()
}

function restart() {
  reset()
  start()
}

function stop() {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

function start() {
  stop()
  timer = window.setInterval(tick, TICK_MS)
}

function isOpposite(a: Dir, b: Dir) {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  )
}

function setDir(d: Dir) {
  if (over.value) return
  if (isOpposite(dir.value, d)) return
  pendingDir.value = d
}

function tick() {
  if (over.value) return

  dir.value = pendingDir.value
  const head = snake.value[0]
  const next: Pt = { r: head.r, c: head.c }

  if (dir.value === 'up') next.r--
  if (dir.value === 'down') next.r++
  if (dir.value === 'left') next.c--
  if (dir.value === 'right') next.c++

  // boundary collision (same boundary concept as 2048 board)
  if (next.r < 0 || next.r >= SIZE || next.c < 0 || next.c >= SIZE) {
    over.value = true
    stop()
    return
  }

  // self collision (allow moving into the tail if it's about to move)
  const tail = snake.value[snake.value.length - 1]
  const occupies = snake.value
    .slice(0, -1)
    .some((p) => eq(p, next))
  if (occupies) {
    over.value = true
    stop()
    return
  }

  const ate = eq(next, food.value)
  snake.value = [next, ...snake.value]

  if (!ate) {
    snake.value = snake.value.slice(0, snake.value.length - 1)
  } else {
    score.value += 1
    if (score.value > best.value) {
      best.value = score.value
      saveBest()
    }
    // if snake fills board, you win; just stop spawning.
    if (snake.value.length >= SIZE * SIZE) {
      stop()
      return
    }
    food.value = randomEmptyCell()
  }

  // keep TS happy
  void tail
}

function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || (target as any)?.isContentEditable) return

  const key = e.key
  if (key === 'ArrowUp' || key === 'w') {
    e.preventDefault()
    setDir('up')
  } else if (key === 'ArrowDown' || key === 's') {
    e.preventDefault()
    setDir('down')
  } else if (key === 'ArrowLeft' || key === 'a') {
    e.preventDefault()
    setDir('left')
  } else if (key === 'ArrowRight' || key === 'd') {
    e.preventDefault()
    setDir('right')
  }
}

const grid = computed(() => {
  const cells: Array<{ r: number; c: number; kind: 'empty' | 'head' | 'body' | 'food' }> = []
  const head = snake.value[0]
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = { r, c }
      let kind: 'empty' | 'head' | 'body' | 'food' = 'empty'
      if (eq(p, food.value)) kind = 'food'
      if (snake.value.some((s, i) => i === 0 && eq(s, p))) kind = 'head'
      else if (snake.value.some((s, i) => i > 0 && eq(s, p))) kind = 'body'
      // head wins over food
      if (head && eq(head, p)) kind = 'head'
      cells.push({ r, c, kind })
    }
  }
  return cells
})

onMounted(() => {
  loadBest()
  reset()
  start()
  window.addEventListener('keydown', onKeyDown, { passive: false })
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('keydown', onKeyDown as any)
})
</script>

<template>
  <div class="game glass">
    <div class="top">
      <div class="title">Snake</div>
      <div class="scores">
        <div class="score">
          <div class="label">Score</div>
          <div class="value">{{ score }}</div>
        </div>
        <div class="score">
          <div class="label">Best</div>
          <div class="value">{{ best }}</div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button class="btn" type="button" @click="reset">New game</button>
      <div class="hint">Arrow keys / WASD</div>
    </div>

  <div class="board" :data-over="over ? 'true' : 'false'" :style="{ '--snake-cols': String(SIZE) }">
      <div v-for="(cell, idx) in grid" :key="idx" class="cell" :class="cell.kind">
        <span v-if="cell.kind === 'food'">●</span>
      </div>

      <div v-if="over" class="overlay">
        <div class="overlay-title">Game over</div>
  <button class="btn" type="button" @click="restart">Try again</button>
      </div>
    </div>

    <div class="mobile-controls">
      <div class="dpad">
        <button class="dbtn" type="button" @click="setDir('up')">↑</button>
        <div class="mid">
          <button class="dbtn" type="button" @click="setDir('left')">←</button>
          <button class="dbtn" type="button" @click="setDir('right')">→</button>
        </div>
        <button class="dbtn" type="button" @click="setDir('down')">↓</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Match layout + board footprint of Game2048 (same class names) */
.game {
  padding: 1rem;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.title {
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.scores {
  display: flex;
  gap: 0.5rem;
}

.score {
  min-width: 86px;
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  padding: 0.35rem 0.55rem;
  background: rgba(255, 255, 255, 0.04);
  text-align: right;
}

.label {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.value {
  font-size: 0.95rem;
  font-weight: 800;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.btn {
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.hint {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--snake-cols), 1fr);
  gap: 0.5rem;
  padding: 0.6rem;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--glass-border);
}

.cell {
  height: 18px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

/* tighter rounding for a denser grid */
.cell {
  border-radius: 6px;
}

.cell.empty {
  background: rgba(255, 255, 255, 0.04);
}

.cell.food {
  background: rgba(239, 68, 68, 0.18);
  color: rgba(239, 68, 68, 0.95);
}

.cell.body {
  background: rgba(16, 185, 129, 0.22);
}

.cell.head {
  background: rgba(6, 182, 212, 0.26);
}

.overlay {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
}

:root[data-theme='light'] .overlay,
[data-theme='light'] .overlay {
  background: rgba(255, 255, 255, 0.75);
}

.overlay-title {
  font-size: 1.05rem;
  font-weight: 900;
}

.mobile-controls {
  display: none;
}

.dpad {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: center;
}

.mid {
  display: flex;
  gap: 0.35rem;
}

.dbtn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-weight: 900;
  cursor: pointer;
}

.dbtn:hover {
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 980px) {
  .cell { height: 16px; }
}

@media (max-width: 720px) {
  .mobile-controls { display: block; }
}
</style>
