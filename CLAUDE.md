# CLAUDE.md - Easy Pass Codebase Guide

## Project Overview

**Easy Pass** (MyEasyPass) is a bilingual (English/Spanish) exam preparation web application for Texas licensing exams. It provides timed practice sessions with immediate scoring and feedback for four exam categories:
- Real Estate
- Property & Casualty Insurance
- Life Insurance
- General Lines Insurance

The platform operates on a subscription-based model with category-specific pricing integrated through Stripe. Deployed at `myeasypass.net` and `easy-pass-ht1x.onrender.com`.

## Tech Stack

### Frontend
- **Framework**: React 18.3.1 (TypeScript)
- **Build Tool**: Vite 7.3.0
- **Routing**: Wouter 3.3.5
- **State Management**: TanStack React Query 5.60.5
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4.17 with CSS custom properties
- **Animations**: Framer Motion 11.x
- **i18n**: i18next 25.x + react-i18next (EN/ES support)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts 2.x

### Backend
- **Runtime**: Node.js 20.x with TypeScript (ESM)
- **Framework**: Express.js 4.22.x
- **ORM**: Drizzle ORM 0.39.3 (PostgreSQL)
- **Authentication**: Custom email/password with bcryptjs, express-session
- **Session Store**: PostgreSQL (connect-pg-simple), 1-week TTL
- **Payments**: Stripe 20.0.0 + stripe-replit-sync (managed webhooks)
- **Email**: Resend 4.0.0 (via `RESEND_API_KEY` env var)
- **Security**: Helmet (CSP, HSTS), express-rate-limit, CORS, HTML sanitization

### Database
- **Primary**: PostgreSQL 16.x
- **Session Store**: PostgreSQL (`sessions` table)

## Directory Structure

```
/home/user/Easy-Pass/
├── client/                          # React frontend
│   ├── src/
│   │   ├── App.tsx                  # Router + providers setup
│   │   ├── pages/                   # 16 page components
│   │   │   ├── landing.tsx          # Public landing/marketing page
│   │   │   ├── auth.tsx             # Login + signup combined
│   │   │   ├── dashboard.tsx        # Main user dashboard
│   │   │   ├── exams.tsx            # Exam taking interface
│   │   │   ├── study-guide.tsx      # Topic-based study mode
│   │   │   ├── pricing.tsx          # Subscription pricing
│   │   │   ├── profile.tsx          # User profile + subscription mgmt
│   │   │   ├── admin.tsx            # Admin panel
│   │   │   ├── certificate.tsx      # Public certificate view
│   │   │   ├── schedule-exam.tsx    # Schedule exam callback form
│   │   │   ├── forgot-password.tsx  # Forgot password form
│   │   │   ├── reset-password.tsx   # Reset password form
│   │   │   ├── faq.tsx              # FAQ page
│   │   │   ├── terms.tsx            # Terms of service
│   │   │   ├── privacy.tsx          # Privacy policy
│   │   │   └── not-found.tsx        # 404 page
│   │   ├── components/              # Reusable UI components
│   │   │   ├── theme-provider.tsx   # Dark/light theme context
│   │   │   └── ui/                  # shadcn/ui components (Radix)
│   │   ├── hooks/
│   │   │   ├── use-auth.ts          # Auth state (TanStack Query)
│   │   │   └── use-toast.ts         # Toast notifications
│   │   └── lib/
│   │       ├── queryClient.ts       # TanStack Query client config
│   │       └── i18n.ts              # i18next initialization
│   └── index.html
├── server/                          # Express backend
│   ├── index.ts                     # Server entry: middleware, startup
│   ├── routes.ts                    # 50+ API endpoints
│   ├── storage.ts                   # Data access layer (IStorage + DatabaseStorage)
│   ├── db.ts                        # Drizzle ORM + pg pool init
│   ├── simpleAuth.ts                # Auth setup + isAuthenticated middleware
│   ├── subscriptionCheck.ts         # Subscription validation logic
│   ├── examScoring.ts               # Score calculation utilities
│   ├── webhookHandlers.ts           # Stripe webhook processing
│   ├── stripeClient.ts              # Cached Stripe client + StripeSync
│   ├── stripeHelpers.ts             # mapStripeStatus, getPlanFromSubscription
│   ├── initializeStripePrices.ts    # Auto-create Stripe products/prices
│   ├── resendClient.ts              # Email client + sendPasswordResetEmail
│   ├── rateLimit.ts                 # In-memory rate limiter + getClientIp
│   ├── sanitize.ts                  # HTML entity encoding utilities
│   ├── static.ts                    # Production static file serving
│   ├── vite.ts                      # Vite dev server integration
│   ├── seed-*.ts                    # One-time DB seeding scripts (do not run in production)
│   └── __tests__/                   # Unit tests (Vitest, 7 test files)
│       ├── examScoring.test.ts
│       ├── sanitize.test.ts
│       ├── studyTopics.test.ts
│       ├── rateLimit.test.ts
│       ├── webhookHandlers.test.ts
│       ├── subscriptionCheck.test.ts
│       └── webhookHelpers.test.ts
├── shared/                          # Code shared between client and server
│   ├── schema.ts                    # Drizzle schema (11 tables) + Zod insert schemas + types
│   ├── models/
│   │   └── auth.ts                  # users + sessions tables
│   └── studyTopics.ts               # Study guide topic config
├── tests/                           # E2E tests (Playwright)
│   ├── api.spec.ts
│   ├── auth-guards.spec.ts
│   ├── browser.spec.ts
│   ├── password-reset.spec.ts
│   ├── public-endpoints.spec.ts
│   └── registration-subscription.spec.ts
├── drizzle.config.ts
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── playwright.config.ts
└── package.json
```

