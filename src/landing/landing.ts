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

// Builder-replica hero (index.html only): the same paired typewriter placeholders and
// Enter-to-submit behavior as the builder's AppDescriptionInput.vue — keep the phrases
// and timings in sync with that component.
const heroForm = document.getElementById('hero-builder-form') as HTMLFormElement | null
if (heroForm) {
  const nameField = heroForm.querySelector<HTMLInputElement>('[data-typewriter="name"]')
  const descField = heroForm.querySelector<HTMLTextAreaElement>('[data-typewriter="description"]')

  const namePhrases = ['Agency Client Portal', 'Membership Community', 'Booking Marketplace']
  const descPhrases = [
    'Build a client portal for my design agency — project status, file approvals, Stripe invoices...',
    'Build a paid community with supporter subscriptions and a members-only feed...',
    'Build a marketplace where hosts list classes and guests book paid time slots...',
  ]

  if (nameField && descField) {
    let phrase = 0
    let nameChars = 0
    let descChars = 0
    let deleting = false

    const tick = () => {
      const namePhrase = namePhrases[phrase] ?? ''
      const descPhrase = descPhrases[phrase] ?? ''

      if (!deleting) {
        if (nameChars < namePhrase.length) nameChars += 1
        if (descChars < descPhrase.length) descChars += 1
      } else {
        if (nameChars > 0) nameChars -= 1
        if (descChars > 0) descChars -= 1
      }

      nameField.placeholder = namePhrase.slice(0, nameChars)
      descField.placeholder = descPhrase.slice(0, descChars)

      if (!deleting && nameChars >= namePhrase.length && descChars >= descPhrase.length) {
        deleting = true
        window.setTimeout(tick, 1600)
      } else if (deleting && nameChars <= 0 && descChars <= 0) {
        deleting = false
        phrase = (phrase + 1) % namePhrases.length
        window.setTimeout(tick, 300)
      } else {
        window.setTimeout(tick, deleting ? 14 : 30)
      }
    }

    // Start empty like the builder does (the HTML placeholders are the no-JS fallback).
    nameField.placeholder = ''
    descField.placeholder = ''
    window.setTimeout(tick, 450)

    descField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        heroForm.requestSubmit()
      }
    })
  }
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
