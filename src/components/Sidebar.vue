<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
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
  ShieldCheck,
} from 'lucide-vue-next'
import api, { authApi, authState } from '@/services/api'
import { setUsername } from '@/services/auth-storage'
import { adminApi } from '@/services/admin-api'
import TierBadge from './TierBadge.vue'
import CreditMeter from './CreditMeter.vue'
import { useBilling } from '../composables/useBilling'

const { billing, load: loadBilling, refresh: refreshBilling } = useBilling()

const props = defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const navItems = [
  { label: 'Create App', icon: PlusCircle, path: '/build' },
  { label: 'My Projects', icon: History, path: '/projects' },
  { label: 'Docs', icon: LayoutGrid, path: '/library' },
  // Billing and Plans are sections of Settings now, so one entry covers all three rather
  // than three competing for the same space. Settings opens on Billing, which is what
  // people come here for most.
  { label: 'Settings', icon: Settings, path: '/settings' },
]

const router = useRouter()
const theme = ref('dark')

const goToLogin = () => router.push('/login')

// Lightweight reactive auth snapshot for sidebar.
// We also listen for storage events so changes in other components reflect here.
const authSnapshot = ref(authState.get())
const isSignedIn = ref(authState.isSignedIn())

// Operator-only entry point. The server answers GET /admin/me with a plain
// boolean for everyone (never 401/403), so this is silent for ordinary users
// and the link simply never renders for them. UI hint only — every admin data
// route re-gates on AdminAuthenticating._isAdmin server-side, so hiding the
// link is convenience, not the security boundary.
const isAdmin = ref(false)

const refreshAdmin = async () => {
  isAdmin.value = isSignedIn.value ? await adminApi.amIAdmin() : false
}

const refreshAuth = () => {
  authSnapshot.value = authState.get()
  isSignedIn.value = authState.isSignedIn()
  void refreshAdmin()
}

/**
 * The display name from the user's profile, resolved once.
 *
 * `authState` only stores a username, and only when the sign-in path happened to know it:
 * the password flow back-fills it from /me/profile, the FEDERATED flow never did. So anyone
 * who signed in with Google had nothing to show and fell through to a placeholder. Read it
 * here too, so an existing session is fixed without making the user sign out and back in.
 */
const profileName = ref<string>('')

async function resolveProfileName() {
  if (!isSignedIn.value) return
  const stored: any = authSnapshot.value
  if (stored?.username) return
  try {
    const res = await api.get<{ profile?: { username?: string; displayName?: string } }>(
      '/api/me/profile',
      { timeout: 4000 },
    )
    const p = res.data?.profile
    // Prefer the human name; the username is the fallback the login path already stores.
    profileName.value = (p?.displayName || p?.username || '').trim()
    if (p?.username) setUsername(p.username)
  } catch {
    // No profile yet, or the endpoint is unavailable — keep the neutral fallback.
  }
}

const userDisplayName = computed(() => {
  // We only reliably store user id on this frontend today.
  // Prefer username if present in the stored object (future), else fallback.
  const u: any = authSnapshot.value
  if (!u) return 'Not signed in'
  // NEVER fall back to a status string. "Signed in" was being used as a NAME, so a user
  // without a stored username saw it as their display name and then saw it again on the
  // line below. Only reached now when the email is unavailable.
  return u.username || u.name || u.user_metadata?.name || profileName.value || 'Your account'
})

/** Their plan, once billing has loaded. Blank rather than a guess while it is unknown —
 *  telling someone they are on Free when they are paying is worse than saying nothing. */
/** The signed-in account's email, from the billing payload this sidebar already loads —
 *  so it costs no extra request and, unlike a profile, exists for every signed-in user. */
const userEmail = computed(() => (isSignedIn.value ? (billing.value?.email ?? '') : ''))

const planLabel = computed(() => {
  const tier = billing.value?.tierLabel
  return tier ? `${tier} plan` : ''
})


const handleLogout = async () => {
  await authApi.logout()
  refreshAuth()
  // '/' is the static landing outside the SPA router — a full navigation is
  // required; router.replace('/') matches no route and renders a blank page.
  window.location.href = '/'
}

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme', theme.value)
}

onMounted(() => {
  void refreshAdmin()
  const savedTheme = localStorage.getItem('theme') || 'dark'
  theme.value = savedTheme
  document.documentElement.setAttribute('data-theme', savedTheme)

  refreshAuth()
  void resolveProfileName()
  window.addEventListener('storage', refreshAuth)
  loadBilling()
  // A build, a purchase or an upgrade all move the balance. Each dispatches this, so
  // the chip is never stale right after the thing that changed it.
  window.addEventListener('billing:changed', refreshBilling)
})

onBeforeUnmount(() => window.removeEventListener('billing:changed', refreshBilling))
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <!-- Plain anchor: the landing page is static HTML outside the SPA router. -->
      <a href="/" class="logo logo-link" aria-label="Go to landing page" title="Go to landing page">
        <Sparkles class="logo-icon" />
        <span v-if="!collapsed" class="logo-wrap">
          <span class="logo-text">ConceptualAI</span>
          <TierBadge v-if="billing" :tier="billing.tier" />
        </span>
      </a>

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

    <div v-if="billing" class="billing-strip" :class="{ collapsed }">
      <CreditMeter :collapsed="collapsed" />
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

      <router-link
        v-if="isAdmin"
        to="/admin/builds"
        class="nav-item"
        v-slot="{ isActive }"
      >
        <div class="nav-item-content" :class="{ active: isActive }">
          <ShieldCheck :size="20" class="nav-icon" />
          <span v-if="!collapsed">Admin</span>
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
        <!-- No initials disc. It was decorative, and derived from a name we often do not
             have — so it spent most of its life showing a letter from a placeholder. The
             email identifies the account unambiguously and needs no avatar beside it. -->
        <div v-if="!collapsed" class="user-info">
          <span class="user-name" :title="userEmail || userDisplayName">
            {{ userEmail || userDisplayName }}
          </span>
          <span class="user-plan" v-if="isSignedIn">{{ planLabel }}</span>
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

.sidebar-header .logo { min-width: 0; flex: 1 1 auto; }
.sidebar-header .collapse-toggle { flex: 0 0 auto; }
.logo-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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

.logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  min-width: 0;
}

.billing-strip {
  padding: 0.75rem 1rem 0;
  display: flex;
}

.billing-strip.collapsed {
  padding: 0.75rem 0 0;
  justify-content: center;
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

.user-info {
  display: flex;
  flex-direction: column;
  /* Takes the space the avatar used to occupy. `min-width: 0` is what actually lets the
     email ellipsis instead of forcing the row wider than the sidebar. */
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.8125rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
