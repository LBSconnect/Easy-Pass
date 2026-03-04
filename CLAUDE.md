# CLAUDE.md - Easy Pass Codebase Guide

## Project Overview

**Easy Pass** is a bilingual (English/Spanish) exam preparation web application for Texas licensing exams. It provides timed practice sessions with immediate scoring and feedback for four exam categories:
- Real Estate
- Property & Casualty Insurance
- Life Insurance
- General Lines Insurance

The platform operates on a subscription-based model with category-specific pricing integrated through Stripe.

## Tech Stack

### Frontend
- **Framework**: React 18.3.1 (TypeScript)
- **Build Tool**: Vite 7.3.0
- **Routing**: Wouter 3.3.5
- **State Management**: TanStack React Query 5.60.5
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4.17 with CSS custom properties
- **i18n**: i18next 25.7.4 (EN/ES support)
- **Forms**: React Hook Form 7.55.0 + Zod 3.24.2 validation

### Backend
- **Runtime**: Node.js 20.x with TypeScript
- **Framework**: Express.js 4.22.1
- **ORM**: Drizzle ORM 0.39.3 (PostgreSQL)
- **Authentication**: Custom email/password with bcryptjs 3.0.3, express-session 1.18.2
- **Payments**: Stripe 20.0.0
- **Email**: Resend 4.0.0

### Database
- **Primary**: PostgreSQL 16.x
- **Session Store**: PostgreSQL (connect-pg-simple)

## Directory Structure

```
/home/user/Easy-Pass/
├── client/                     # React frontend
│   ├── src/
│   │   ├── pages/             # Page components (14 total)
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/           # shadcn/ui components (50+)
│   │   ├── hooks/            # Custom React hooks (3)
│   │   └── lib/              # Utilities (queryClient, i18n, auth-utils)
│   └── index.html
├── server/                     # Express backend
│   ├── index.ts               # Server entry, middleware setup
│   ├── routes.ts              # All API endpoints
│   ├── storage.ts             # Data access layer (IStorage)
│   ├── db.ts                  # Drizzle ORM init
│   ├── simpleAuth.ts          # Auth routes (register, login, password reset)
│   ├── subscriptionCheck.ts   # Subscription validation
│   ├── examScoring.ts         # Score calculation
│   ├── sanitize.ts            # HTML sanitization (XSS prevention)
│   ├── rateLimit.ts           # Custom rate limiting logic
│   ├── stripeClient.ts        # Stripe API client (cached)
│   ├── stripeHelpers.ts       # Stripe helper functions
│   ├── webhookHandlers.ts     # Stripe webhook processing
│   ├── initializeStripePrices.ts # Stripe price initialization
│   ├── resendClient.ts        # Email service client
│   ├── vite.ts                # Vite dev server setup
│   ├── static.ts              # Static file serving
│   ├── seed-*.ts              # Data seeding scripts (10+ files by category)
│   └── __tests__/             # Unit tests (7 test files)
├── shared/                     # Shared code
│   ├── schema.ts              # Drizzle schema (14 tables)
│   ├── studyTopics.ts         # Study guide config (bilingual)
│   └── models/
│       └── auth.ts            # User authentication model
├── tests/                      # E2E tests (Playwright, 6 files)
├── public/                     # Static assets
├── scripts/                    # Utility scripts
├── .ebextensions/             # AWS Elastic Beanstalk config
└── config files               # tsconfig, vite, drizzle, tailwind, etc.
```

## Development Commands

```bash
npm run dev          # Start dev server (port 5000)
npm run build        # Build for production
npm run start        # Run production server
npm run check        # TypeScript type checking
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run E2E tests (Playwright)
npm run db:push      # Apply schema changes to database
```

## Database Schema (14 Tables)