## Development Commands

```bash
npm run dev          # Start dev server (port 5000, uses tsx + Vite HMR)
npm run build        # Build for production (script/build.ts)
npm run start        # Run production server (NODE_ENV=production)
npm run check        # TypeScript type checking
npm run test         # Run unit tests (Vitest, non-watch)
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run E2E tests (Playwright)
npm run db:push      # Apply Drizzle schema changes to database
```

## Database Schema

All tables defined in `shared/schema.ts` (imports from `shared/models/auth.ts`).

### Core Tables

| Table | File | Purpose |
|-------|------|---------|
| `users` | `models/auth.ts` | Auth: email, bcrypt password, reset token, names |
| `sessions` | `models/auth.ts` | Express-session store (do not drop) |
| `user_profiles` | `schema.ts` | Subscription info, Stripe IDs, language preference, role |
| `questions` | `schema.ts` | Bilingual exam questions with options + explanations |
| `exam_sessions` | `schema.ts` | In-progress exams (question IDs, answers, time limit) |
| `exam_results` | `schema.ts` | Completed exam scores (score, passed, timeTaken) |
| `exam_certificates` | `schema.ts` | Passing certificates with public shareable slug |
| `study_progress` | `schema.ts` | Per-topic study progress (questions answered, correct) |
| `question_feedback` | `schema.ts` | User-reported question issues |
| `payment_history` | `schema.ts` | Stripe payment records |
| `subscriptions` | `schema.ts` | Stripe subscription sync (via stripe-replit-sync) |
| `callback_requests` | `schema.ts` | Schedule-exam callback form submissions |
| `guest_articles` | `schema.ts` | Guest blog article submission requests |

### Key Enums

```typescript
type ExamCategory = "real_estate" | "property_casualty" | "life_insurance" | "general_lines";
type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";
type SubscriptionPlan = "weekly" | "monthly";
type SubscriptionType = "single" | "bundle";
type UserRole = "user" | "admin";
type Language = "en" | "es";
type FeedbackType = "error" | "unclear" | "wrong_answer" | "translation" | "suggestion" | "other";
type FeedbackStatus = "pending" | "reviewed" | "resolved" | "dismissed";
type GuestArticleStatus = "pending" | "approved" | "rejected";
```

