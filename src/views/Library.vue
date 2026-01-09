<script setup lang="ts">
import { LayoutGrid, BookOpen, Star, Sparkles } from 'lucide-vue-next'

const categories = [
  { name: 'Identity & Auth', count: 12, icon: Sparkles },
  { name: 'E-commerce Central', count: 8, icon: Star },
  { name: 'Social Dynamics', count: 15, icon: BookOpen },
]

const recentConcepts = [
  { name: 'RBAC Access Control', category: 'Identity', difficulty: 'Intermediate' },
  { name: 'Inventory Ledger', category: 'E-commerce', difficulty: 'Advanced' },
  { name: 'Feed Aggregator', category: 'Social', difficulty: 'Beginner' },
]
</script>

<template>
  <div class="library-view">
    <div class="container fade-in">
      <div class="header">
        <h1 class="animated-gradient-text">Concept Library</h1>
        <p class="subtitle">Explore and reuse established conceptual patterns.</p>
      </div>

      <div class="categories">
        <div v-for="cat in categories" :key="cat.name" class="cat-card glass">
          <component :is="cat.icon" :size="24" class="neon-icon" />
          <div class="cat-info">
            <h4>{{ cat.name }}</h4>
            <span>{{ cat.count }} Concepts</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>Featured Concepts</h3>
        <div class="concepts-list glass">
          <div v-for="concept in recentConcepts" :key="concept.name" class="concept-item">
            <div class="item-main">
              <span class="name">{{ concept.name }}</span>
              <span class="tag">{{ concept.category }}</span>
            </div>
            <div class="item-meta">
              <span class="difficulty">{{ concept.difficulty }}</span>
              <button class="btn-icon">
                <PlusCircle :size="18" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-view {
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

.categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.cat-card {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  cursor: pointer;
}

.cat-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
}

.cat-info h4 {
  margin-bottom: 0.25rem;
  color: var(--text);
}

.cat-info span {
  font-size: 0.8125rem;
  color: var(--text-dim);
}

.neon-icon {
  color: var(--neon-teal);
}

.section h3 {
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.concepts-list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.concept-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s;
}

.concept-item:last-child {
  border-bottom: none;
}

.concept-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.item-main {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.name {
  font-weight: 600;
  color: var(--text);
}

.tag {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: var(--border);
  border-radius: 4px;
  color: var(--text-dim);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.difficulty {
  font-size: 0.8125rem;
  color: var(--text-dim);
}

.btn-icon {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
}

.btn-icon:hover {
  color: var(--primary);
}
</style>