| Table | Purpose |
|-------|---------|
| `users` | Authentication (email, password hash, reset tokens) |
| `user_profiles` | Preferences, subscription info, Stripe IDs, role |
| `subscriptions` | Stripe subscription sync table |
| `payment_history` | Stripe payment records |
| `questions` | Bilingual exam questions |
| `exam_sessions` | In-progress exams |
| `exam_results` | Completed exam scores |
| `exam_certificates` | Passing certificates (with public slug) |
| `study_progress` | Topic-based learning progress |
| `question_feedback` | User-reported question issues |
| `callback_requests` | User callback request submissions |
| `guest_articles` | Guest article submissions |

### Key Enums
```typescript
type ExamCategory = "real_estate" | "property_casualty" | "life_insurance" | "general_lines";
type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";
type SubscriptionPlan = "weekly" | "monthly";
type SubscriptionType = "single" | "bundle";
type UserRole = "user" | "admin";
type FeedbackType = "error" | "unclear" | "wrong_answer" | "translation" | "suggestion" | "other";
type FeedbackStatus = "pending" | "reviewed" | "resolved" | "dismissed";
type GuestArticleStatus = "pending" | "approved" | "rejected";
```

## Complete API Reference

### Authentication & Profile
- `POST /api/register` - Create account
- `POST /api/login` - Login
- `GET /api/logout` - Logout
- `POST /api/forgot-password` - Request reset email (rate limited: 3/hour per email)
- `POST /api/reset-password` - Submit new password
- `GET /api/reset-password/verify` - Verify reset token validity
- `GET /api/profile` - Get user profile (auth required)
- `PATCH /api/profile` - Update profile (auth required)

### Exams (Auth + Subscription Required)
- `POST /api/exams/start` - Start exam (practice: 50q/90min, full: 150q/120min)
- `POST /api/exams/:sessionId/submit` - Submit answers and score
- `DELETE /api/exams/:sessionId/cancel` - Cancel active exam
- `GET /api/results` - Get exam results history
- `POST /api/results/:resultId/certificate` - Generate passing certificate

### Certificates
- `GET /api/certificates` - Get user certificates (auth required)
- `GET /api/certificates/public/:slug` - Public certificate view (no auth)

### Study Guide (Auth Required)
- `GET /api/study-guide/topics` - Get all topics
- `GET /api/study-guide/topics/:category` - Get topics by category
- `GET /api/study-guide/progress` - Get user study progress
- `GET /api/study-guide/quiz/:topicId` - Get quiz questions for a topic
- `POST /api/study-guide/answer` - Submit a quiz answer

### Question Feedback (Auth Required)
- `POST /api/question-feedback` - Submit feedback on a question

### Stripe / Payments
- `GET /api/stripe/prices` - Get available pricing
- `POST /api/stripe/checkout` - Create Stripe checkout session (auth required)
- `POST /api/stripe/portal` - Open billing portal (auth required)
- `POST /api/stripe/cancel-subscription` - Cancel subscription (auth required)
- `POST /api/stripe/sync-subscription` - User self-syncs subscription from Stripe (auth required)
- `POST /api/stripe/webhook` - Webhook handler (Stripe signature verified)
- `GET /api/stripe/debug` - Debug Stripe data (public)

### Public Endpoints
- `POST /api/guest-articles` - Submit a guest article
- `POST /api/callback-requests` - Request a callback

### Admin (Admin Role Required)
- `GET /api/admin/stats` - Analytics (total users, active subscriptions, revenue, pass rate)
- `GET /api/admin/users` - List all users with subscription details
- `POST /api/admin/sync-user-subscription/:userId` - Sync a user's subscription from Stripe
- `POST /api/admin/send-password-reset/:userId` - Send password reset email to a user
- `GET /api/admin/questions` - List questions (supports category filter)
- `POST /api/admin/questions` - Create question
- `PATCH /api/admin/questions/:id` - Update question
- `DELETE /api/admin/questions/:id` - Delete question
- `GET /api/admin/question-feedback` - Get all question feedback
- `PATCH /api/admin/question-feedback/:id` - Update feedback status/notes
- `GET /api/admin/guest-articles` - Get all guest article submissions
- `PATCH /api/admin/guest-articles/:id` - Update article status
- `GET /api/admin/callback-requests` - Get all callback requests
- `POST /api/admin/init-stripe-prices` - Initialize Stripe prices
- `GET /api/admin/stripe-diagnostic` - Stripe diagnostic info
- `POST /api/admin/stripe-force-create` - Force create missing Stripe prices

