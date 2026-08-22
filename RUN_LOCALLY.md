# Running Easy Pass Locally

## System Requirements

- **Node.js**: Version 20.x (LTS recommended)
- **PostgreSQL**: Version 16.x
- **npm**: Comes with Node.js

## Environment Variables

Create a `.env` file in the project root with these values:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/easypass`) |
| `SESSION_SECRET` | Random string for session encryption (generate a secure random string) |
| `ADMIN_EMAIL` | Email address for the admin user (e.g., `info@lbsconnect.net`) |
| `PORT` | Server port (default: `5000`) |

### Optional (for full functionality)

**For Stripe payments:**
- Stripe API keys configured through Stripe's dashboard

**For email functionality:**
- Resend API key for password reset emails

## Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <project-folder>

# 2. Install dependencies
npm install

# 3. Push database schema to PostgreSQL
npm run db:push
```

## Running the Application

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (frontend + backend on port 5000) |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Sync database schema with Drizzle |

## Key Dependencies

- **Frontend**: React 18, Vite 7, TailwindCSS, shadcn/ui, TanStack Query, Wouter (routing), i18next (translations)
- **Backend**: Express.js, TypeScript, Drizzle ORM, Passport.js (local auth), bcryptjs
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe
- **Email**: Resend
- **Testing**: Playwright

## Notes

- The app binds to port **5000** for both frontend and backend
- Stripe webhooks arrive at `/api/stripe/webhook` as ordinary signed requests; for local testing use the Stripe CLI (`stripe listen --forward-to localhost:5000/api/stripe/webhook`)
- Database migrations use Drizzle Kit's `push` command (not traditional migration files)
