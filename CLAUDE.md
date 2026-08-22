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
- **i18n**: i18next (EN/ES support)
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js 20.x with TypeScript
- **Framework**: Express.js 4.21.2
- **ORM**: Drizzle ORM 0.39.3 (PostgreSQL)
- **Authentication**: Custom email/password with bcryptjs, express-session
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
│   │   ├── pages/             # Page components (16 total)
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # Utilities (queryClient, i18n)
│   └── index.html
├── server/                     # Express backend
│   ├── index.ts               # Server entry, middleware
│   ├── routes.ts              # 41 API endpoints
│   ├── storage.ts             # Data access layer (IStorage)
│   ├── db.ts                  # Drizzle ORM init
│   ├── simpleAuth.ts          # Auth middleware
│   ├── subscriptionCheck.ts   # Subscription validation
│   ├── examScoring.ts         # Score calculation
│   ├── webhookHandlers.ts     # Stripe webhooks
│   └── __tests__/             # Unit tests (82+ tests)
├── shared/                     # Shared code
│   ├── schema.ts              # Drizzle schema (13 tables)
│   └── studyTopics.ts         # Study guide config
├── tests/                      # E2E tests (Playwright)
└── config files
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

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | Authentication (email, password hash, reset tokens) |
| `user_profiles` | Preferences, subscription info, Stripe IDs |
| `subscriptions` | Stripe subscription sync table |
| `questions` | Bilingual exam questions |
| `exam_sessions` | In-progress exams |
| `exam_results` | Completed exam scores |
| `exam_certificates` | Passing certificates |
| `study_progress` | Topic-based learning progress |
| `question_feedback` | User-reported issues |

## API Route Patterns

### Authentication
- `POST /api/register` - Create account
- `POST /api/login` - Login
- `GET /api/logout` - Logout
- `POST /api/forgot-password` - Request reset email
- `POST /api/reset-password` - Submit new password

### Exams (Auth Required)
- `POST /api/exams/start` - Start exam (subscription check)
- `POST /api/exams/:sessionId/submit` - Submit answers
- `GET /api/results` - Get exam results
- `GET /api/certificates` - Get certificates

### Stripe
- `POST /api/stripe/checkout` - Create checkout session
- `GET /api/stripe/portal` - Customer portal link
- `POST /api/stripe/webhook` - Webhook handler (signature verified)
- `POST /api/stripe/sync-subscription` - Sync from Stripe

### Admin
- `GET /api/admin/users` - List users (includes subscription details)
- `POST /api/admin/sync-user-subscription/:userId` - Sync user subscription from Stripe
- `GET /api/admin/stats` - Analytics
- `GET/POST/PATCH/DELETE /api/admin/questions` - Question CRUD

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

- **Passwords**: bcryptjs 10 rounds
- **Sessions**: httpOnly, sameSite cookies
- **Reset tokens**: SHA-256 hashed, 1-hour expiry
- **Rate limiting**: Auth endpoints (5/15min), forgot password (3/hour per email)
- **Input validation**: Zod schemas on all inputs
- **CSP**: Helmet with strict script/style sources

## Subscription Model

- **Types**: Single category or Bundle (all categories)
- **Plans**: Weekly or Monthly billing
- **Categories**: real_estate, property_casualty, life_insurance, general_lines
- **Storage**: `user_profiles.allowedCategories` (JSONB array)
- **Sync**: Stripe webhooks update `user_profiles` and `subscriptions` tables

## Testing

### Unit Tests (Vitest)
- Located in `server/__tests__/`
- Test business logic: scoring, validation, rate limiting
- Pattern: `describe/it/expect`

### E2E Tests (Playwright)
- Located in `tests/`
- Test user workflows: auth, exams, payments
- Run with: `npm run test:e2e`