## API Reference

All routes defined in `server/routes.ts` and `server/simpleAuth.ts`.

### Authentication (simpleAuth.ts)
- `POST /api/register` - Create account (email, password, firstName, lastName)
- `POST /api/login` - Login (rate-limited: 5/15min per IP+email)
- `GET /api/logout` - Logout + redirect to `/`
- `POST /api/logout` - Logout + return JSON
- `GET /api/auth/user` - Get current user (returns 401 if unauthenticated)

### Profile (Auth Required)
- `GET /api/profile` - Get user profile (creates if missing)
- `PATCH /api/profile` - Update phone + preferredLanguage

### Exams (Auth + Subscription Required)
- `POST /api/exams/start` - Start exam `{ category, mode: "practice"|"full" }`
  - practice: 50 questions, 90 min (5400s)
  - full: 150 questions, 120 min (7200s)
- `POST /api/exams/:sessionId/submit` - Submit answers `{ answers: { questionId: answerIndex } }`
- `DELETE /api/exams/:sessionId/cancel` - Cancel in-progress exam

### Results & Certificates (Auth Required)
- `GET /api/results` - Get user's exam results
- `POST /api/results/:resultId/certificate` - Generate certificate for passed exam
- `GET /api/certificates` - Get user's certificates
- `GET /api/certificates/public/:slug` - Public certificate lookup (no auth)

### Study Guide (Auth + Subscription Required)
- `GET /api/study-guide/topics` - All topics config (public)
- `GET /api/study-guide/topics/:category` - Topics for a category (public)
- `GET /api/study-guide/progress` - User's study progress
- `GET /api/study-guide/quiz/:topicId` - Get 150 questions for topic study
- `POST /api/study-guide/answer` - Submit single answer + get feedback

### Password Reset (Public)
- `POST /api/forgot-password` - Send reset email (rate-limited: 5/15min IP, 3/hour email)
- `GET /api/reset-password/verify` - Verify token validity
- `POST /api/reset-password` - Reset password with token

### Stripe
- `GET /api/stripe/prices` - List active prices (public)
- `GET /api/stripe/debug` - Debug: list products/prices (public, read-only)
- `POST /api/stripe/checkout` - Create checkout session (auth required)
- `POST /api/stripe/portal` - Create billing portal session (auth required)
- `POST /api/stripe/cancel-subscription` - Cancel subscription (auth required)
- `POST /api/stripe/sync-subscription` - Sync from Stripe for current user
- `POST /api/stripe/webhook` - Stripe webhook (raw body, signature verified)

### Public Forms
- `POST /api/callback-requests` - Schedule exam callback form
- `POST /api/guest-articles` - Guest article submission

### Admin (Auth + Admin Role Required)
- `GET /api/admin/stats` - Analytics dashboard stats
- `GET /api/admin/users` - All users with subscription details
- `POST /api/admin/sync-user-subscription/:userId` - Sync any user's subscription
- `POST /api/admin/send-password-reset/:userId` - Trigger password reset for user
- `GET /api/admin/questions` - List all questions (optionally filter by category)
- `POST /api/admin/questions` - Create question
- `PATCH /api/admin/questions/:id` - Update question
- `DELETE /api/admin/questions/:id` - Soft-delete question (sets `isActive: false`)
- `GET /api/admin/question-feedback` - All question feedback
- `PATCH /api/admin/question-feedback/:id` - Update feedback status/notes
- `GET /api/admin/callback-requests` - All callback requests
- `GET /api/admin/guest-articles` - All guest article submissions
- `PATCH /api/admin/guest-articles/:id` - Update article status
- `POST /api/admin/init-stripe-prices` - Initialize/sync Stripe products + prices
- `GET /api/admin/stripe-diagnostic` - Stripe product/price diagnostic
- `POST /api/admin/stripe-force-create` - Force-create missing Stripe products/prices

