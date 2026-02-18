import { createApp } from 'vue'
import './index.css'
import App from './App.vue'
import router from './router'
import { initAuthOnStartup } from './services/api'

initAuthOnStartup()

const app = createApp(App)
app.use(router)

// Redirect to login when session is cleared (e.g. 401, refresh failure)
router.isReady().then(() => {
  window.addEventListener('auth:session-cleared', () => {
    router.replace('/login')
  })
})

app.mount('#app')
