# CI & Automated Site Health

This repo has two GitHub Actions workflows under `.github/workflows/`:

## `ci.yml` — Pull request / push checks

**Triggers:** every pull request into `main`, and every push to `main`.

**What it does:** checkout, Node 20 setup (`actions/setup-node` with npm
cache), `npm ci`, then in order: `npm run check` (TypeScript), `npm test`
(Vitest unit tests), `npm run build` (production build). Any step failing
fails the workflow.

**Secrets required: none.** All four commands run fully offline — no
`DATABASE_URL`, no Stripe keys, nothing. This was verified directly before
the workflow was added.

**To actually block merges on this**, a repo admin needs to turn on branch
protection for `main` (Settings → Branches → Branch protection rules) and
require the `Type check, test, and build` status check. The workflow alone
only reports pass/fail; it does not by itself prevent a merge.

## `weekly-site-health.yml` — Weekly automated health check

**Trigger:** intended to run once a week, Friday 00:00 America/Chicago.

### Why there are two cron lines and a "guard" step

GitHub Actions' `schedule:` cron always runs in UTC and does not shift for
daylight saving time. Friday 00:00 America/Chicago is either 05:00 UTC
(CDT, UTC-5, roughly mid-March–early-November) or 06:00 UTC (CST, UTC-6,
the rest of the year). The workflow registers **both** cron expressions:

```yaml
schedule:
  - cron: "0 5 * * 5" # ~Friday 00:00 CDT
  - cron: "0 6 * * 5" # ~Friday 00:00 CST
```

Both fire every week regardless of season. A **guard step** at the very
start of the job computes the real wall-clock time in America/Chicago
(`TZ=America/Chicago date`, which correctly follows the IANA tz database
and DST rules) and only lets the rest of the job run if it's within ~30
minutes of Friday 00:00 local time. The "wrong" weekly firing (about an
hour off from local midnight, on either side depending on the season) hits
the guard, logs why, and exits cleanly with no work done — it does not
fail.

You can bypass the guard for manual testing by running the workflow via
**Actions → Weekly Site Health → Run workflow** with `force_run` checked.

**Known limitation:** GitHub's cron scheduler has a documented delay of up
to several minutes (occasionally longer under platform-wide load) and can
rarely skip a scheduled run entirely. That's a GitHub platform limitation,
not a bug in this workflow — a missed run simply waits for the following
Friday.

### What the job does (once the guard passes)

