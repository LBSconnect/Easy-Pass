# Texas MyEasyPass Prospect Database

This directory contains researched public-business prospect data for MyEasyPass partnership and referral outreach across Texas.

## Files in this repo

- `real-estate-schools.csv` — 29 Texas real-estate education providers, including published TREC exam-volume data where available.
- `insurance-schools.csv` — 9 insurance education providers and associations.
- `brokerages.csv` — 12 real-estate brokerages / recruiting programs with pre-license or training signals.
- `insurance-agencies.csv` — 12 insurance agencies, brokerages, associations, and recruiting networks.

Together these files contain the full 62-prospect Phase 2 database in machine-readable form.

The richer Excel working workbook, including summary dashboards and the enriched Priority Hit List, is maintained separately from the repo because the current GitHub connector path is text-safe but not reliable for larger binary spreadsheet uploads. The CSVs in this directory are the canonical repo data for Claude/code to consume.

## Intended use

The data is meant to support ethical business-development workflows such as:

- identifying real-estate schools and insurance schools with licensing-candidate pipelines;
- identifying brokerages and insurance agencies that recruit pre-license candidates;
- prioritizing partnership, referral, readiness-test, and exam-prep outreach;
- building internal partner/referral tooling for MyEasyPass;
- tracking outreach status and next actions.

## Data handling

- Sources are public business websites, official regulator/association pages, and public business contact information.
- Do not treat a listed organization as a partner unless a partnership has actually been agreed.
- Do not imply endorsement, affiliation, or sponsorship in public-facing pages without permission.
- Do not use this dataset for spam, scraping private accounts, or automated unsolicited bulk messaging.
- Reverify contact details before outreach because public business information changes.

## Recommended workflow

1. Start with `Priority = Very High`, especially brokerages/agencies that explicitly recruit or train unlicensed candidates.
2. Reverify the listed public contact and decision-maker before first contact.
3. Use a personalized partnership message based on the prospect's actual recruiting/training model.
4. Track partner source/referral IDs through readiness starts, pricing clicks, checkout starts, and verified subscriptions.
5. Keep this directory out of the public client bundle; it is business-development data, not runtime application data.
