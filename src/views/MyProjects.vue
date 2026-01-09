<script setup lang="ts">
import { History, Search, Filter } from 'lucide-vue-next'

const projects = [
  { id: '1', name: 'Social Blog API', status: 'Completed', date: '2024-01-08' },
  { id: '2', name: 'E-commerce Backend', status: 'In Progress', date: '2024-01-07' },
  { id: '3', name: 'Analytics Platform', status: 'Draft', date: '2024-01-05' },
]
</script>

<template>
  <div class="projects-view">
    <div class="container fade-in">
      <div class="header">
        <h1 class="animated-gradient-text">My Projects</h1>
        <p class="subtitle">Management and history of your conceptual architectures.</p>
      </div>

      <div class="controls glass">
        <div class="search-box">
          <Search :size="18" />
          <input type="text" placeholder="Search projects..." />
        </div>
        <button class="btn btn-secondary">
          <Filter :size="18" /> Filter
        </button>
      </div>

      <div class="projects-grid">
        <div v-for="project in projects" :key="project.id" class="project-card glass">
          <div class="card-header">
            <History :size="20" class="neon-icon" />
            <span class="date">{{ project.date }}</span>
          </div>
          <h3>{{ project.name }}</h3>
          <div class="card-footer">
            <span class="status-badge" :class="project.status.toLowerCase().replace(' ', '-')">
              {{ project.status }}
            </span>
            <router-link :to="`/project/${project.id}`" class="view-link">
              View Details →
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projects-view {
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

.header {
  text-align: left;
}

h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.125rem;
  color: var(--text-dim);
}

.controls {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--radius);
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 4px);
  color: var(--text-dim);
}

.search-box input {
  background: transparent;
  border: none;
  color: var(--text);
  padding: 0.75rem 0;
  width: 100%;
  outline: none;
}

.btn-secondary {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.project-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.neon-icon {
  color: var(--neon-teal);
}

.date {
  font-size: 0.8125rem;
  color: var(--text-dim);
}

h3 {
  font-size: 1.25rem;
  color: var(--text);
}

.card-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 100px;
  background: rgba(45, 212, 191, 0.1);
  color: var(--neon-teal);
}

.status-badge.completed {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.view-link {
  font-size: 0.875rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.view-link:hover {
  text-decoration: underline;
}
</style>
