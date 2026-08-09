# Billing & Refund Policy

**Last updated: August 8, 2026**

How pricing, credits, and refunds work for the ConceptualAI service at [conceptual-ai.app](https://conceptual-ai.app), operated by **ConceptualAI, Inc.** Questions: [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app).

Related: [Terms of Service](./terms-of-service.md) · [Privacy Policy](./privacy-policy.md)

## 1. During beta, the service is free

ConceptualAI is free during beta. No charges are made and no payment method is required. You will still see a **credit quote** on the review screen before each build — during beta it is an estimate of what the build would cost, shown so the pricing is never a surprise later. Nothing is deducted and nothing is billed.

Everything below describes how billing works once credits launch. It takes effect only when charging is switched on, and we will say so on this page before it does.

## 2. You see the price before anything runs

Every build is quoted in credits from your approved plan, before it runs. The quote appears on the same screen as the plan and the concept design, and the build does not start until you approve all three together.

You are never charged for work you did not approve at a price you did not see. An iteration is quoted the same way, priced from the new operations it adds rather than from the whole app.

## 3. What a credit buys

A credit buys a **delivered output**: a complete generated application — backend, frontend, test suite, OpenAPI specification, and documentation — that you can download or export to GitHub.

A build is priced from the size of the approved design, measured in the actions and queries of the concepts it contains. Bigger apps cost more because they take more work to generate, test, and assemble.

## 4. Approving a build charges it

Credits are deducted when you approve the plan — that is the moment you accept the quote, and it is the only moment a build is charged. Everything the build does afterwards (implementation, sync generation, assembly, packaging) is covered by that single charge. There is no second charge for a later stage.

**A run that has started is charged, including one you cancel or delete part-way through.** By then the work has been done and paid for on our side.

**Credits are never restored.** If a build does not deliver, the remedy is a free re-run — see section 5 — not a credit back.

## 5. We guarantee delivery, not perfection

This is the part worth reading closely.

**We guarantee that an approved build delivers an output.** If it does not, we re-run it at no charge: re-approving the same design does not deduct credits again. That free re-run is the guarantee, and it is the sole remedy for non-delivery. Re-running is automatic — you will not be charged twice for the same approved design, whether the retry is ours or yours.

If you change the design and approve it again, that is a different build at a new quote, and it is charged.

**We do not guarantee that the output is free of bugs, and we are not liable for the bugs it contains.** Generated code is written by AI. It can contain defects, security weaknesses, missing features, or behavior that differs from what you intended. Reviewing, testing, and fixing it is your responsibility. See [Terms of Service, sections 3 and 4](./terms-of-service.md).

A delivered application that contains bugs **is a delivered output**. It is not a failed build, and it is not refundable.

## 6. No refunds

Purchases are final. We do not refund credits or subscription charges, including for:

- Bugs, errors, or omissions in a delivered output
- Output that does not match what you expected or intended
- A change of mind, or a decision not to use a delivered application
- Dissatisfaction with the quality, structure, or design of generated code
- Unused credits, once purchased
- A build you cancelled, deleted, or abandoned after approving it

The single exception is section 5: a build that fails to deliver is re-run at no charge.

If a payment is reversed — a refund we issue, or a chargeback your bank raises — we remove the corresponding credits from your balance, and we may place the account on hold until the matter is resolved.

## 7. How long credits last

Credits have two different lifetimes, and the difference matters.

- **Plan credits** are the monthly allowance included with a subscription. They **do not roll over**. Each payment resets the allowance for that period, and whatever is unused expires at the end of it.
- **Purchased credits** are credits you buy outright. They last **12 months from your most recent payment**, and any payment — a credit purchase or a subscription renewal — extends that window. An active customer does not lose purchased credits.

Builds spend the plan allowance first, so the credits that expire soonest are used first.

Credits are a claim on future compute at today's price. They are not money, they have no cash value, and they cannot be transferred between accounts or withdrawn.

## 8. Plan limits

Each plan sets two limits, both shown on the pricing page:

- **A maximum app size**, expressed in credits. If a design quotes above your plan's limit, the build is refused and you are told which plan would fit it. Buying more credits does not lift this limit — it is what the subscription buys.
- **A weekly planning limit.** Creating a plan, modifying one, answering its questions, and iterating on a finished app each count as one planning turn against a rolling seven-day window.

Iterating on an app your plan can already hold is not limited by size — only the planning turns are counted.

## 9. Subscriptions

- You can cancel a subscription at any time from your billing page or by emailing us.
- Cancellation takes effect at the end of the current billing period. You keep access until then.
- **The plan allowance for that period expires with it**, as it does at the end of every period. Purchased credits are unaffected and keep their own 12-month window.
- We do not charge again after cancellation. Partial-period refunds are not provided.
- If a renewal payment fails, we keep your plan's app-size limit for a short grace period while the payment is retried. The allowance itself is not extended.

## 10. Third-party costs are separate

Credits cover generating your app. They do not cover what your app costs to **run**.

Once you deploy, you pay your own providers directly — database hosting, application hosting, and any outside integrations your app uses, including AI provider keys. Those bills come from those providers, not from us, and we are never liable for them. See [Integrations](./integrations.md) for which services your app might need and what their free tiers look like.

## 11. Payment processing and who you are buying from

Payments are processed by **Stripe**, which acts as the **merchant of record** for this service. That means Stripe is the seller of record on your purchase, handles sales tax and VAT where they apply, and appears on your statement and your receipt. Card details go directly to Stripe; we never see or store card numbers.

Because Stripe is the merchant of record, Stripe may issue a refund on a purchase under its own policies, including without our prior approval. Where that happens we remove the corresponding credits, as described in section 6.

## 12. Account deletion and what we keep

To delete your account, email [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app) from your account's email address. We delete your account, your projects and their generated artifacts, your credit balance, and your plan.

**Records of payments are retained.** We keep the record of what was paid, when, and for what, because we are required to and because it is what a refund or chargeback is reconciled against. Deleting your account does not delete that record and does not refund anything.

Cancel any active subscription before requesting deletion, or tell us to cancel it — we cancel at Stripe as the first step of deletion so that a deleted account is never billed again.

## 13. Statutory rights

Nothing in this policy limits any refund or cancellation rights you have under the consumer-protection laws of your place of residence.

## 14. Questions

Email [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app) from your account's email address. We respond within 5 business days.

© 2026 ConceptualAI, Inc.