### CI / Automated Site Health
- Every PR into `main` and every push to `main` runs `.github/workflows/ci.yml` (type check, unit tests, build). No secrets required.
- A weekly automated check (`.github/workflows/weekly-site-health.yml`) runs checks, a broken-link scan, and `npm audit`, then opens a report PR — auto-merge for its fixes is off by default (`vars.AUTO_MERGE_WEEKLY_FIXES`).
- Full details, DST-safe scheduling approach, and how to configure `NOTIFY_WEBHOOK_URL` / `AUTO_MERGE_WEEKLY_FIXES`: see [`docs/CI.md`](docs/CI.md).
- Render auto-deploys from `main` — merging a PR **is** the deployment step.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Session encryption key |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | development/production |
| `STRIPE_SECRET_KEY` | Stripe | Payment processing |
| `RESEND_API_KEY` | Email | Password reset and study reminder emails |
| `REMINDER_DISPATCH_SECRET` | Reminders | Guards `POST /api/reminders/dispatch`. Unset = the route refuses everything and no reminder emails are sent. See [`docs/CI.md`](docs/CI.md). |
| `ALEXI_MOCK_EXAM_ENABLED` | Targeted practice | `true` enables targeted practice papers. Resolved on its own, without AI credentials — the papers are assembled from the approved bank and call no model. |
| `OUTREACH_ENABLED` + `OUTREACH_DISPATCH_SECRET` + `OUTREACH_FROM_EMAIL` + `OUTREACH_WEBHOOK_SECRET` | Partner outreach | Automated partner outreach engine. All unset = nothing ever sends (the default). Full list and setup: [`docs/CI.md`](docs/CI.md). |

## Key Files to Know

| File | Purpose |
|------|---------|
| `server/routes.ts` | All 41 API endpoints |
| `server/storage.ts` | Database operations (IStorage interface) |
| `shared/schema.ts` | All table definitions and Zod schemas |
| `server/subscriptionCheck.ts` | Subscription validation logic |
| `server/webhookHandlers.ts` | Stripe webhook processing |
| `client/src/hooks/use-auth.ts` | Frontend auth state |
| `client/src/pages/dashboard.tsx` | Main user dashboard |
| `client/src/pages/admin.tsx` | Admin panel |

## Exam Categories

```typescript
type ExamCategory = "real_estate" | "property_casualty" | "life_insurance" | "general_lines";
```

## Passing Score

Exams require **70%** correct answers to pass.

## i18n

- Languages: English (en), Spanish (es)
- Database fields: `fieldEn`, `fieldEs`
- Frontend: i18next with `t('key')` function
- Account for 20-30% Spanish text expansion

## Working in Parallel

Two agents work this repository at the same time - one on acquisition, one on
the student product. Most of what has gone wrong here has been coordination
rather than code, so these are the conventions that keep it workable.

### Who owns what

`.github/CODEOWNERS` is the authority and shows up on every pull request. In
short: search-led pages, sitemaps and metadata on one side; the Alexi engine,
auth, storage, the student pages and the test suites on the other.

The boundary is drawn at **files**, not topics. "SEO" and "Alexi" sounded like
a clean split until growth work started feeding the recommendation engine, at
which point the two were the same code.

### Shared files: add, never reshape

`App.tsx`, `lib/analytics.ts`, `navbar.tsx`, `lib/i18nResources.ts` and
`components/ui/` are legitimately shared. Adding a route, an event name, a nav
item or a translation key is fine. Removing, renaming or restructuring what is
already there is not - the other side is probably standing on it.

Two outages came from ignoring this. The Button `link` variant was deleted
while three pages still used it, and two analytics events were fired without
being added to `AnalyticsEventName`. Both broke the type check on `main`, and
both were discovered by whoever opened the next pull request.

### Never merge on red, or on pending

Every red merge puts the next pull request on a broken base, and the person who
opens it inherits a failure they did not cause. Nine merged inside one hour on
one occasion with end-to-end tests failing throughout, after which nobody could
say which change had broken what.

Branch protection on `main` requiring both checks is what makes this structural
rather than a matter of remembering.

### Never force-push `main`

Merged pull request #137 was silently dropped from `main`'s history that way.
The commit still existed but was no longer an ancestor, so four files were
simply gone and had to be restored by hand. Nothing warns you.

### `npm run build` does not type-check

Vite and esbuild strip types without checking them, so a green build can be
code that does not compile. Run all four before pushing:

```bash
npm run check && npm run check:tests && npx vitest run && npm run build
```

### CI runs every Playwright project

`npx playwright test` with no `--project` runs `e2e`, `ui` **and**
`rate-limits`. Running only `--project=e2e` locally will look green while CI is
red, which has already cost an afternoon of misattributed failures.

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
3. Use `/api/stripe/sync-subscription` for user self-sync
4. Use `/api/admin/sync-user-subscription/:userId` for admin to sync any user
5. In admin panel, click the sync (refresh) button next to a user
6. Check Stripe webhook logs in dashboard
7. Verify `stripeCustomerId` in user_profiles matches Stripe customer