## Code Conventions

### TypeScript
- Use `type` for aliases, `interface` for object contracts
- Path aliases: `@/` (client), `@shared/` (shared)
- All functions typed with parameters and return types

### React Patterns
- Functional components with hooks
- TanStack Query for server state
- React Hook Form + Zod for forms
- `cn()` helper for conditional Tailwind classes

### Express Patterns
```typescript
app.post("/api/endpoint", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const validated = schema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ errors: validated.error.errors });
    }
    const result = await storage.doSomething(userId, validated.data);
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Operation failed" });
  }
});
```

### Error Responses
- 400: Validation errors `{ message, errors? }`
- 401: Not authenticated
- 403: Forbidden (wrong role/subscription)
- 429: Rate limited `{ error, message, retryAfter }`
- 500: Server error `{ message }`

## Security Practices

- **Passwords**: bcryptjs 10 rounds, minimum 8 characters
- **Sessions**: httpOnly, sameSite cookies
- **Reset tokens**: SHA-256 hashed, 1-hour expiry
- **Rate limiting**: Auth endpoints (5 attempts/15min per IP), forgot-password (3/hour per email)
- **Input validation**: Zod schemas on all API inputs
- **XSS Prevention**: DOMPurify-based sanitization (`server/sanitize.ts`) on all user inputs
- **CORS**: Configured for production domains + localhost dev
- **Security headers**: Helmet with CSP, HSTS, X-Frame-Options
- **Email enumeration prevention**: Generic messages on forgot-password
- **Stripe webhooks**: Signature verification on all webhook requests
- **Admin access**: Role-based (`user_profiles.role === "admin"`)

## Subscription Model

- **Types**: Single category or Bundle (all 4 categories)
- **Plans**: Weekly or Monthly billing
- **Categories**: `real_estate`, `property_casualty`, `life_insurance`, `general_lines`
- **Storage**: `user_profiles.allowedCategories` (JSONB array) + `subscriptions` table
- **Sync**: Stripe webhooks update both `user_profiles` and `subscriptions` tables
- **Self-sync**: Users can trigger sync via `/api/stripe/sync-subscription`
- **Admin sync**: Admins can sync any user via `/api/admin/sync-user-subscription/:userId`

## Exam Logic

- **Practice exam**: 50 questions, 90 minutes (5400 seconds)
- **Full mock exam**: 150 questions, 120 minutes (7200 seconds)
- **Passing score**: 70% correct answers required
- **Score calculation**: `(correctAnswers / totalQuestions) * 100`
- **Results**: Include per-topic performance breakdown
- **Certificates**: Auto-generated on passing; public URL via unique slug; revocable by admin

## Testing

### Unit Tests (Vitest) — `server/__tests__/`
| File | Coverage |
|------|---------|
| `examScoring.test.ts` | Score calculation logic |
| `rateLimit.test.ts` | Rate limiting behavior |
| `sanitize.test.ts` | HTML sanitization |
| `studyTopics.test.ts` | Study topic configuration |
| `subscriptionCheck.test.ts` | Subscription validation |
| `webhookHandlers.test.ts` | Stripe webhook processing |
| `webhookHelpers.test.ts` | Webhook helper utilities |

### E2E Tests (Playwright) — `tests/`
| File | Coverage |
|------|---------|
| `api.spec.ts` | API endpoint integration |
| `auth-guards.spec.ts` | Authentication enforcement |
| `browser.spec.ts` | Browser interaction tests |
| `password-reset.spec.ts` | Password reset flow |
| `public-endpoints.spec.ts` | Public endpoint access |
| `registration-subscription.spec.ts` | Registration & subscription flow |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Session encryption key |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | development/production |
| `STRIPE_SECRET_KEY` | Stripe | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signature verification |
| `RESEND_API_KEY` | Email | Password reset emails |

