<script setup lang="ts">
const testLines = [
  { text: 'Authenticating › register → login → session', ok: true },
  { text: 'Purchasing › checkout applied exactly once', ok: true },
  { text: 'Reservations › double-booking rejected', ok: true },
  { text: 'Posting › supporters-only gate holds', ok: true },
  { text: 'Emailing › confirmation sent exactly once', ok: true },
]

const diffUnchanged = [
  'Subscribing',
  'Liking',
  'Following',
  'Authenticating',
  'Sessioning',
  'Profiling',
  'MediaHosting',
  'Notifying',
  'AdminAuthenticating',
]

const stats = [
  { value: '~17,800', label: 'lines of backend code' },
  { value: '~10,300', label: 'lines of frontend code' },
  { value: '~12,400', label: 'lines of generated tests' },
  { value: '2,866', label: 'lines of API documentation' },
]
</script>

<template>
  <section id="proof" class="mx-auto w-full max-w-6xl px-4 py-14">
    <div>
      <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">The receipts</div>
      <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Why these don't fall apart.</h2>
      <p class="mt-3 max-w-3xl text-lg text-text-dim">
        The most common complaint about AI app builders is that adding a feature quietly breaks the last one. Apps
        here are assembled from pre-tested building blocks, and a build isn't done until its own generated test
        suite passes against a real database — so instead of promises, you get receipts.
      </p>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-5">
      <!-- Test receipt -->
      <div class="receipt md:col-span-3">
        <div class="receipt-head">
          <span class="receipt-title">Test receipt</span>
          <span class="receipt-sub">every build, before it's called done</span>
        </div>
        <div class="terminal">
          <div class="term-cmd">$ deno test --allow-all</div>
          <div class="term-muted">running 313 tests from ./tests/</div>
          <div v-for="line in testLines" :key="line.text" class="term-row">
            <span class="term-text">{{ line.text }}</span>
            <span class="term-ok">… ok</span>
          </div>
          <div class="term-muted">…</div>
          <div class="term-summary">ok · <span class="term-ok">313 passed</span> · 0 failed</div>
          <div class="term-muted">same suite, green on MongoDB, Postgres, and Turso — your choice.</div>
        </div>
      </div>

      <!-- Diff receipt -->
      <div class="receipt md:col-span-2">
        <div class="receipt-head">
          <span class="receipt-title">Iteration diff receipt</span>
          <span class="receipt-sub">Commons v1 → v2</span>
        </div>
        <div class="terminal">
          <div class="diff-line patched">~ Posting <span class="diff-note">patched</span></div>
          <div class="diff-line patched">~ Commenting <span class="diff-note">patched</span></div>
          <div class="diff-line added">+ AIModeration <span class="diff-note">added</span></div>
          <div class="diff-sep">unchanged — byte-for-byte:</div>
          <div v-for="name in diffUnchanged" :key="name" class="diff-line unchanged">= {{ name }}</div>
        </div>
        <p class="receipt-caption">Add a feature; get proof the rest didn't move — including the billing.</p>
      </div>
    </div>

    <!-- Scale stats (megroup receipts) -->
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="stat glass">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
    <p class="mt-3 text-sm text-text-dim">
      All from the one prompt on Deskmind's card above — the AI support inbox that's live as our real support desk.
    </p>
  </section>
</template>

<style scoped>
.receipt {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.receipt-head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.receipt-title {
  font-weight: 900;
  letter-spacing: -0.01em;
}

.receipt-sub {
  color: var(--text-dim);
  font-size: 0.8rem;
}

.terminal {
  flex: 1;
  padding: 1.1rem 1.2rem;
  border-radius: 18px;
  border: 1px solid rgba(45, 212, 191, 0.18);
  background: #020617;
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.8;
  box-shadow: var(--glass-shadow);
  overflow-x: auto;
}

.term-cmd {
  color: #f8fafc;
  font-weight: 700;
}

.term-muted {
  color: #64748b;
}

.term-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  white-space: nowrap;
}

.term-ok {
  color: rgb(52 211 153);
  font-weight: 700;
}

.term-summary {
  margin-top: 0.35rem;
  color: #f8fafc;
  font-weight: 800;
}

.diff-line {
  white-space: nowrap;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.diff-line.patched {
  color: var(--await);
}

.diff-line.added {
  color: rgb(52 211 153);
}

.diff-line.unchanged {
  color: #64748b;
}

.diff-note {
  color: #64748b;
  font-size: 11px;
}

.diff-sep {
  margin-top: 0.4rem;
  color: #94a3b8;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.receipt-caption {
  color: var(--text-dim);
  font-size: 0.85rem;
}

.stat {
  padding: 1.25rem 1.4rem;
  border-radius: 18px;
}

.stat-value {
  font-size: 1.9rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: transparent;
  background-image: var(--grad-neon);
  -webkit-background-clip: text;
  background-clip: text;
}

.stat-label {
  margin-top: 0.25rem;
  color: var(--text-dim);
  font-size: 0.85rem;
  line-height: 1.4;
}
</style>