## Code Conventions

### TypeScript
- ESM modules throughout (`"type": "module"` in package.json)
- Use `type` for aliases, `interface` for object contracts
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`
- All functions typed with parameters and return types

### React Patterns
- Functional components with hooks
- TanStack Query for all server state; query keys match URL patterns (e.g. `["/api/auth/user"]`)
- React Hook Form + Zod for forms
- `cn()` helper for conditional Tailwind classes
- `ProtectedRoute` wrapper in `App.tsx` for auth-required pages (redirects to `/login`)
- Theme: `ThemeProvider` with `defaultTheme="light"`, key `"easy-pass-theme"`

### Express Patterns
```typescript
app.post("/api/endpoint", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;  // isAuthenticated injects this
    const validated = schema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ message: "Invalid data", errors: validated.error.errors });
    }
    const result = await storage.doSomething(userId, validated.data);
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Operation failed" });
  }
});
```

### Admin Role Check Pattern
```typescript
const profile = await storage.getProfile(userId);
if (profile?.role !== "admin") {
  return res.status(403).json({ message: "Forbidden" });
}
```

### Error Responses
- 400: Validation errors `{ message, errors? }`
- 401: Not authenticated `{ message: "Unauthorized" }`
- 403: Forbidden (wrong role/no subscription) `{ message }`
- 404: Not found `{ message }`
- 410: Gone (revoked certificate)
- 429: Rate limited `{ error, message, retryAfter }`
- 500: Server error `{ message }`
- 503: Service unavailable (email not configured) `{ message, resetLink? }`

## Authentication System

- **Session**: PostgreSQL-backed, `httpOnly`, `sameSite: "lax"`, 1-week TTL
- **Cookies**: `secure: true` in production (detected via `REPLIT_DEPLOYMENT === "1"` or `NODE_ENV === "production"`)
- **`isAuthenticated` middleware** (`server/simpleAuth.ts`): checks `req.session.userId`, injects `req.user = { claims: { sub: userId, email } }`
- **Password hashing**: bcryptjs, 10 rounds
- **Reset tokens**: 32 random bytes → SHA-256 hashed before storage, 1-hour expiry

## Security Practices

- **Helmet**: CSP (strict script/style/frame sources for Stripe), HSTS 1-year
- **CORS**: Allowlist — `myeasypass.net`, `easy-pass-ht1x.onrender.com`, `localhost:5000` (dev only)
- **Global rate limit**: 100 req/15min per IP on all `/api/` routes
- **Auth rate limit**: 5 req/15min per IP on `/api/login`, `/api/register`, `/api/reset-password`
- **Custom in-memory rate limiter** (`server/rateLimit.ts`): used for forgot-password (5/15min IP, 3/hour email) and reset-password verify (20/15min)
- **Input sanitization**: `sanitizeHtml()` in `server/sanitize.ts` — HTML entity encoding on user-supplied text fields
- **Stripe webhook**: raw body required; registered BEFORE `express.json()` middleware; signature verified via managed webhook secret
- **Email enumeration prevention**: forgot-password always returns success regardless of email existence

## Subscription Model

### Pricing (Stripe)
| Plan | Weekly | Monthly |
|------|--------|---------|
| Single category | $6.99/week | $19.99/month |
| Bundle (all 4) | $12.99/week | $34.99/month |

### Stripe Metadata
Products must have metadata:
- `subscription_type`: `"single"` or `"bundle"`
- `allowed_categories`: comma-separated list (e.g. `"real_estate"` or `"real_estate,property_casualty,life_insurance,general_lines"`)

Prices inherit metadata from product; price-level metadata used as fallback.

### Access Control Flow
1. `checkSubscriptionActive()` in `server/subscriptionCheck.ts`
2. Admins (`role === "admin"`) bypass all subscription checks
3. Check `subscriptionStatus` ∈ `["active", "trialing"]`
4. Check `subscriptionEndDate` not expired
5. Check `allowedCategories` includes requested category

### Subscription Sync
- Stripe webhooks automatically update `user_profiles` and `subscriptions` tables
- Handled events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`
- Self-sync: `POST /api/stripe/sync-subscription`
- Admin sync: `POST /api/admin/sync-user-subscription/:userId` (also searches by email if no `stripeCustomerId`)

