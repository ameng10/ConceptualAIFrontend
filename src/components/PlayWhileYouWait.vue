<script setup lang="ts">
import { ref } from 'vue'
import Game2048 from '@/components/Game2048.vue'
import SnakeGame from '@/components/SnakeGame.vue'

defineProps<{
  title?: string
  subtitle?: string
}>()

const game = ref<'2048' | 'snake'>('2048')
</script>

<template>
  <div class="play glass">
    <div class="play-head">
      <div class="play-title-row">
        <div class="play-title">{{ title || 'Play while you wait' }}</div>
        <label class="picker">
          <span class="picker-label">Game</span>
          <select v-model="game" class="picker-select" aria-label="Choose game">
            <option value="2048">2048</option>
            <option value="snake">Snake</option>
          </select>
        </label>
      </div>
      <div class="play-sub">{{ subtitle || 'Agents can take a bit — pick a game and pass the time.' }}</div>
    </div>

    <Game2048 v-if="game === '2048'" />
    <SnakeGame v-else />
  </div>
</template>

<style scoped>
.play {
  padding: 1rem;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.play-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  text-align: center;
}

.play-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.play-title {
  font-weight: 900;
  letter-spacing: -0.02em;
}

.play-sub {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.picker {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.picker-label {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.picker-select {
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border-radius: 10px;
  padding: 0.35rem 0.55rem;
  font-weight: 700;
  cursor: pointer;
  outline: none;
}

.picker-select:focus {
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.25);
}

@media (max-width: 520px) {
  .play-title-row {
    flex-direction: column;
    align-items: stretch;
  }
  .picker {
    justify-content: center;
  }
}
</style>
