# Three-site operations controller: first executable layer

This is a bounded public-verification controller, **not a deployed AI sales team**.
It provides real scheduling, a resumable queue, role-specific checks, evidence,
retry limits, and a separate heartbeat check. It never changes a customer's
account, sends outreach, or calls a paid model. Installing this source does not
connect Stripe, Render, email accounts or an AI provider.

## What runs

`operations-monitor.yml` runs hourly at minute 17 UTC and after approved changes
merge to main. It also runs offline tests on relevant PRs. Only the main-branch
verification job has permission to update the existing operations ledger issue
#202. PR tests never get its issue-writing token. Standard Ubuntu runners only;
no dependency installation, paid model calls, additional hosting, artifacts,
cache storage or subscriptions are requested. Jobs skip if this repository is
made private. Existing repository CI remains unchanged.

The four deterministic specialist roles are availability, deployment, SEO and
conversion presentation. Eight allowlisted checks inspect the three public
homepages, the MyEasyPass scheduling redirect/sitemap/free-test page, Work-A-Beez
trial copy, and the artist merchandise page. A merchandise HTTP 200 is NOT a
completed checkout; a matching title is NOT Google indexing; 30-day copy is NOT
verification of a Stripe subscription. Client-rendered text may be absent from
raw HTML, and findings require interpretation before making source changes.

The existing weekly SEO and music tasks retain their scopes. This monitor does
not create a second email sender, restart old campaigns, or replace the product
question-bank audit. Status is maintained in one issue, not hourly new issues
or unsolicited email. Workflow notifications depend on the owner's GitHub
notification settings; no new notification channel is silently enabled.

## Durable state and recovery

Each job has a policy version, hourly idempotency key, state, attempt count, due
time, lease and evidence. SQLite uses atomic claims and lease-checked writes;
stale workers cannot complete reclaimed jobs. Network failures retry at most
three times. One unavailable site does not prevent other checks from running.
A completed job is not repeated within the same hourly window.

The GitHub runner's filesystem is ephemeral, so the hosted mode restores and
checkpoints a strictly validated public-only snapshot in issue #202. Recent
state survives runner replacement. The issue carries only fixed check IDs,
HTTP status, Boolean signals, body hashes, times and queue state. No page text,
headers, contact lists, customer records, financial baselines or tokens are
published. It retains six hourly windows (at most 48 normal records); older
monitor checks are deliberately superseded rather than creating an unbounded
backlog. The snapshot validator caps inputs at 96 records.

Only this workflow should write the ledger. GitHub workflow concurrency prevents
overlapping hosted writers. SQLite concurrency protection applies to a shared
local database, not separate replicas. A request interrupted before its
checkpoint may be repeated, which is safe because all site actions are GETs.
Do not reuse this retry behavior for email sends, payments or other writes.
Exactly-once external side effects are **not** implemented.

A separate daily workflow at 13:47 UTC recomputes whether an entire verification
cycle finished within three hours. It does not trust a supplied heartbeat field
or refresh the heartbeat itself. It exits unsuccessfully when the record is
missing/stale. It is independent of the worker job, but **not an independent
hosting provider**: a GitHub-wide outage could delay both schedules. An external
watchdog is still needed before claiming high availability.

## Run and test

Python 3.10+ and the standard library are sufficient.

```bash
python3 -m unittest discover -s ops/mission -p 'test_*.py' -v
python3 ops/mission/controller.py --network --db /private/persistent/operations.sqlite3
```

No network is used by tests. Without `--network`, execution is refused. Local
mode is single-pass unless `--loop-seconds 60` is supplied. For a persistent
host, the database must be on durable storage. Do not point it at an ephemeral
Render filesystem and claim restart persistence. No Render service or disk is
provisioned by this change.

GitHub mode additionally requires the runtime `GITHUB_TOKEN`, the exact
`GITHUB_REPOSITORY=LBSconnect/Easy-Pass`, and `--github-issue 202`. The token is
passed only to api.github.com for GET/PATCH of that single issue; authenticated
redirects are not followed. It is never forwarded to site checks. Site redirects
are bounded and restricted to the reviewed owned-site HTTPS host allowlist.
Remote text and issue fields cannot select arbitrary commands, targets or tools.

## Stop and rollback

Set repository variable `THREE_SITE_OPS_STOP=1` or disable the two workflows.
Closing issue #202 also makes the next monitor refuse work before visiting sites
(the watchdog will report no accessible heartbeat until disabled). In local
mode, stop the process or set `OPS_STOP=1` before launch. This code never changes
the product database, so rollback is reverting this isolated PR and disabling
the schedules; no customer migration is involved.

## Not implemented by this first layer

- No model-backed planner, autonomous code repair or sales specialist is active.
- No live/private Stripe, Render, Search Console or customer database access.
- No cross-channel outreach execution or unified suppression database.
- No hosting provisioning, spending authority or existing-customer repricing.
- No financial outcomes are inferred from checks, tasks or green tests.

The next private execution layer should use scoped runtime credentials and an
owner-controlled durable database; it must not store business/customer data in
this public ledger. Email/payment writes need provider idempotency and receipt
reconciliation. Model workers need explicit budgets and tool permissions before
activation. Continue existing implementation PRs rather than duplicating them.

## Sources informing the hosting choice

- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Scheduled workflow limitations: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- Render worker model: https://render.com/docs/background-workers
- Render filesystem persistence: https://render.com/docs/disks

These explain platform behavior, not proof of this installation's runtime
success. The PR checks, workflow execution, and issue checkpoint are the proof.