## Key Files to Know

| File | Purpose |
|------|---------|
| `server/routes.ts` | All API endpoints |
| `server/storage.ts` | Database operations (IStorage interface) |
| `server/simpleAuth.ts` | Auth route handlers |
| `server/sanitize.ts` | HTML sanitization for user inputs |
| `server/rateLimit.ts` | In-memory rate limiting logic |
| `shared/schema.ts` | All 14 table definitions and Zod schemas |
| `server/subscriptionCheck.ts` | Subscription validation logic |
| `server/webhookHandlers.ts` | Stripe webhook processing |
| `client/src/hooks/use-auth.ts` | Frontend auth state |
| `client/src/App.tsx` | Client routing |
| `client/src/pages/dashboard.tsx` | Main user dashboard |
| `client/src/pages/admin.tsx` | Admin panel |

## Pages (client/src/pages/)

| File | Route | Access |
|------|-------|--------|
| `landing.tsx` | `/` (unauthenticated) | Public |
| `auth.tsx` | `/login`, `/signup` | Public |
| `forgot-password.tsx` | `/forgot-password` | Public |
| `reset-password.tsx` | `/reset-password` | Public |
| `faq.tsx` | `/faq` | Public |
| `terms.tsx` | `/terms` | Public |
| `privacy.tsx` | `/privacy` | Public |
| `pricing.tsx` | `/pricing` | Public |
| `schedule-exam.tsx` | `/schedule-exam` | Public |
| `certificate.tsx` | `/certificates/:slug` | Public |
| `dashboard.tsx` | `/dashboard` | Auth required |
| `exams.tsx` | `/exams`, `/exams/:category` | Auth required |
| `study-guide.tsx` | `/study-guide` | Auth required |
| `profile.tsx` | `/profile` | Auth required |
| `admin.tsx` | `/admin` | Auth required (admin role) |

## i18n

- Languages: English (`en`), Spanish (`es`)
- Database fields: `fieldEn`, `fieldEs` (e.g. `questionTextEn`, `questionTextEs`)
- Frontend: i18next with `t('key')` function
- Account for 20-30% Spanish text expansion in layouts

## Common Tasks

### Add a new API endpoint
1. Add route in `server/routes.ts`
2. Add storage method in `server/storage.ts`
3. Add Zod schema if needed in `shared/schema.ts`

### Add a new page
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Use `ProtectedRoute` for auth-required pages

### Add a database table
1. Define table in `shared/schema.ts`
2. Export insert schema with `createInsertSchema`
3. Run `npm run db:push`

### Debug subscription issues
1. Check `user_profiles.subscriptionStatus` and `allowedCategories`
2. Check `subscriptions` table for Stripe sync
3. Use `POST /api/stripe/sync-subscription` for user self-sync
4. Use `POST /api/admin/sync-user-subscription/:userId` for admin to sync any user
5. In admin panel, click the sync (refresh) button next to a user
6. Check Stripe webhook logs in Stripe dashboard
7. Verify `stripeCustomerId` in user_profiles matches Stripe customer
8. Use `GET /api/admin/stripe-diagnostic` for detailed Stripe state

### Add bilingual content
- All user-facing text should have `En` and `Es` variants
- Database columns: `fieldEn TEXT`, `fieldEs TEXT`
- Frontend: wrap strings with `t('translationKey')`

## Deployment

- **Platform**: Replit (primary) with AWS Elastic Beanstalk support (`Procfile`, `.ebextensions/`)
- **Port**: 5000 (both dev and production)
- **Build**: TypeScript → esbuild → CommonJS bundle in `dist/`
- **Static serving**: React SPA served from `dist/public`
- **Database migrations**: Drizzle Kit push (no migration files — `npm run db:push`)
- **Production DB**: Supports Neon PostgreSQL with SSL
