<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Sparkles, LayoutGrid, Settings, History, PlusCircle, Sun, Moon } from 'lucide-vue-next'

const navItems = [
  { label: 'Create App', icon: PlusCircle, path: '/' },
  { label: 'My Projects', icon: History, path: '/projects' },
  { label: 'Library', icon: LayoutGrid, path: '/library' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

const theme = ref('dark')

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme', theme.value)
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'dark'
  theme.value = savedTheme
  document.documentElement.setAttribute('data-theme', savedTheme)
})
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <Sparkles class="logo-icon" />
        <span class="logo-text">ConceptualAI</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        v-slot="{ isActive }"
      >
        <div class="nav-item-content" :class="{ active: isActive }">
          <component :is="item.icon" :size="20" class="nav-icon" />
          <span>{{ item.label }}</span>
        </div>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <button class="theme-toggle" @click="toggleTheme">
        <Sun v-if="theme === 'dark'" :size="18" />
        <Moon v-else :size="18" />
        <span>{{ theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}</span>
      </button>

      <div class="user-profile">
        <div class="avatar">AM</div>
        <div class="user-info">
          <span class="user-name">Anthony Meng</span>
          <span class="user-plan">Pro Plan</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: background-color 0.3s ease;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  color: var(--neon-teal);
  filter: drop-shadow(0 0 8px rgba(45, 212, 191, 0.4));
}

.logo-text {
  font-weight: 800;
  font-size: 1.125rem;
  letter-spacing: -0.01em;
  background: linear-gradient(135deg, var(--text) 0%, var(--neon-teal) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-nav {
  padding: 1rem 0.75rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  text-decoration: none;
  color: inherit;
}

.nav-item:first-child .nav-item-content {
  color: var(--neon-teal);
  font-weight: 700;
  text-shadow: 0 0 10px rgba(45, 212, 191, 0.2);
}

.nav-item-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem;
  border-radius: 8px;
  color: var(--text-dim);
  transition: all 0.2s;
  font-weight: 500;
  font-size: 0.9375rem;
}

.nav-item-content:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.nav-item-content.active {
  background: rgba(6, 182, 212, 0.15);
  color: var(--primary);
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: var(--input-bg);
  border: 1px solid var(--border);
  color: var(--text);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: var(--transition);
}

.theme-toggle:hover {
  filter: brightness(1.1);
  border-color: var(--primary);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--grad-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8125rem;
  color: white;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.8125rem;
  font-weight: 600;
}

.user-plan {
  font-size: 0.6875rem;
  color: var(--text-dim);
}
</style>
