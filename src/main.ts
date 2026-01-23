import { createApp } from 'vue'
import './index.css'
import App from './App.vue'
import router from './router'
import { initAuthOnStartup } from './services/api'

initAuthOnStartup()

const app = createApp(App)
app.use(router)
app.mount('#app')
