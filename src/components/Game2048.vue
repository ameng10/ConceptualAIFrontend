<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Direction = 'up' | 'down' | 'left' | 'right'

type Cell = {
  value: number
  merged?: boolean
  id: string
}

const SIZE = 4

const board = ref<Cell[][]>([])
const score = ref(0)
const best = ref(0)
const won = ref(false)
const winDismissed = ref(false)
const over = ref(false)

const storageKeyBest = 'conceptualai_2048_best'

function genId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

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

function emptyBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({ value: 0, id: genId() })),
  )
}

function cloneBoard(b: Cell[][]): Cell[][] {
  return b.map((row) => row.map((c) => ({ value: c.value, id: c.id })))
}

function clearMergedFlags(b: Cell[][]) {
  for (const row of b) for (const cell of row) cell.merged = false
}

function randomEmptyCell(b: Cell[][]): { r: number; c: number } | null {
  const empties: Array<{ r: number; c: number }> = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r][c].value === 0) empties.push({ r, c })
    }
  }
  if (!empties.length) return null
  return empties[Math.floor(Math.random() * empties.length)]
}

function spawn(b: Cell[][]) {
  const pos = randomEmptyCell(b)
  if (!pos) return
  const v = Math.random() < 0.9 ? 2 : 4
  b[pos.r][pos.c] = { value: v, id: genId() }
}

function setGameOverFlags(b: Cell[][]) {
  // win
  for (const row of b) {
    for (const cell of row) {
      if (cell.value >= 2048) won.value = true
    }
  }

  // check moves
  const hasEmpty = b.some((row) => row.some((c) => c.value === 0))
  if (hasEmpty) {
    over.value = false
    return
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = b[r][c].value
      if (r + 1 < SIZE && b[r + 1][c].value === v) return (over.value = false)
      if (c + 1 < SIZE && b[r][c + 1].value === v) return (over.value = false)
    }
  }
  over.value = true
}

function reset() {
  score.value = 0
  won.value = false
  winDismissed.value = false
  over.value = false
  const b = emptyBoard()
  spawn(b)
  spawn(b)
  board.value = b
  setGameOverFlags(b)
}

function continueAfterWin() {
  winDismissed.value = true
}

function slideAndMergeLine(line: Cell[]): { out: Cell[]; gained: number; moved: boolean } {
  // compress
  const nonzero = line.filter((c) => c.value !== 0).map((c) => ({ value: c.value, id: c.id, merged: false }))

  let gained = 0
  const merged: Cell[] = []
  for (let i = 0; i < nonzero.length; i++) {
    const current = nonzero[i]
    const next = nonzero[i + 1]

    if (next && current.value === next.value) {
      const newValue = current.value * 2
      gained += newValue
      merged.push({ value: newValue, id: genId(), merged: true })
      i++
    } else {
      merged.push({ value: current.value, id: current.id })
    }
  }

  while (merged.length < SIZE) merged.push({ value: 0, id: genId() })

  const moved = merged.some((c, idx) => c.value !== line[idx].value)
  return { out: merged, gained, moved }
}

function move(dir: Direction) {
  if (over.value) return

  const before = cloneBoard(board.value)
  const b = cloneBoard(board.value)
  clearMergedFlags(b)

  let movedAny = false
  let gainedTotal = 0

  const applyRow = (r: number, reversed: boolean) => {
    const line = reversed ? [...b[r]].reverse() : [...b[r]]
    const { out, gained, moved } = slideAndMergeLine(line)
    const result = reversed ? [...out].reverse() : out
    b[r] = result
    gainedTotal += gained
    movedAny = movedAny || moved
  }

  const applyCol = (c: number, reversed: boolean) => {
    const col = Array.from({ length: SIZE }, (_, r) => b[r][c])
    const line = reversed ? [...col].reverse() : col
    const { out, gained, moved } = slideAndMergeLine(line)
    const result = reversed ? [...out].reverse() : out
    for (let r = 0; r < SIZE; r++) b[r][c] = result[r]
    gainedTotal += gained
    movedAny = movedAny || moved
  }

  if (dir === 'left') for (let r = 0; r < SIZE; r++) applyRow(r, false)
  if (dir === 'right') for (let r = 0; r < SIZE; r++) applyRow(r, true)
  if (dir === 'up') for (let c = 0; c < SIZE; c++) applyCol(c, false)
  if (dir === 'down') for (let c = 0; c < SIZE; c++) applyCol(c, true)

  // no change
  if (!movedAny) {
    // still update over flag if needed
    setGameOverFlags(b)
    return
  }

  score.value += gainedTotal
  if (score.value > best.value) {
    best.value = score.value
    saveBest()
  }

  spawn(b)
  board.value = b
  setGameOverFlags(b)

  // keep TS happy about before usage (future: animations)
  void before
}