1. Checks out `main`, runs `npm ci`.
2. Runs `npm run check`, `npm test`, `npm run build` independently (so a
   failure in one doesn't hide results from the others).
3. Runs `scripts/check-broken-links.mjs` — a lightweight internal
   link-checker. It reads the SPA's route table straight out of
   `client/src/App.tsx` and cross-checks every internal `href="/..."` in
   `client/src` against it (skipping external links, `/api/*` server
   endpoints, and hrefs built from dynamic expressions it can't statically
   resolve).
4. Runs `npm audit --production` and captures the JSON output.
5. Attempts a **conservative auto-fix** (`scripts/fix-broken-links.mjs`)
   for any broken link with exactly one route match within edit-distance
   2 (e.g. a typo'd or trailing-slash path). It **never** touches
   `shared/schema.ts`, `server/routes.ts`, `server/simpleAuth.ts`,
   `server/subscriptionCheck.ts`, or any legal/pricing page — those are
   hard-coded on a denylist regardless of match confidence.
6. Writes a dated report to `/reports/site-health/YYYY-MM-DD/report.md`
   (checks passed/failed, dependency alert summary, broken-link findings,
   commit SHA, start/end time, and a "Recommended human actions" section).
   The report never includes secrets or personal data — only aggregate
   counts and source file/line references.
7. Commits the report (and the auto-fix, if any) to a new branch
   `site-health/YYYY-MM-DD` and opens a PR into `main`, labeled
   `site-health`, with the report embedded in the PR body.
8. Optionally enables auto-merge on that PR (see below).
9. Optionally posts a notification (see below).
10. Fails the job (red X) if any of the three core checks failed, even
    though the report/PR/notification steps still ran.

### Auto-merge — OFF by default

Auto-merge is controlled by the **repo variable** `AUTO_MERGE_WEEKLY_FIXES`
(Settings → Secrets and variables → Actions → Variables — not a secret).
It is off unless a repo admin explicitly sets it:

```
AUTO_MERGE_WEEKLY_FIXES = true
```

Even when set to `true`, the workflow still refuses to auto-merge if:

- any of `npm run check` / `npm test` / `npm run build` failed that run, **or**
- the PR's diff touches `shared/schema.ts`, `server/routes.ts`,
  `server/simpleAuth.ts`, `server/subscriptionCheck.ts`,
  `server/webhookHandlers.ts`, or any legal/pricing page.

That safety check runs unconditionally — it is not gated by the variable.
When eligible, the workflow calls `gh pr merge --squash --auto`, which
enables GitHub's native auto-merge (the PR merges once required status
checks — including `ci.yml`, if branch protection requires it — pass).
This also requires "Allow auto-merge" to be turned on in repo settings; if
it isn't, the step logs that and leaves the PR open for manual review.

To turn auto-merge on: **Settings → Secrets and variables → Actions →
Variables → New repository variable**, name `AUTO_MERGE_WEEKLY_FIXES`,
value `true`. To turn it back off, delete the variable or set it to
anything other than `true`.

### Notifications — no-op unless configured

If the repo secret `NOTIFY_WEBHOOK_URL` is set, the workflow POSTs a short
JSON summary (`repo`, `report_date`, `any_check_failed`,
`needs_manual_review`, `pr_url`) to it whenever a check failed or a PR was
opened that needs manual review (i.e., wasn't auto-merged). If the secret
isn't set, the step logs a clear line and exits cleanly — it never fails
the job.

To configure it: **Settings → Secrets and variables → Actions → Secrets →
New repository secret**, name `NOTIFY_WEBHOOK_URL`, value = your
webhook endpoint (Slack incoming webhook, generic HTTP endpoint, etc.).

## Study reminder emails — nothing sends until you schedule it

`POST /api/reminders/dispatch` sends the reminder emails that are due. **The
app has no scheduler of its own**, so with nothing configured to call this
route, no reminder email is ever sent. That is the default state, and it is
deliberate — sending mail to every opted-in student is not something to
switch on by accident.

To turn it on, two things are needed:

1. **`REMINDER_DISPATCH_SECRET`** set in the Render environment. Without it,
   the route returns 503 for every request. With it, a request must carry the
   same value in an `x-reminder-secret` header or it gets a 401. A session
   cookie does not work — the caller is a scheduler, not a person.
2. **Something calling it on a schedule.** A Render cron job is the simplest:

   ```
   curl -fsS -X POST https://www.myeasypass.net/api/reminders/dispatch \
     -H "x-reminder-secret: $REMINDER_DISPATCH_SECRET"
   ```

   Daily is a sensible cadence. It is safe to run more often — a student can
   only receive one reminder every seven days, and that limit is enforced by a
   timestamp in the database rather than by how often the job runs. Running it
   twice in a row sends nothing the second time.

`RESEND_API_KEY` must also be set, or the route returns
`{"emailUnavailable": true}` and sends nothing.

The response says exactly what happened — `considered`, `sent`, `skipped`
(nothing worth emailing about, so they stay eligible), `failed` — and the same
line is written to the server log.

Students are opted out unless they turn reminders on in their profile, and
every message carries an unsubscribe link that works without signing in.

## Automated partner outreach — off by default, gated four ways

`POST /api/outreach/dispatch` runs one pass of the partner outreach engine:
due follow-ups first, then new prospects up to the daily limit. It follows
the same pattern as reminders — **no scheduler in the app**, a secret-guarded
route an external cron calls — plus a master switch, because this route
emails organizations who have not asked to hear from us and must never start
by accident.

Everything below must be true before a single outreach email leaves:

1. **`OUTREACH_ENABLED=true`.** Absent or anything else, every dispatch run
   answers `{"ran": false}` and sends nothing.
2. **`OUTREACH_DISPATCH_SECRET`** set, and the caller sends it in an
   `x-outreach-secret` header (503 unset, 401 wrong — same as reminders).
3. **`OUTREACH_FROM_EMAIL`** set (e.g. `Sean at MyEasyPass
   <partners@myeasypass.net>`), plus the existing `RESEND_API_KEY`.
4. **The clock agrees**: business days, 9am–5pm Central, enforced inside the
   run. A cron firing overnight or on a weekend finds nothing to do.

Optional: `OUTREACH_REPLY_TO` (defaults to the from address),
`OUTREACH_ALERT_EMAIL` (where interested-prospect alerts go),
`OUTREACH_SENDER_NAME` (signature name, default "Sean"),
`OUTREACH_DAILY_LIMIT` (new prospects per business day, default 15, hard cap
20). A sensible cron is hourly on business days — the run itself decides what
is actually due, and running it twice sends nothing twice (enforced by a
unique index, not by the caller's discipline).

Replies, bounces and complaints arrive via `POST /api/outreach/webhook` — a
Resend webhook endpoint verified with **`OUTREACH_WEBHOOK_SECRET`** (the
endpoint's `whsec_…` value from the Resend dashboard; 503 unset, 401 on any
unverifiable request). Configure the Resend webhook to send bounce, complaint
and inbound-email events there. Every outreach email carries a one-click
unsubscribe link (`/api/outreach/unsubscribe`) that works without any login
and suppresses the address permanently.

## Deployment

Render auto-deploys from `main` (its standard behavior for this project).
Neither workflow deploys anything — **merging a PR into `main` is the
deployment step.** `ci.yml` is what gives you confidence before that merge
happens; branch protection (see above) is what actually enforces it.
