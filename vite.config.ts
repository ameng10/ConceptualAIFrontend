import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// Pages that exist as real static HTML (pretty URL -> html file). Everything else
// that has no file extension is an SPA route and loads the app shell (app.html).
// serve.ts implements the same routing for production; keep the two in sync.
const STATIC_PAGES: Record<string, string> = {
    '/': '/index.html',
    '/terms': '/terms.html',
    '/privacy': '/privacy.html',
    '/refunds': '/refunds.html',
}

const mpaFallback = (): Plugin => ({
    name: 'conceptualai-mpa-fallback',
    configureServer(server) {
        server.middlewares.use((req, _res, next) => {
            const url = new URL(req.url ?? '/', 'http://local')
            const pretty = STATIC_PAGES[url.pathname]
            if (pretty) {
                req.url = pretty + url.search
            } else if (
                !url.pathname.includes('.') && // real files (assets, /src/*.ts, images)
                !url.pathname.startsWith('/api') && // backend proxy
                !url.pathname.startsWith('/@') // vite internals (/@vite/client, /@id/, /@fs/)
            ) {
                req.url = '/app.html' + url.search
            }
            next()
        })
    },
})

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), mpaFallback()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, 'index.html'),
                app: path.resolve(__dirname, 'app.html'),
                terms: path.resolve(__dirname, 'terms.html'),
                privacy: path.resolve(__dirname, 'privacy.html'),
                refunds: path.resolve(__dirname, 'refunds.html'),
            },
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
