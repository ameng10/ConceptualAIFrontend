# Privacy Policy

**Last updated: August 8, 2026**

How **ConceptualAI, Inc.** ("we", "us") collects, uses, and shares information when you use the ConceptualAI service at [conceptual-ai.app](https://conceptual-ai.app). Privacy questions and requests: [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app).

Related: [Terms of Service](./terms-of-service.md) · [Billing & Refund Policy](./billing-and-credits.md)

## 1. Information we collect

- **Account information.** Your email address and a password (stored as a salted hash), or — if you sign in with GitHub or Google — the name, email address, and avatar those providers share with us. We never see your GitHub or Google password.
- **Content you submit.** App descriptions and prompts, plan and design feedback, project names, and the applications the service generates for you (code, tests, documentation, previews).
- **Connected accounts.** If you connect GitHub to export your generated repositories, we store an access token for that connection, server-side. You can revoke it at any time from your GitHub account settings.
- **Support communications.** Messages, email addresses, and attachments you submit to our support desk, and posts you make to the public bug-report feed.
- **Technical data.** Standard server logs: IP address, browser user agent, request timestamps, and error diagnostics.
- **Usage records.** Which pipeline stages ran for your builds and how much model usage they consumed. We use this to measure and improve the cost and reliability of the service.
- **Cookies and local storage.** Used for signing you in (session tokens) and for preferences such as your theme. We do not use advertising or cross-site tracking cookies.

## 2. How we use information

- To provide and operate the service — including sending your prompts and project context to third-party AI model providers to generate your application.
- To respond to support requests.
- To secure the service, prevent abuse, and enforce our [Terms of Service](./terms-of-service.md).
- To understand usage and improve the service.

We do not sell personal information, and we do not share it with third parties for their advertising.

## 3. Service providers

We share data with providers only as needed to run the service:

- **AI model providers** — process your prompts and project context to generate plans, code, and tests.
- **Cloud infrastructure** — database hosting (MongoDB Atlas), application hosting (Deno Deploy), and isolated build sandboxes (Modal).
- **Email delivery providers** — send transactional and support email.
- **Stripe** — processes payments and acts as the **merchant of record** for paid features. Card details go directly to Stripe; we never see or store card numbers. Stripe receives your email address and billing details to process the payment and to meet its own tax and compliance obligations.

## 4. Your generated app's own data

This policy covers **our** service. It does not cover applications you generate and deploy.

Once you deploy a generated app, its database, its users' data, and any outside services it connects to are yours. You are the controller of that data, and you are responsible for its privacy policy, its security, and its compliance obligations. We have no access to it.

## 5. Isolated builds

Builds run in isolated sandboxes. Your app's code is generated and tested there, and the sandbox is destroyed when the build finishes.

Sandboxes and previews do not receive your live third-party credentials. Outside integrations run against built-in mocks during generation and preview, so a build cannot send email, charge a card, or post to a channel on your behalf. See [Integrations](./integrations.md).

## 6. Retention and deletion

Account data is kept while your account is active. Projects and generated applications are kept until you delete them or your account. Server logs are kept for a limited period for security and debugging. To delete your account and associated data, email [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app) from your account's email address.

**Payment records are an exception.** Records of what was paid, when and for what are retained after account deletion, because we are required to keep them and because they are what a refund or chargeback is reconciled against. They are retained only for accounting and payment-dispute purposes and are not used to contact you or to build a profile.

## 7. Security

Traffic is encrypted in transit (TLS). Passwords are stored as salted hashes. Secrets and credentials are kept in server-side configuration, never in the browser. No method of storage or transmission is 100% secure, so we cannot guarantee absolute security — please avoid submitting highly sensitive or regulated data.

## 8. Your rights

Depending on where you live, you may have rights to access, correct, export, or delete your personal information, or to object to certain processing. To exercise any of these rights, email [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app); we will respond within the timeframe required by applicable law.

## 9. Children

The service is not directed to children under 13 (or the equivalent minimum age in your jurisdiction), and we do not knowingly collect their data.

## 10. Changes to this policy

We may update this policy over time. We will post the updated version here with a new "last updated" date; material changes may also be announced in the product.

## 11. Contact

ConceptualAI, Inc. · [admin@conceptual-ai.app](mailto:admin@conceptual-ai.app)

© 2026 ConceptualAI, Inc.
