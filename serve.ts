// Production server for the built frontend (dist/).
//
// Deno Deploy app settings (Dynamic app — replaces the old Static/SPA config):
//   Entrypoint:     serve.ts
//   Install command: npm install
//   Build command:   npm run build
//
// Routing (mirror of the dev middleware in vite.config.ts — keep in sync):
//   /                          -> dist/index.html  (static marketing landing)
//   /terms, /privacy, /refunds -> their static HTML pages (pretty URLs)
//   existing files             -> served from dist/ (assets, demos, favicon, *.html)
//   any other extension-less path -> dist/app.html (SPA: /build, /login, /auth/callback, ...)
import { serveDir, serveFile } from 'jsr:@std/http@^1.0.20/file-server'
import { fromFileUrl } from 'jsr:@std/path@^1.1.2/from-file-url'

const DIST = fromFileUrl(new URL('./dist', import.meta.url))

const PRETTY_PAGES: Record<string, string> = {
  '/terms': '/terms.html',
  '/privacy': '/privacy.html',
  '/refunds': '/refunds.html',
}

// Deno Deploy manages the listen port itself; PORT is for local runs.
Deno.serve({ port: Number(Deno.env.get('PORT') ?? 8000) }, async (req) => {
  const url = new URL(req.url)

  const pretty = PRETTY_PAGES[url.pathname]
  if (pretty) {
    return await serveFile(req, DIST + pretty)
  }

  const res = await serveDir(req, { fsRoot: DIST, quiet: true })

  // Vite emits content-hashed asset filenames — safe to cache forever.
  if (res.ok && url.pathname.startsWith('/assets/')) {
    res.headers.set('cache-control', 'public, max-age=31536000, immutable')
  }

  // Extension-less paths that aren't files are SPA client-side routes.
  if (res.status === 404 && !/\.[^/]+$/.test(url.pathname)) {
    await res.body?.cancel()
    return await serveFile(req, `${DIST}/app.html`)
  }

  return res
})
