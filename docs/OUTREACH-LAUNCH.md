# MyEasyPass partner outreach launch

This runbook covers the deliberately small first production wave of automated partner outreach.

## Sender identity

The outreach engine stays on the existing Resend account. Do not spoof an unverified domain.

Before using the preferred public identity, verify `partners.myeasypass.net` (or the parent `myeasypass.net` domain in a configuration that authorizes the subdomain) in the same Resend account and publish the DNS records Resend requires.

Preferred configuration:

```text
OUTREACH_FROM_EMAIL=Sean at MyEasyPass <sean@partners.myeasypass.net>
OUTREACH_REPLY_TO=info@lbsconect.net
```

This makes the visible sender `sean@partners.myeasypass.net` while replies can continue to land in the existing LBS inbox.

If the MyEasyPass sender domain is not verified yet, do **not** fake the address. Use the currently verified sender until DNS verification is complete.

## Business identity in every message

Every outreach-v2 message contains the operating identity and mailing address:

```text
MyEasyPass | Linton Business Solutions
616 FM 1960 Road West, Suite 101
Houston, Texas 77090-3048
```

The existing one-click unsubscribe footer and List-Unsubscribe headers remain in place.

## Launch volume

The code default is now **5 new prospects per business day**. Due follow-ups still run on schedule.

Recommended ramp:

- First wave: 3-5 new prospects/day.
- After clean delivery: 5-8/day by setting `OUTREACH_DAILY_LIMIT`.
- After the message has produced real replies: up to 8-10/day if desired.

Do not increase volume merely to finish the list faster. This is a small, high-value account list.

## Deliverability circuit breakers

The campaign pauses when:

- any spam complaint is recorded in the seven-day window; or
- at least 10 recent sends exist and the hard-bounce rate exceeds **3%**.

Do not automatically override a pause. Investigate the affected addresses/source data first.

## Email selection

Only place a prospect in `ready_to_contact` when the address is a publicly listed or otherwise verified business contact appropriate for the organization.

Do not guess private addresses. Do not generate likely first.last@domain addresses.

## Outreach-v2 positioning

Subjects no longer lead with `Free`. The email leads with the business problem and positions the no-cost pilot as the low-friction way to evaluate MyEasyPass.

The readiness check is described as highlighting areas that **may need more work**. It does not claim a ten-question snapshot can predict exactly what would make a candidate fail.

The CTA is intentionally asynchronous:

```text
If this could be useful, just reply "yes" and I'll send the pilot details.
```

A bare `yes` is already classified by the outreach state machine as `interested`, which immediately stops the remaining automated sequence and surfaces the prospect for the warm-partner workflow.

## Recommended first-wave strategy

Do not spend the first copy test on the largest strategic accounts.

Start with 5-10 high-fit, approachable Texas organizations such as independent/regional licensing schools and training providers. Use real delivery and reply behavior to validate the message before moving to the highest-value statewide/national prospects.

Primary campaign metrics:

```text
Delivered -> Replied -> Interested -> Pilot -> Activated Partner -> Referred Candidate -> Verified Subscription
```

Do not optimize the campaign around open rates.

## Required launch check

Before the first real prospect:

1. Confirm the intended From domain is verified in Resend.
2. Send an internal test through the production outreach path.
3. Confirm visible From and Reply-To identities.
4. Confirm the physical address is present.
5. Confirm the unsubscribe link works.
6. Reply `yes` from the test inbox and confirm the sequence stops and the prospect becomes `interested`.
7. Confirm the webhook processes the reply and the admin CRM surfaces it.
8. Only then mark the first real wave `ready_to_contact`.
