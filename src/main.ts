import { createApp } from 'vue'
import './index.css'
import App from './App.vue'
import router from './router'
import { initAuthOnStartup } from './services/api'
import { clearGeminiCredentialState, type GeminiActionRequiredDetail } from './services/gemini-credentials'
import { clearGithubCredentialState } from './services/github-credentials'
import { useToasts } from './services/toast'

initAuthOnStartup()

const app = createApp(App)
app.use(router)

// Redirect to login when session is cleared (e.g. 401, refresh failure)
router.isReady().then(() => {
  const { push } = useToasts()

  window.addEventListener('auth:session-cleared', () => {
    clearGeminiCredentialState()
    clearGithubCredentialState()
    router.replace('/login')
  })

  window.addEventListener('gemini:action-required', (event: Event) => {
    const detail = (event as CustomEvent<GeminiActionRequiredDetail>).detail
    const message = detail?.message || 'Update your Gemini credentials in Settings to continue.'

    push({
      title: detail?.title || 'Gemini credentials required',
      message,
      kind: 'warning',
      ttlMs: 5000,
    })

    if (router.currentRoute.value.path !== '/settings') {
      router.replace('/settings')
    }
  })
})

app.mount('#app')
