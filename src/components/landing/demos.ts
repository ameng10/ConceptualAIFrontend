// Demo showcase data — single source of truth for the landing page's demo carousel.
// Prompts are copied VERBATIM from docs/DEMO_BUILD_PROMPTS.md (the exact text submitted
// to Create Project). Live URLs are filled in here (and only here) as each demo is
// deployed to Deno Deploy; `null` renders a "Launching soon" chip.

export interface DemoDiff {
  patched: string[]
  added: string[]
  unchangedCount: number
  unchangedSample: string[]
}

export interface DemoVariant {
  key: 'v1' | 'v2'
  label: string
  badges: string[]
  liveUrl: string | null
  image: string | null
}

export interface DemoRepos {
  /** GitHub URLs of the exported repos; null renders a disabled button until launch. */
  frontend: string | null
  backend: string | null
}

export interface DemoCardData {
  slug: string
  name: string
  tagline: string
  badges: string[]
  prompt: string
  iterationPrompt?: string
  tryList: string[]
  image: string | null
  liveUrl: string | null
  repos: DemoRepos
  testCard?: boolean
  supportHub?: boolean
  variants?: DemoVariant[]
  diff?: DemoDiff
}

export const DEMOS: DemoCardData[] = [
  {
    slug: 'deskmind',
    name: 'Deskmind',
    tagline:
      'An AI support inbox: automatic triage, draft replies grounded in your own help docs, and real two-way email — on a backend you own.',
    badges: ['AI triage & drafts', 'RAG over your docs', 'Two-way email', 'Operator admin', 'File uploads'],
    supportHub: true,
    image: '/demos/deskmind.png',
    liveUrl: 'https://deskmind.conceptual-ai.app',
    repos: {
      frontend: 'https://github.com/rdavislee/Deskmind-frontend',
      backend: 'https://github.com/rdavislee/Deskmind-backend',
    },
    tryList: [
      'Submit a real support request — this is ConceptualAI\'s actual support desk, so it reaches us',
      'Ask anything about ConceptualAI — answers are grounded in our help docs and arrive as a real email',
      'Come back later, look up your request by email (no account needed), and post a follow-up — it threads into the same conversation',
      'Behind the curtain, staff-side: AI classifies, prioritizes, extracts details, and drafts doc-grounded replies for our team',
    ],
    prompt: `Build an AI-powered customer support inbox for a small support team.

There are two kinds of people using the app. The support team's operator signs in with operator credentials configured in the environment — there is no operator signup page. Support agents register with email and password and have a profile with a name and an avatar image they can upload, but registering alone gives no access to the inbox: the operator must approve (promote) a registered account to agent before it can see or work on support requests, and the operator can revoke an agent's access later. There is also a public page where customers can submit a support request without logging in — they enter their email, a subject, a message, and can optionally attach a file or screenshot. After submitting, a customer can return to the public page and look up their own request(s) by entering the email address they used — no account needed — to see the current status and the full conversation, and to post a follow-up reply on their request (the follow-up is identified by that email).

When a new support request arrives, the system automatically uses AI to process it: it classifies the request into a category (Billing, Bug, Feature Request, or Other), assigns a priority (Low, Medium, High, or Urgent), extracts structured fields from the message into a side panel (order number, product name, customer sentiment, and the specific action the customer is requesting), and screens the message for abusive or threatening language, flagging it with a short written reason when it violates policy.

Logged-in agents see an inbox list of all requests sorted by priority, with the category and a flag indicator shown on each row. Clicking a request opens it to show the full message, any attachment, the AI-extracted fields, and the AI moderation verdict. Agents can write internal notes on a request that only other agents can see, and they can post a reply to the customer — and that reply is sent to the customer as a real email from the team's support email address. The customer's own replies (whether posted via the public lookup page or received by email) are threaded back into the same request so agents and the customer see one continuous conversation. There is an "AI draft reply" button that generates a suggested reply; the suggested reply must be grounded in help-center documents that agents upload (policy and FAQ documents), so answers are based on the team's real policies rather than guesses. Agents can edit a draft before sending and can mark a request as resolved.

Agents get a notification when a new High or Urgent request arrives.`,
  },
  {
    slug: 'atelier',
    name: 'Atelier',
    tagline:
      'A visual booking marketplace: photo listings, schedules that can’t double-book, and a natural-language booking assistant.',
    badges: ['AI booking assistant', 'Scheduling & reservations', 'Messaging', 'Reviews', 'Media'],
    image: null,
    liveUrl: null,
    repos: { frontend: null, backend: null },
    tryList: [
      'Scroll the photo grid and filter by category',
      'Type "find me a pottery class next Saturday morning" — the assistant finds and books a slot',
      'Booking opens a private message thread with the host',
      'Try to double-book a taken slot — the server refuses',
    ],
    prompt: `Build a visual marketplace for booking creative classes and studio sessions (for example pottery, photography, music, or cooking classes).

Users register with email and password, log in, and create a profile with a display name, a short bio, and an avatar image they can upload. Any user can act as a host or a guest.

Hosts create listings. A listing has a title, a description, a category, a location, a price, and one or more photos the host uploads. For each listing, the host publishes available time slots that guests can book.

Guests browse a visual grid of listings with their photos and can filter by category. Opening a listing shows its photos, details, available time slots, and reviews. A guest books an available time slot; the system must prevent two guests from booking the same slot. There is also a natural-language booking assistant: a guest can type a request like "find me a pottery class next Saturday morning" and the assistant finds matching listings and available slots and books one for them.

When a booking is made, a private message thread between the guest and the host is started for that booking, and that is where they arrange payment and any session specifics — the app itself does not process payments; the listing's price is what the host communicates and collects directly. After a session, a guest can leave a star rating and a written review on the listing. Users get a notification when they receive a new booking or a new message.

A host can delete one of their listings. When a listing is deleted, all of its time slots, bookings, reviews, and message threads connected to it are removed as well, leaving no orphaned data.`,
  },
  {
    slug: 'commons',
    name: 'Commons',
    tagline:
      'A paid community with Stripe supporter subscriptions — then one iteration adds AI moderation without touching the billing.',
    badges: ['Stripe subscriptions', 'Admin dashboard', 'Social feed', 'Media'],
    testCard: true,
    image: null,
    liveUrl: null,
    repos: { frontend: null, backend: null },
    variants: [
      {
        key: 'v1',
        label: 'v1',
        badges: ['Stripe subscriptions', 'Admin dashboard', 'Social feed', 'Media'],
        liveUrl: null,
        image: null,
      },
      {
        key: 'v2',
        label: 'v2 — after iteration',
        badges: ['Stripe subscriptions', 'Admin dashboard', 'Social feed', 'Media', 'AI moderation'],
        liveUrl: null,
        image: null,
      },
    ],
    diff: {
      patched: ['Posting', 'Commenting'],
      added: ['AIModeration'],
      unchangedCount: 9,
      unchangedSample: ['Subscribing', 'Liking', 'Following'],
    },
    tryList: [
      'Subscribe with the Stripe test card — a locked supporters-only post unlocks',
      'On v2, try posting abusive text — it’s blocked with a written reason',
      'Open the admin moderation queue: every flagged item with the AI’s rationale',
      'Compare v1 and v2 — the billing machinery is byte-for-byte identical',
    ],
    prompt: `Build an image-sharing community app with a paid supporter tier.

Users register with email and password, log in, and create a profile with a display name, a short bio, and an avatar image they can upload.

Users create posts that consist of an uploaded photo and a caption. There is a home feed that shows posts from the people the user follows, and a separate discover feed that shows recent posts from everyone. Users can like a post and leave comments on a post. Users can follow and unfollow other users. Opening a user's profile shows their posts, their follower count, and a follow button.

Users can become supporters by subscribing to a monthly supporter plan through a secure hosted checkout page. A user can mark any of their posts as supporters-only. Supporters-only posts are shown in full only to users with an active supporter subscription; everyone else sees a locked placeholder instead of the photo. A user can cancel their subscription from a billing page, and when the subscription ends their supporter access ends with it.

There is a site operator (admin) who signs in with operator credentials configured in the environment — there is no admin signup page. The admin has a dashboard that shows recent posts and members and lets the admin remove a post.

A user gets a notification when someone likes their post, comments on their post, or follows them.`,
    iterationPrompt: `Add AI moderation that screens every new post and every new comment before it becomes public. If the content violates community guidelines — harassment, hate, sexually explicit material, or spam — block it from the feeds and show the author a clear message explaining which rule it broke. Add a moderation queue page to the admin dashboard that lists every flagged item together with the AI's written rationale, and lets the admin approve an item back onto the feed or permanently remove it.`,
  },
  {
    slug: 'stride',
    name: 'Stride',
    tagline:
      'An AI training coach that shows its sources: web-research-grounded plans that adapt to your daily feedback.',
    badges: ['Live web research + citations', 'AI plan adjustments', 'Daily check-ins', 'Notifications'],
    image: '/demos/stride.png',
    liveUrl: 'https://stride.conceptual-ai.app',
    repos: {
      frontend: 'https://github.com/rdavislee/Stride-frontend',
      backend: 'https://github.com/rdavislee/Stride-backend',
    },
    tryList: [
      'Set a goal like "run a sub-20-minute 5K by October 1st" with your stats',
      'The calendar fills with a day-by-day plan — open a day to see the cited sources behind it',
      'Rate today’s workout "too easy" — future days adjust, past days never change',
    ],
    prompt: `Build an AI training coach app.

Users register with email and password, log in, and have a profile with a display name and an avatar image they can upload.

A user sets a training goal by telling the coach, in their own words, what they want to achieve, the date they want to achieve it by (for example "run a sub-20-minute 5K by October 1st"), and their athletic stats (for example age, weight, experience level, and recent performance numbers). A user can have only one active goal at a time; they can abandon their active goal, and only then set a new one.

When a goal is set, the AI builds a day-by-day workout plan running from today through the goal date, optimized toward the goal given the user's stats. The plan must be grounded in real research: the AI runs web research on the training approach for this kind of goal and attaches the cited sources it relied on, so the user can see the evidence behind the plan's structure and exercise choices.

The main view is a calendar showing each day's workout. Opening a day shows that workout's details — the exercises with sets and reps, or duration and intensity — plus the research-backed rationale and its cited sources.

After doing (or skipping) a day's workout, the user gives feedback on that day: a quick rating of how it went and an optional written note (for example "this was too easy" or "my knee hurt on the lunges"). The AI then adjusts the remaining future days of the plan based on the feedback — past days are never changed.

The user gets a notification when their plan is generated and whenever the plan is adjusted after feedback.`,
  },
  {
    slug: 'shopfront',
    name: 'Shopfront',
    tagline:
      'A real store: cart checkout with Stripe, inventory that can’t double-decrement, and confirmation emails sent exactly once.',
    badges: ['Stripe checkout', 'Order emails', 'Inventory integrity', 'Owner admin', 'Media'],
    testCard: true,
    image: '/demos/shopfront.png',
    liveUrl: 'https://shopfront.conceptual-ai.app',
    repos: {
      frontend: 'https://github.com/rdavislee/Shopfront-frontend',
      backend: 'https://github.com/rdavislee/Shopfront-backend',
    },
    tryList: [
      'Add 2 of an item with stock 3 to your cart and check out with the Stripe test card',
      'Stock drops to 1 and two confirmation emails go out — customer and owner',
      'Buy the last unit — the card grays out "Sold out"; the server enforces stock, not the page',
      'Replayed payment webhooks can’t decrement stock twice or double-send email',
    ],
    prompt: `Build an online store app for a single business.

The business owner signs in with operator credentials configured in the environment — there is no owner signup page. The owner manages the store's catalog: each item has a name, a description, a price, one or more photos the owner uploads, and a stock count. The owner can add stock to any item at any time.

Customers do not need an account. They browse a visual grid of the items with photos and prices. An item whose stock is zero is shown grayed out as sold out and cannot be purchased.

Customers add items to a cart, choosing a quantity for each, and check out the whole cart in one payment through a secure hosted checkout page. At checkout the customer provides their email address and their shipping address. Checkout must not go through for a quantity larger than an item's available stock, and sold-out items can't be checked out at all — the stock rules are enforced by the server, not just the page.

When an order's payment completes, exactly once: each purchased item's stock goes down by the quantity bought (an item that reaches zero becomes sold out), the order is recorded with its items, quantities, the customer's email, and the shipping address, and a confirmation email listing the order's contents and shipping address is sent from the store's own email address to both the customer and the business owner. A duplicate or replayed payment notification must not decrement stock twice or send the emails twice.

The owner has an orders page listing orders newest-first with their items, quantities, shipping details, and payment status, and gets a notification when a new order arrives.`,
  },
]

export const getDemo = (slug: string): DemoCardData | undefined =>
  DEMOS.find((d) => d.slug === slug)
