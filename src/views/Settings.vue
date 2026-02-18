<script setup lang="ts">
import { Settings, User, Bell, Shield, Zap } from 'lucide-vue-next'
import { useGeminiCredentials } from '@/services/gemini-credentials'

const { apiKey: geminiApiKey, tier: geminiTier } = useGeminiCredentials()
</script>

<template>
  <div class="settings-view">
    <div class="container fade-in">
      <div class="header">
        <h1 class="animated-gradient-text">Settings</h1>
        <p class="subtitle">Personalize your experience and manage account preferences.</p>
      </div>

      <div class="settings-grid">
        <aside class="settings-nav glass">
          <button class="nav-link active"><User :size="18" /> Profile</button>
          <button class="nav-link"><Bell :size="18" /> Notifications</button>
          <button class="nav-link"><Shield :size="18" /> Security</button>
          <button class="nav-link"><Zap :size="18" /> Billing</button>
        </aside>

        <main class="settings-content glass">
          <section class="settings-section">
            <h3>Profile Settings</h3>
            <div class="field-group">
              <label>Full Name</label>
              <input type="text" class="input" value="Anthony Meng" />
            </div>
            <div class="field-group">
              <label>Email Address</label>
              <input type="email" class="input" value="anthony@example.com" />
            </div>
            <button class="btn btn-primary">Save Changes</button>
          </section>

          <section class="settings-section">
            <h3>Appearance</h3>
            <p>Theme settings are available in the sidebar footer.</p>
          </section>

          <section class="settings-section">
            <h3>Gemini credentials</h3>
            <p class="muted">Used for pipeline triggers. Not persisted (clears on refresh).</p>

            <div class="field-group">
              <label>API Key</label>
              <input
                v-model="geminiApiKey"
                type="text"
                class="input api-key-input"
                placeholder="Paste your Gemini API key"
                autocomplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
              />
            </div>

            <div class="field-group">
              <label>Tier</label>
              <div class="select-wrap">
                <select v-model="geminiTier" class="input tier-select">
                  <option value="0">0 (unsupported)</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4rem 1rem;
}

.container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.125rem;
  color: var(--text-dim);
}

.settings-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 2rem;
  align-items: start;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  gap: 0.25rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-dim);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.nav-link.active {
  background: rgba(6, 182, 212, 0.15);
  color: var(--primary);
}

.settings-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.settings-section h3 {
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  max-width: 400px;
}

.field-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-dim);
}

.btn-primary {
  align-self: flex-start;
}

.muted {
  color: var(--text-dim);
  margin-top: -0.75rem;
  margin-bottom: 1.25rem;
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

/* Mask API key without triggering browser password managers */
.api-key-input {
  -webkit-text-security: disc;
  text-security: disc;
}
</style>
