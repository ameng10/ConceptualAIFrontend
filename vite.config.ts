import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        allowedHosts: ['conceptual-ai.app'],
        fs: {
            deny: ['**/.git/**'],
        },
        proxy: {
            // Backend routes all live under /api (REQUESTING_BASE_URL). Do NOT add
            // bare SPA-route prefixes here: a proxied '/auth' swallowed the OAuth
            // callback's full-page redirect (/auth/callback → backend 404), and
            // '/projects' would 404 any hard refresh of the projects page.
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        }
    }
})