## Exam Flow

1. User calls `POST /api/exams/start` → subscription checked, N random questions fetched via `ORDER BY RANDOM()`, session created
2. Frontend presents questions; user answers
3. User calls `POST /api/exams/:sessionId/submit` → answers evaluated, score calculated
4. `calculateExamScore()` returns `{ score: number, passed: boolean }` where `passed = score >= 70`
5. Topic breakdown calculated and returned
6. If passed: user can call `POST /api/results/:resultId/certificate` to generate a shareable certificate

## Study Guide

- Topics defined in `shared/studyTopics.ts`
- `GET /api/study-guide/quiz/:topicId` returns 150 random questions (no `correctAnswer` field exposed)
- Each answer submission calls `POST /api/study-guide/answer` → returns correct answer + explanation
- Progress tracked per user+topic in `study_progress` table via upsert

## Certificate System

- Generated on demand for passed exams
- 10-character alphanumeric slug (unambiguous chars only — no O/0/I/l/1)
- Public URL: `/certificates/:slug` → calls `GET /api/certificates/public/:slug`
- Can be revoked by admin; revoked certs return 410 Gone

## Email System (Resend)

- `server/resendClient.ts` fetches credentials from `RESEND_API_KEY` env var
- Falls back to Replit Connectors API if running on Replit
- From address: `MyEasyPass <noreply@myeasypass.net>` (or `RESEND_FROM_EMAIL`)
- Reset link uses `APP_DOMAIN` env var (default: `easy-pass-ht1x.onrender.com`)
- If email fails, endpoint returns 503 with the raw `resetLink` for admin use

## Testing

### Unit Tests (Vitest) — `server/__tests__/`
- `examScoring.test.ts` — score calculation, pass/fail, topic breakdown
- `subscriptionCheck.test.ts` — subscription validation logic
- `rateLimit.test.ts` — rate limiter behavior
- `sanitize.test.ts` — HTML sanitization
- `webhookHandlers.test.ts` — Stripe webhook event processing
- `webhookHelpers.test.ts` — mapStripeStatus, getPlanFromSubscription
- `studyTopics.test.ts` — study topics config

