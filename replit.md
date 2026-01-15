# Easy Pass - Texas Licensing Exam Prep Platform

## Overview

Easy Pass is a bilingual (English/Spanish) exam preparation web application for Texas licensing exams. The platform enables users to practice for Real Estate, Property & Casualty Insurance, Life Insurance, and General Lines Insurance exams through timed practice sessions with immediate scoring and feedback.

The application follows a subscription-based model with weekly ($6.99) and monthly ($19.99) plans, integrated through Stripe for payment processing. It includes user-facing practice exam features and an admin panel for question management and analytics.

## Recent Changes (January 2026)

- Completed full application implementation including frontend and backend
- Implemented subscription enforcement for exam access (users need active subscription or admin role)
- Added Zod validation for all API endpoints (exams, checkout, questions)
- Implemented Stripe credential caching for improved performance
- Added proper admin role checks on all admin endpoints
- Seeded 10 sample questions and created Stripe subscription products
- Added question feedback system allowing users to report issues with exam questions
  - Database table: question_feedback with feedback types (error, unclear, wrong_answer, translation, suggestion, other)
  - API endpoints: POST /api/question-feedback, GET/PATCH /api/admin/question-feedback
  - UI: "Report Issue" button in exam view with feedback modal
  - Admin panel: Feedback tab for reviewing and managing submitted feedback

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, with custom hooks for auth state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Internationalization**: i18next for English/Spanish language switching
- **Design System**: Material Design 3 principles with Inter font family

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Session Management**: express-session with PostgreSQL-backed session store (connect-pg-simple)
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**: users, sessions, user_profiles, questions, exam_sessions, exam_results, payment_history
- **Migrations**: Drizzle Kit for schema management (`drizzle-kit push`)

### Authentication & Authorization
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL sessions table
- **User Roles**: "user" and "admin" roles stored in user_profiles table
- **Protected Routes**: `isAuthenticated` middleware checks for valid session

### Payment Integration
- **Provider**: Stripe via Replit's connector system
- **Sync Library**: stripe-replit-sync for webhook handling and schema management
- **Subscription Plans**: Weekly and monthly recurring subscriptions
- **Webhook Processing**: Managed webhooks through Replit's infrastructure

### Build & Development
- **Dev Server**: Vite with HMR for frontend, tsx for backend hot-reloading
- **Production Build**: esbuild bundles server code, Vite builds client to `dist/public`
- **Path Aliases**: `@/` maps to client/src, `@shared/` maps to shared directory

## External Dependencies

### Third-Party Services
- **Stripe**: Payment processing and subscription management via Replit connector
- **Replit Auth**: User authentication through OpenID Connect
- **PostgreSQL**: Primary database (provisioned through Replit)

### Key NPM Packages
- **Database**: drizzle-orm, drizzle-zod, pg, connect-pg-simple
- **UI**: @radix-ui/* components, tailwindcss, class-variance-authority
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **Data Fetching**: @tanstack/react-query
- **Payments**: stripe, stripe-replit-sync
- **i18n**: i18next, react-i18next, i18next-browser-languagedetector

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OpenID Connect issuer (defaults to Replit)
- Stripe credentials are fetched dynamically through Replit's connector API