function onKeyDown(e: KeyboardEvent) {
  // Don't hijack typing.
  const target = e.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || (target as any)?.isContentEditable) return

  const key = e.key
  if (key === 'ArrowUp' || key === 'w') {
    e.preventDefault()
    move('up')
  } else if (key === 'ArrowDown' || key === 's') {
    e.preventDefault()
    move('down')
  } else if (key === 'ArrowLeft' || key === 'a') {
    e.preventDefault()
    move('left')
  } else if (key === 'ArrowRight' || key === 'd') {
    e.preventDefault()
    move('right')
  }
}

const flatCells = computed(() => board.value.flat())

const tileClass = (v: number) => {
  if (v === 0) return 't0'
  if (v <= 2048) return `t${v}`
  return 'tX'
}

onMounted(() => {
  loadBest()
  reset()
  window.addEventListener('keydown', onKeyDown, { passive: false })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown as any)
})
</script>

<template>
  <div class="game glass">
    <div class="top">
      <div class="title">2048</div>
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
      <div class="hint">Use arrow keys or WASD</div>
    </div>

    <div
      class="board"
      :data-over="over ? 'true' : 'false'"
      :data-won="won && !winDismissed ? 'true' : 'false'"
    >
      <div v-for="cell in flatCells" :key="cell.id" class="cell" :class="tileClass(cell.value)">
        <span v-if="cell.value !== 0">{{ cell.value }}</span>
      </div>

      <div v-if="over" class="overlay">
        <div class="overlay-title">Game over</div>
        <button class="btn" type="button" @click="reset">Try again</button>
      </div>

      <div v-else-if="won && !winDismissed" class="overlay" data-variant="win">
        <div class="overlay-title">2048!</div>
        <div class="overlay-sub">Keep going if you want.</div>
        <div class="overlay-actions">
          <button class="btn" type="button" @click="continueAfterWin">Continue</button>
          <button class="btn" type="button" @click="reset">New game</button>
        </div>
      </div>
    </div>

    <div class="mobile-controls">
      <div class="dpad">
        <button class="dbtn" type="button" @click="move('up')">↑</button>
        <div class="mid">
          <button class="dbtn" type="button" @click="move('left')">←</button>
          <button class="dbtn" type="button" @click="move('right')">→</button>
        </div>
        <button class="dbtn" type="button" @click="move('down')">↓</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  padding: 0.6rem;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--glass-border);
}

.cell {
  height: 54px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.05rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

/* Tile colors (simple, on-brand) */
.t0 { background: rgba(255, 255, 255, 0.04); color: transparent; }
.t2 { background: rgba(59, 130, 246, 0.18); }
.t4 { background: rgba(6, 182, 212, 0.18); }
.t8 { background: rgba(16, 185, 129, 0.22); }
.t16 { background: rgba(34, 197, 94, 0.28); }
.t32 { background: rgba(45, 212, 191, 0.28); }
.t64 { background: rgba(14, 165, 233, 0.26); }
.t128 { background: rgba(99, 102, 241, 0.26); }
.t256 { background: rgba(168, 85, 247, 0.26); }
.t512 { background: rgba(236, 72, 153, 0.22); }
.t1024 { background: rgba(245, 158, 11, 0.22); }
.t2048 { background: rgba(250, 204, 21, 0.24); color: #0b1220; }
.tX { background: rgba(250, 204, 21, 0.28); color: #0b1220; }

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

.overlay[data-variant='win'] {
  background: rgba(16, 185, 129, 0.18);
  backdrop-filter: blur(14px);
}

.overlay-title {
  font-size: 1.05rem;
  font-weight: 900;
}

.overlay-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.overlay-sub {
  font-size: 0.8rem;
  color: var(--text-dim);
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
  .cell { height: 48px; }
}

@media (max-width: 720px) {
  .mobile-controls { display: block; }
}
</style>
