<script setup lang="ts">
import { useGeminiCredentials } from '@/services/gemini-credentials'

const { apiKey: geminiApiKey, tier: geminiTier } = useGeminiCredentials()
</script>

<template>
  <div class="byok-card glass">
    <h2 class="byok-title">Gemini credentials</h2>
    <p class="byok-subtitle">Required for pipeline triggers. Not persisted (clears on refresh).</p>

    <div class="byok-grid">
      <div class="field">
        <label class="label">API Key</label>
        <input
          v-model="geminiApiKey"
          type="password"
          class="input"
          placeholder="Paste your Gemini API key"
          autocomplete="off"
        />
      </div>

      <div class="field">
        <label class="label">Tier</label>
        <div class="select-wrap">
          <select v-model="geminiTier" class="input tier-select">
            <option value="0">0 (unsupported)</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.byok-card {
  width: 100%;
  padding: 1.25rem;
  border-radius: var(--radius);
}

.byok-title {
  font-size: 1.125rem;
  margin: 0;
}

.byok-subtitle {
  margin-top: 0.5rem;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.byok-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 1rem;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dim);
}

.select-wrap {
  position: relative;
}

.tier-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 2.5rem;
  cursor: pointer;
}

.select-wrap::after {
  content: '';
  position: absolute;
  right: 1rem;
  top: 50%;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--text-dim);
  border-bottom: 2px solid var(--text-dim);
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
  opacity: 0.9;
}

@media (max-width: 640px) {
  .byok-grid {
    grid-template-columns: 1fr;
  }
}
</style>
