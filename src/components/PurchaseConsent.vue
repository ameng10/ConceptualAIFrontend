<script setup lang="ts">
/**
 * The withdrawal-right acknowledgement, collected on OUR page before any redirect.
 *
 * It cannot ride on Stripe's checkbox. Managed Payments rejects `custom_text` outright
 * ("You cannot use custom_text with Managed Payments") and the rejection fails the whole
 * session create, so a merchant-of-record checkout can only show Stripe's default terms
 * line. But Article 16(m) removes an EU/UK consumer's 14-day withdrawal right only where
 * the buyer expressly consented to immediate performance AND acknowledged losing that
 * right — and the CJEU reads the exception strictly, so it has to be on the face of what
 * is actually ticked. This is that tick.
 *
 * ONE component, used by every purchase entry point, because divergent wording across
 * buy surfaces is exactly the inconsistency a withdrawal claim is argued from.
 */
defineProps<{
  /** Tighter type for the refusal dialog, where vertical space is scarce. */
  compact?: boolean
}>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="consent" :class="{ compact }">
    <input v-model="model" type="checkbox" />
    <span>
      I request immediate access to my credits and agree to the
      <a href="/terms" target="_blank" rel="noopener">Terms of Service</a> and
      <a href="/refunds" target="_blank" rel="noopener">Billing &amp; Refund Policy</a>.
      I acknowledge that delivery begins immediately, that I therefore lose my right to
      withdraw from this purchase, and that credits are non-refundable once delivered.
    </span>
  </label>
</template>

<style scoped>
.consent {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  font-size: 0.875rem;
  line-height: 1.55;
  cursor: pointer;
  text-align: left;
}
.consent.compact {
  font-size: 0.8125rem;
  line-height: 1.5;
  gap: 0.625rem;
}
.consent input {
  flex: none;
  margin-top: 0.1875rem;
  width: 1.0625rem;
  height: 1.0625rem;
  accent-color: var(--primary);
  cursor: pointer;
}
.consent a {
  color: var(--primary);
}
</style>
