<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Sparkles,
  LayoutGrid,
  Settings,
  History,
  PlusCircle,
  Sun,
  Moon,
  LogOut,
  LogIn,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-vue-next'
import { authApi, authState } from '@/services/api'

const props = defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const navItems = [
  { label: 'Create App', icon: PlusCircle, path: '/build' },
  { label: 'My Projects', icon: History, path: '/projects' },
  { label: 'Community', icon: MessageCircle, path: '/posts' },
  { label: 'Docs', icon: LayoutGrid, path: '/library' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

const router = useRouter()
const theme = ref('dark')

const goToLogin = () => router.push('/login')

// Lightweight reactive auth snapshot for sidebar.
// We also listen for storage events so changes in other components reflect here.
const authSnapshot = ref(authState.get())
const isSignedIn = ref(authState.isSignedIn())

const refreshAuth = () => {
  authSnapshot.value = authState.get()
  isSignedIn.value = authState.isSignedIn()
}

const userDisplayName = computed(() => {
  // We only reliably store user id on this frontend today.
  // Prefer username if present in the stored object (future), else fallback.
  const u: any = authSnapshot.value
  return u?.username || u?.name || u?.user_metadata?.name || (u ? 'Signed in' : 'Not signed in')
})

const userInitials = computed(() => {
  const name = (userDisplayName.value || '').trim()
  if (!name) return 'U'
  const parts = name.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? 'U'
  const second = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? ''
  return (first + second).toUpperCase()
})

const handleLogout = async () => {
  await authApi.logout()
  refreshAuth()
  router.replace('/')
}

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme', theme.value)
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'dark'
  theme.value = savedTheme
  document.documentElement.setAttribute('data-theme', savedTheme)

  refreshAuth()
  window.addEventListener('storage', refreshAuth)
})
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <router-link to="/" class="logo logo-link" aria-label="Go to landing page" title="Go to landing page">
        <Sparkles class="logo-icon" />
        <span v-if="!collapsed" class="logo-text">ConceptualAI</span>
      </router-link>

      <button
        class="collapse-toggle"
        type="button"
        @click="emit('toggle')"
        :aria-expanded="!collapsed"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <PanelLeftOpen v-if="collapsed" :size="18" />
        <PanelLeftClose v-else :size="18" />
      </button>
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
          <span v-if="!collapsed">{{ item.label }}</span>
        </div>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <button class="theme-toggle" @click="toggleTheme">
        <Sun v-if="theme === 'dark'" :size="18" />
        <Moon v-else :size="18" />
        <span v-if="!collapsed">{{ theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}</span>
      </button>

      <div class="user-profile">
        <div class="avatar" aria-label="User avatar">{{ userInitials }}</div>
        <div v-if="!collapsed" class="user-info">
          <span class="user-name">{{ userDisplayName }}</span>
          <span class="user-plan" v-if="isSignedIn">Signed in</span>
          <span class="user-plan" v-else>Not signed in</span>
        </div>

        <button
          v-if="isSignedIn"
          class="logout-btn"
          type="button"
          @click="handleLogout"
          title="Log out"
        >
          <LogOut :size="16" />
        </button>
        <button
          v-else
          class="login-btn"
          type="button"
          @click="goToLogin"
          title="Sign in"
        >
          <LogIn :size="16" />
          <span v-if="!collapsed">Sign In</span>
        </button>
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
  transition: background-color 0.3s ease, width 0.25s ease;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.sidebar.collapsed .sidebar-header {
  padding: 0.75rem;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
}

.collapse-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text);
  cursor: pointer;
  transition: var(--transition);
  justify-content: center;
}

.collapse-toggle:hover {
  border-color: rgba(45, 212, 191, 0.25);
}

.sidebar.collapsed .collapse-toggle {
  width: 36px;
  height: 36px;
}

.sidebar.collapsed .logo {
  justify-content: center;
}

.sidebar.collapsed .sidebar-nav {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.sidebar.collapsed .nav-item-content {
  justify-content: center;
  gap: 0;
}

.sidebar.collapsed .sidebar-footer {
  padding: 0.75rem 0.5rem;
  align-items: center;
}

.sidebar.collapsed .theme-toggle {
  width: 100%;
  justify-content: center;
  gap: 0;
  padding: 0.5rem;
}

.sidebar.collapsed .user-profile {
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.sidebar.collapsed .logout-btn {
  margin-left: 0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
}

.sidebar.collapsed .login-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 12px;
  justify-content: center;
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

.logo-link {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
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
  background-clip: text;
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
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem;
  border-radius: 8px;
  color: var(--text-dim);
  border: 1px solid transparent;
  transition: all 0.2s;
  font-weight: 500;
  font-size: 0.9375rem;
}

/* Gradient glow ring on hover/focus */
.nav-item-content::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #3b82f6 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.nav-item-content:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.15),
    0 0 22px rgba(45, 212, 191, 0.28),
    0 0 38px rgba(59, 130, 246, 0.18);
}

.nav-item-content:hover::before {
  opacity: 1;
}

.nav-item:focus-visible .nav-item-content {
  outline: none;
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.22),
    0 0 26px rgba(45, 212, 191, 0.32);
}

.nav-item:focus-visible .nav-item-content::before {
  opacity: 1;
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

.logout-btn {
  position: relative;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--input-bg);
  border: 1px solid var(--border);
  color: var(--text);
  cursor: pointer;
  transition: var(--transition);
}

.logout-btn::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #3b82f6 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.logout-btn:hover {
  filter: brightness(1.1);
  border-color: transparent;
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.15),
    0 0 18px rgba(45, 212, 191, 0.28),
    0 0 32px rgba(59, 130, 246, 0.18);
}

.logout-btn:hover::before {
  opacity: 1;
}

.logout-btn:focus-visible {
  outline: none;
}

.logout-btn:focus-visible::before {
  opacity: 1;
}

.login-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--primary);
  color: black;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.login-btn:hover {
  filter: brightness(1.1);
  box-shadow: 0 0 12px rgba(45, 212, 191, 0.3);
}
</style>