### E2E Tests (Playwright) — `tests/`
- `api.spec.ts` — API endpoint testing
- `auth-guards.spec.ts` — Protected route access control
- `browser.spec.ts` — Browser UI flows
- `password-reset.spec.ts` — Password reset flow
- `public-endpoints.spec.ts` — Public API endpoints
- `registration-subscription.spec.ts` — Registration + subscription flow

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Session encryption key |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` \| `production` |
| `STRIPE_SECRET_KEY` | Stripe | Stripe API key |
| `REPLIT_DEPLOYMENT` | Auto | Set to `"1"` in Replit production deployments |
| `REPLIT_DOMAINS` | Auto | Comma-separated domains (Replit dev) |
| `RESEND_API_KEY` | Email | Resend email API key |
| `RESEND_FROM_EMAIL` | No | Override from address (default: `MyEasyPass <noreply@myeasypass.net>`) |
| `APP_DOMAIN` | No | Domain for password reset links (default: `easy-pass-ht1x.onrender.com`) |

## Key Files Reference

| File | Purpose |
|------|---------|
| `server/routes.ts` | All 50+ API endpoints |
| `server/storage.ts` | `IStorage` interface + `DatabaseStorage` implementation |
| `shared/schema.ts` | All table definitions, Zod insert schemas, exported types |
| `shared/models/auth.ts` | `users` + `sessions` table definitions |
| `server/simpleAuth.ts` | Auth routes + `isAuthenticated` middleware |
| `server/subscriptionCheck.ts` | `checkSubscriptionActive()` function |
| `server/webhookHandlers.ts` | Stripe webhook event handlers |
| `server/stripeClient.ts` | Cached Stripe client + StripeSync instance |
| `server/stripeHelpers.ts` | `mapStripeStatus()`, `getPlanFromSubscription()` |
| `server/examScoring.ts` | `calculateExamScore()`, `calculateTopicBreakdown()` |
| `server/rateLimit.ts` | `rateLimit()`, `getClientIp()` |
| `server/sanitize.ts` | `sanitizeHtml()`, `sanitizeString()`, `sanitizeObject()` |
| `server/resendClient.ts` | `sendPasswordResetEmail()` |
| `client/src/App.tsx` | Route definitions + `ProtectedRoute` component |
| `client/src/hooks/use-auth.ts` | `useAuth()` hook |
| `client/src/pages/dashboard.tsx` | Main user dashboard |
| `client/src/pages/admin.tsx` | Admin panel |
| `shared/studyTopics.ts` | Study guide topics config |

## i18n

- Languages: English (`en`), Spanish (`es`)
- Database fields: `questionTextEn`/`questionTextEs`, `explanationEn`/`explanationEs`, etc.
- Frontend: `i18next` with `t('key')` function, language auto-detected
- User preference stored in `user_profiles.preferredLanguage`
- Account for 20-30% Spanish text expansion in UI layouts

## Common Tasks

### Add a new API endpoint
1. Add route handler in `server/routes.ts`
2. Add storage method to `IStorage` interface in `server/storage.ts`
3. Implement method in `DatabaseStorage` class
4. Add Zod schema in `shared/schema.ts` if new table is involved

### Add a new frontend page
1. Create component in `client/src/pages/`
2. Add `<Route>` in `client/src/App.tsx`
3. Wrap with `ProtectedRoute` for auth-required pages

### Add a database table
1. Define table in `shared/schema.ts` (or `shared/models/auth.ts` for auth tables)
2. Export insert schema with `createInsertSchema(...).omit({...})`
3. Export TypeScript types
4. Run `npm run db:push`

### Debug subscription issues
1. Check `user_profiles.subscriptionStatus` and `allowedCategories`
2. Check `subscriptions` table for Stripe sync data
3. Use `POST /api/stripe/sync-subscription` for user self-sync
4. Use `POST /api/admin/sync-user-subscription/:userId` (also searches by email)
5. Use `GET /api/admin/stripe-diagnostic` to inspect Stripe products/prices
6. Use `POST /api/admin/stripe-force-create` to recreate missing products/prices
7. Check Stripe webhook logs in Stripe dashboard
8. Verify `stripeCustomerId` in `user_profiles` matches Stripe customer

### Add a new Stripe product/category
1. Update `REQUIRED` array in `server/initializeStripePrices.ts`
2. Update `examCategoryEnum` in `shared/schema.ts` if it's a new category
3. Run `POST /api/admin/stripe-force-create` to create in Stripe
4. Update subscription check logic in `server/subscriptionCheck.ts` if needed

## Deployment Notes

- Production detection: `process.env.REPLIT_DEPLOYMENT === "1"` OR `process.env.NODE_ENV === "production"`
- Production uses `serveStatic()` to serve built frontend assets
- Development uses Vite dev server with HMR via `server/vite.ts`
- **Stripe webhook registration order is critical**: webhook route MUST be registered before `express.json()` middleware so the raw body Buffer is preserved
- Sessions use `secure: true` cookies in production (requires HTTPS)
