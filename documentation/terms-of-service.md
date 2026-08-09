# Terms of Service

**Last updated: August 8, 2026**

The ConceptualAI service at [conceptual-ai.app](https://conceptual-ai.app) (the "service") is operated by **ConceptualAI, Inc.** ("we", "us"). These terms set the conditions for using the service. Questions: [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app).

Related: [Privacy Policy](./privacy-policy.md) · [Billing & Refund Policy](./billing-and-credits.md)

## 1. Acceptance of terms

By using the service, you agree to these Terms of Service. If you do not agree, do not use the service.

## 2. The service

The service generates complete web applications from descriptions you write. A run produces a backend, a frontend, a test suite, an OpenAPI specification, and documentation, which you can download or export to your own GitHub repositories.

- The AI used to **generate** apps is provided by us. You do not supply an AI key to build an app.
- The service is sold in credits, through monthly plans and outright credit purchases. See the [Billing & Refund Policy](./billing-and-credits.md).
- **Subscriptions renew automatically** at the same price on the same day each month until cancelled. You may cancel at any time from your billing page or by emailing us; cancellation takes effect at the end of the current billing period.
- Third-party providers may separately apply their own terms, pricing, usage limits, and acceptable-use rules to any keys or services you use in your own generated app.

## 3. What we guarantee

**We guarantee delivery of an output.** When you approve a build, we guarantee that the run delivers a complete generated application to you — backend source, frontend source, a test suite, an OpenAPI specification, and generated documentation — available as a download and as a GitHub export.

That deliverable is what the service promises. If a run does not deliver it, that is our failure, and our obligation is to **re-run the build at no charge to you**: re-approving the same design does not deduct credits again. **That free re-run is your sole and exclusive remedy for non-delivery.** Credits are not restored, and no refund is due.

## 4. What we do not guarantee

**We do not guarantee that the output is free of defects, and we are not liable for defects in it.**

Generated applications are written by AI. They may contain bugs, logic errors, security weaknesses, incomplete or missing features, inefficient implementations, inaccessible interfaces, or behavior that differs from what you intended or described. Specifically, we do not warrant that output will be:

- Correct, or free of bugs
- Complete, or a faithful implementation of your description
- Secure, or free of vulnerabilities
- Performant, scalable, or efficient
- Compliant with any law, regulation, standard, or third-party policy
- Fit for any particular purpose
- Free of third-party claims, including intellectual-property claims

Output is delivered **as-is**. Reviewing, testing, correcting, securing, and validating it before any real-world use is entirely your responsibility.

**A delivered output that contains bugs is not a delivery failure.** Defects in a delivered application are within the expected behavior of the service, are not grounds for a refund or credit, and do not entitle you to any remedy under section 3.

## 5. No refunds

Purchases are final. We do not provide refunds, whether for credits, subscriptions, or any other charge, including for:

- Bugs, errors, or omissions in a delivered output
- Output that does not match what you expected or intended
- A change of mind, or a decision not to use a delivered application
- Dissatisfaction with the quality, structure, or design of generated code
- Unused credits, once purchased
- A build you cancelled, deleted, or abandoned after approving it

The only exception is section 3: if we fail to deliver an output for an approved build, we re-run it at no charge.

Credits are deducted when you approve a build, and **a run that has started is charged**, including one you cancel, delete, or abandon part-way through. Credits are not money, have no cash value, and cannot be transferred or withdrawn. Plan credits do not roll over and expire at the end of each billing period; purchased credits expire 12 months after your most recent payment.

Payments are processed by Stripe acting as **merchant of record**, which means Stripe is the seller of record on your purchase and may issue a refund under its own policies, including without our prior approval. Where a payment is reversed by refund or chargeback, we remove the corresponding credits and may place the account on hold until the matter is resolved.

Nothing in this section limits any refund or cancellation rights you have under the consumer-protection laws of your place of residence. Full details: [Billing & Refund Policy](./billing-and-credits.md).

## 6. Ownership of output

You own the applications the service generates for you. We claim no ownership of your prompts, your project descriptions, or the code, tests, and documentation produced for you, and you may use, modify, publish, distribute, and sell them freely.

Two limits apply:

- Generated applications incorporate components from our concept library and third-party open-source packages, which remain licensed under their own terms. Those licenses travel with the code.
- Similar prompts can produce similar output for different users. Your ownership of your output does not give you rights against another user's output, and we may continue to serve any other user.

## 7. Your account

You must provide accurate account information, keep your credentials secure, and be old enough to form a binding contract where you live. You are responsible for everything done under your account. You may close your account at any time by emailing [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app) from your account's email address; cancel any active subscription first, or ask us to cancel it as part of closing the account.

Closing your account deletes your projects, their generated artifacts, your credit balance and your plan. It does not refund anything, and **records of payments are retained** — we keep the record of what was paid, when and for what, because we are required to and because it is what a refund or chargeback is reconciled against.

One account per person or organisation. Creating additional accounts to obtain repeated free allowances is a breach of section 11.

## 8. Keys you supply for your generated apps

Your generated app may integrate outside services — AI providers, payment processing, email, storage, and others — using API keys **you** supply when you run or deploy it. For any such key, you are responsible for:

- Providing a valid API key you are authorized to use
- Securing your key and your provider account
- Monitoring usage, limits, and billing in your provider dashboard
- Revoking or rotating your key if you believe it has been exposed

Keys you supply for your own app are never sent to us. They live in your app's environment, on infrastructure you control.

## 9. Third-party costs

You are solely responsible for all third-party API charges, usage fees, overages, hosting costs, and related expenses incurred through any provider key or account you supply for your own generated apps. This applies regardless of:

- What inputs your app submits
- What outputs are returned
- Whether the output is useful, incorrect, incomplete, harmful, repetitive, or unexpected
- Whether requests are large, frequent, automated, mistaken, or triggered by generated code using your key

We are never liable for third-party costs incurred on a key or account you supply.

## 10. Prompts and inputs

You understand and agree that:

- You provide prompts, descriptions, and feedback to the service
- We send those inputs to third-party AI providers to fulfill your requests
- AI output is probabilistic and may be wrong, incomplete, misleading, offensive, or otherwise unsuitable

Any decision to rely on, publish, ship, deploy, distribute, or commercialize output is solely your responsibility.

## 11. Acceptable use

You agree not to use the service:

- In violation of law, regulation, or third-party rights
- To abuse, probe, overload, or disrupt the service
- To submit malicious content, malware, or attempts to bypass security controls
- To use keys, accounts, or data you do not have permission to use
- To build or operate harmful, deceptive, or unlawful systems

## 12. Service availability

The service is provided on an as-is and as-available basis. We do not guarantee uptime, availability, throughput, persistence of any in-progress work, or compatibility with every provider, key, model, or generated app. We may change, limit, suspend, or discontinue the service at any time.

Previews are temporary testing environments, not hosting. They expire automatically and are not a place to run anything real.

## 13. Abuse prevention and suspension

We may rate-limit, restrict, suspend, or terminate access if we believe use is abusive, risky, unlawful, or harmful to the service or other users.

## 14. Third-party services

The service depends on third-party providers, infrastructure, model APIs, hosting, databases, and software packages. We are not responsible for third-party outages, pricing changes, policy changes, model behavior, data handling, or billing.

## 15. Data and privacy

Our [Privacy Policy](./privacy-policy.md) describes what we collect and how we use it. You should not submit highly sensitive, regulated, or confidential material unless you have independently determined that doing so is appropriate for your own risk tolerance and obligations.

You are responsible for your own compliance obligations relating to data, privacy, intellectual property, employment, healthcare, finance, education, export controls, and any other regulated context.

## 16. Limitation of liability

To the maximum extent permitted by law, ConceptualAI, Inc. and its officers, employees, and suppliers are not liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill, or business opportunity arising from or related to use of the service. This includes, without limitation, claims arising from:

- Bugs, defects, vulnerabilities, or unexpected behavior in generated output
- Your reliance on, or interpretation of, generated output
- Actions taken or not taken based on generated output
- Distribution, publication, deployment, or commercialization of generated output

To the maximum extent permitted by law, our total liability for all claims relating to the service is limited to the greater of (a) the amount you paid us in the three months before the claim arose, or (b) one hundred U.S. dollars.

## 17. Indemnity

You agree to defend, indemnify, and hold harmless ConceptualAI, Inc. from claims, damages, losses, liabilities, costs, and expenses arising out of your use of the service, your prompts, data, or API keys, your use of generated output, or your violation of these terms or any third-party rules.

## 18. Governing law

These terms are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-laws rules. Any dispute will be brought in the state or federal courts located in Delaware, and you consent to their jurisdiction.

## 18a. Changes to prices

We may change plan prices or the price of credits. Any change takes effect on your next renewal, and we will give you at least 30 days' notice by email before it does. You may cancel before the new price applies. Credits you have already bought are unaffected.

## 19. Changes to these terms

These terms may be updated over time. We will post the updated version with a new "last updated" date. Your continued use of the service after changes means you accept the updated terms.

## 20. Contact

Questions about these terms: [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app). If you have questions about how these terms apply to you, we encourage you to consult your own legal counsel.

© 2026 ConceptualAI, Inc.
