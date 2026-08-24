# Automated partner outreach qualification

The production outreach cron must not depend on a person manually changing researched prospects to `ready_to_contact`.

During a normal in-hours dispatch, after existing due campaign work is processed and before new enrollment, the engine automatically promotes only enough qualifying prospects to fill the remaining daily new-prospect budget.

A prospect is auto-qualified only when all of the following are true:

- current outreach status is `not_contacted` or `researching`;
- an explicit `contact_email` already exists in the CRM;
- priority is `Very High`, `High`, or `Medium`;
- segment is known and is not `other`;
- relationship status is still `prospect` and the partner has never been activated;
- no outreach campaign already exists for that prospect; and
- the email address is not suppressed.

Automation never guesses or derives an email address. Low-priority, unknown-segment, missing-email, suppressed, already-campaigned, and partner records remain untouched for human review.

The dispatch result exposes `autoQualified` so a successful cron run shows whether queue population occurred instead of silently reporting success with an empty manual queue.
