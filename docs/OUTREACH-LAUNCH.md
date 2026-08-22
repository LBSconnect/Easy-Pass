# MyEasyPass partner outreach launch

This runbook covers the deliberately small first production wave of automated partner outreach.

## Sender identity

The outreach engine stays on the existing Resend account and the already-verified `lbsconnect.net` sending domain.

Use the same registered mailbox for every outreach send and reply path:

```text
OUTREACH_FROM_EMAIL=Sean at MyEasyPass <info@lbsconnect.net>
OUTREACH_REPLY_TO=info@lbsconnect.net
```

For partner outreach, do not use `sean@lbsconnect.net` or `sean.linton@lbsconnect.net`. The public outreach identity is always `Sean at MyEasyPass <info@lbsconnect.net>`, and all recipient replies go to `info@lbsconnect.net`.

## Automated reply handling

The automated `reply yes -> stop sequence -> send pilot details` flow depends on Resend delivering an `email.received` webhook.

A reply that lands only in the hosted `info@lbsconnect.net` mailbox does not automatically create that Resend inbound event. Before autonomous outreach is enabled, make sure replies also reach Resend inbound processing. The simplest path is to forward `info@lbsconnect.net` to the Resend-provided inbound address and verify with an internal test that the original prospect sender is preserved. If forwarding does not preserve the sender reliably, use a Resend inbound subdomain/address instead.

Do not assume reply automation works until a production test confirms the reply reaches `/api/outreach/webhook` as an `email.received` event.

## Business identity in every message

Every outreach-v2 message contains:

```text
MyEasyPass | Linton Business Solutions
616 FM 1960 Road West, Suite 101
Houston, Texas 77090-3048
```

The existing one-click unsubscribe footer and List-Unsubscribe headers remain in place.

## Launch volume

The code default is **5 new prospects per business day**. Due follow-ups still run on schedule.

Recommended ramp:

- First wave: 3-5 new prospects/day.
- After clean delivery: 5-8/day by setting `OUTREACH_DAILY_LIMIT`.
- After the message has produced real replies: up to 8-10/day if desired.

## Deliverability circuit breakers

The campaign pauses when:

- any spam complaint is recorded in the seven-day window; or
- at least 10 recent sends exist and the hard-bounce rate exceeds **3%**.

## Outreach-v2 positioning

The readiness check is described as highlighting areas that **may need more work**. The CTA remains asynchronous:

```text
If this could be useful, just reply "yes" and I'll send the pilot details.
```

When that reply reaches the Resend inbound webhook, the system stops the cold sequence and sends one pre-approved `pilot_details` response. The database prevents duplicate pilot-detail sends on webhook retries. Partner activation remains deliberate and is never performed from the reply classifier.

## Required launch check

Before the first real prospect:

1. Confirm `lbsconnect.net` is verified in Resend for sending.
2. Set `OUTREACH_FROM_EMAIL=Sean at MyEasyPass <info@lbsconnect.net>`.
3. Set `OUTREACH_REPLY_TO=info@lbsconnect.net`.
4. Configure and verify the inbound reply path into Resend.
5. Send an internal test through the production outreach path.
6. Confirm the visible From is `Sean at MyEasyPass <info@lbsconnect.net>` and Reply-To is `info@lbsconnect.net`.
7. Confirm the physical mailing address and unsubscribe link are present.
8. Reply `yes` from the test inbox.
9. Confirm the reply reaches the normal `info@lbsconnect.net` mailbox and `/api/outreach/webhook`, the prospect becomes `interested`, and exactly one pilot-details email is sent.
10. Confirm a webhook retry cannot duplicate the pilot-details email.
11. Only then mark the first real wave `ready_to_contact`.
