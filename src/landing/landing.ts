// Entry for the static marketing + legal pages (index.html, terms.html, privacy.html,
// refunds.html). Pulls in the shared design tokens + Tailwind output, then the static-page
// styles, and wires the handful of interactions the static pages have. Every hook is
// optional-chained so the same entry serves pages that lack a given element.
import '../index.css'
import './landing.css'

type Theme = 'dark' | 'light'

const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // storage disabled — theme just won't persist
  }
  const label = document.querySelector('[data-theme-label]')
  if (label) label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode'
}

const currentTheme = (): Theme =>
  document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'

// The pre-paint <head> script already set data-theme; sync the toggle label to it.
applyTheme(currentTheme())

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark')
})

// Swap the ambient background once the visitor scrolls past the hero (ported from Home.vue).
const landing = document.querySelector('.landing')
if (landing) {
  const SCROLL_THRESHOLD = 560
  let ticking = false
  const update = () => landing.classList.toggle('landing-alt', window.scrollY > SCROLL_THRESHOLD)
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        ticking = false
        update()
      })
    },
    { passive: true },
  )
  update()
}

// Demo gallery arrows — scroll one card per click; the row itself is native scroll-snap.
const demoRow = document.getElementById('demo-row')
if (demoRow) {
  document.querySelectorAll<HTMLButtonElement>('.demo-arrow').forEach((arrow) => {
    arrow.addEventListener('click', () => {
      const direction = Number(arrow.dataset.scroll) || 1
      const card = demoRow.querySelector('article')
      const step = card ? card.getBoundingClientRect().width + 16 : 480
      demoRow.scrollBy({ left: direction * step, behavior: 'smooth' })
    })
  })
}
