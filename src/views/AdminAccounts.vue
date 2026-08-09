<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { AlertTriangle, Gift, Loader2, Trash2 } from 'lucide-vue-next'
import { adminApi } from '../services/admin-api'

/**
 * Operator account tools: comp an account, or delete one.
 *
 * Every action here re-gates on the server (`/admin/*` resolves the session and checks
 * admin membership); this screen is a convenience, never the authorization.
 */
const TIERS = ['free', 'starter', 'studio', 'pro', 'unlimited']

// ── comp ────────────────────────────────────────────────────────────────────
const compEmail = ref('')
const compCredits = ref(50)
const compTier = ref('unlimited')
const compBusy = ref(false)
const compResult = ref<{ ok: boolean; message: string } | null>(null)

/**
 * Minted when the FORM OPENS and reused across retries — that is the whole point.
 * A key minted per click makes a double-click two comps; a key derived from the email
 * and the date makes a legitimate second comp on the same day a silent no-op.
 */
const idempotencyKey = ref('')
function newKey() {
  idempotencyKey.value = `admin-comp-${crypto.randomUUID()}`
}
onMounted(newKey)

async function submitComp() {
  if (compBusy.value) return
  compBusy.value = true
  compResult.value = null
  try {
    await adminApi.comp({
      email: compEmail.value.trim().toLowerCase(),
      credits: compCredits.value,
      tier: compTier.value,
      idempotencyKey: idempotencyKey.value,
    })
    compResult.value = {
      ok: true,
      message: `Comped ${compCredits.value} credits and ${compTier.value} to ${compEmail.value}.`,
    }
    // A NEW key for the next comp — reusing this one would no-op silently.
    newKey()
    compEmail.value = ''
  } catch (e) {
    compResult.value = { ok: false, message: e instanceof Error ? e.message : String(e) }
  } finally {
    compBusy.value = false
  }
}

// ── delete ──────────────────────────────────────────────────────────────────
const deleteEmail = ref('')
const confirmEmail = ref('')
const deleteBusy = ref(false)
const deleteResult = ref<{ ok: boolean; message: string } | null>(null)

async function submitDelete() {
  if (deleteBusy.value) return
  // Typed confirmation: this cancels their subscription immediately and destroys every
  // project. Nothing here is recoverable.
  if (confirmEmail.value.trim().toLowerCase() !== deleteEmail.value.trim().toLowerCase()) {
    deleteResult.value = { ok: false, message: 'Confirmation email does not match.' }
    return
  }
  deleteBusy.value = true
  deleteResult.value = null
  try {
    await adminApi.deleteUser(deleteEmail.value.trim().toLowerCase())
    deleteResult.value = { ok: true, message: `Deleted ${deleteEmail.value}.` }
    deleteEmail.value = ''
    confirmEmail.value = ''
  } catch (e) {
    deleteResult.value = { ok: false, message: e instanceof Error ? e.message : String(e) }
  } finally {
    deleteBusy.value = false
  }
}
</script>

<template>
  <div class="admin-accounts">
    <header class="page-head">
      <h1>Accounts</h1>
      <p class="lede">Operator tools. Every action re-authorizes on the server.</p>
    </header>

    <section class="card glass">
      <h2><Gift :size="17" /> Comp an account</h2>
      <p class="hint">
        Grants credits and a tier override. The credits appear in the normal ledger, so
        the usage stays visible in COGS reporting — there is deliberately no
        skip-billing flag anywhere in the product.
      </p>

      <div class="grid">
        <label>
          <span>Email</span>
          <input v-model="compEmail" type="email" placeholder="user@example.com" autocomplete="off" />
        </label>
        <label>
          <span>Credits</span>
          <input v-model.number="compCredits" type="number" min="1" />
        </label>
        <label>
          <span>Tier</span>
          <select v-model="compTier">
            <option v-for="t in TIERS" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
      </div>

      <p class="key">
        Idempotency key <code>{{ idempotencyKey.slice(0, 22) }}…</code>
        <button class="link-btn" type="button" @click="newKey">new key</button>
      </p>
      <p class="hint subtle">
        Retrying this form reuses the key, so a double-submit comps once. Click
        <em>new key</em> only when you genuinely mean a second, separate comp.
      </p>

      <button class="btn btn-primary" :disabled="compBusy || !compEmail" @click="submitComp">
        <Loader2 v-if="compBusy" :size="16" class="spin" />
        <span>Comp account</span>
      </button>

      <p v-if="compResult" class="result" :class="{ bad: !compResult.ok }">
        {{ compResult.message }}
      </p>
    </section>

    <section class="card glass danger">
      <h2><Trash2 :size="17" /> Delete an account</h2>
      <p class="hint">
        Cancels the Stripe subscription first, then deletes projects, artifacts,
        credits, plan and identity. Payment records are retained — they are what a
        refund or chargeback is reconciled against.
      </p>
      <p class="warn">
        <AlertTriangle :size="15" />
        The Stripe cancellation is <strong>immediate</strong>, not end-of-period. The
        customer forfeits the remainder of a period they have paid for. None of this is
        reversible.
      </p>

      <div class="grid">
        <label>
          <span>Email</span>
          <input v-model="deleteEmail" type="email" placeholder="user@example.com" autocomplete="off" />
        </label>
        <label>
          <span>Type the email again to confirm</span>
          <input v-model="confirmEmail" type="email" placeholder="user@example.com" autocomplete="off" />
        </label>
      </div>

      <button
        class="btn btn-danger"
        :disabled="deleteBusy || !deleteEmail || !confirmEmail"
        @click="submitDelete"
      >
        <Loader2 v-if="deleteBusy" :size="16" class="spin" />
        <span>Delete account permanently</span>
      </button>

      <p v-if="deleteResult" class="result" :class="{ bad: !deleteResult.ok }">
        {{ deleteResult.message }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.admin-accounts { max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
.page-head h1 { margin: 0; font-size: 1.75rem; font-weight: 900; letter-spacing: -0.02em; }
.lede { margin: 0.5rem 0 1.5rem; color: var(--text-dim); font-size: 0.875rem; }

.card { display: grid; gap: 0.875rem; padding: 1.5rem; margin-bottom: 1.25rem; }
.card.danger { border-color: color-mix(in srgb, var(--error) 35%, transparent); }
.card h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}
.hint { margin: 0; font-size: 0.8125rem; line-height: 1.55; color: var(--text-dim); }
.hint.subtle { font-size: 0.75rem; }

.warn {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0;
  padding: 0.75rem;
  border-radius: 0.625rem;
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text);
}
.warn svg { flex: none; margin-top: 0.125rem; color: var(--error); }

.grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); }
label { display: grid; gap: 0.3125rem; font-size: 0.78125rem; color: var(--text-dim); }
input, select {
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text);
  font-size: 0.9375rem;
}

.key { margin: 0; font-size: 0.78125rem; color: var(--text-dim); }
.key code { font-size: 0.75rem; }
.link-btn {
  margin-left: 0.5rem;
  border: none;
  background: none;
  color: var(--primary);
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
}

.btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 2.75rem; }
.btn-danger {
  background: var(--error);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-weight: 800;
  cursor: pointer;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.result {
  margin: 0;
  padding: 0.625rem 0.75rem;
  border-radius: 0.625rem;
  font-size: 0.8125rem;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 32%, transparent);
}
.result.bad {
  background: color-mix(in srgb, var(--error) 12%, transparent);
  border-color: color-mix(in srgb, var(--error) 35%, transparent);
  color: var(--error);
}

.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
