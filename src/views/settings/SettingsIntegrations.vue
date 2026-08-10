<script setup lang="ts">
import { Github } from 'lucide-vue-next'
import GitHubAccountForm from '@/components/GitHubAccountForm.vue'
</script>

<template>
  <section class="panel glass">
    <div class="section-title">
      <Github :size="18" />
      <h3>GitHub connection</h3>
    </div>
    <GitHubAccountForm />
  </section>
</template>

<style scoped>

.panel {
  padding: 1.75rem;
  border-radius: 0.875rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
}
.section-title h3 { margin: 0; font-size: 1.0625rem; font-weight: 800; }

.field-group { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1rem; }
.field-group label { font-size: 0.8125rem; font-weight: 600; color: var(--text-dim); }
.field-group input,
.field-group textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
.bio-input { resize: vertical; }

.muted { color: var(--text-dim); font-size: 0.875rem; }
.hint { margin: 0.75rem 0 0; }
.error-msg { color: var(--danger, #ef4444); font-size: 0.875rem; margin: 0.5rem 0; }
.success-msg { color: var(--success, #22c55e); font-size: 0.875rem; margin: 0.5rem 0; }
</style>
