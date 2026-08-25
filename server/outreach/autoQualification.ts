import { pool } from "../db";

/**
 * Automatically promote researched prospects into the dispatch queue.
 *
 * This is deliberately conservative. Automation may only promote a prospect
 * when there is a real business email already present in the CRM OR published
 * in the imported public-contact research. We may extract a literal public
 * email address from that research, but we never guess or generate an address.
 * We never revive a suppressed address and never touch any record that has
 * already entered a campaign or partner relationship.
 *
 * A mailbox is also treated as one outreach recipient even when the research
 * contains multiple organization/location rows pointing at the same public
 * address. Only the highest-ranked prospect for that normalized email may be
 * promoted, and an address that already has any campaign is never promoted
 * again for a different prospect.
 *
 * The dispatcher calls this only inside the normal business-hours and
 * deliverability gates, and only for the number of new sends still available
 * in today's budget. That keeps queue population aligned with the existing
 * first-wave safety limits instead of bulk-promoting the entire database.
 */
export async function autoQualifyProspects(limit: number): Promise<number> {
  if (!Number.isFinite(limit) || limit <= 0) return 0;

  const result = await pool.query<{ id: string }>(
    `WITH sourced AS (
       SELECT p.*,
              CASE
                WHEN lower(trim(coalesce(p.contact_email, ''))) ~
                     '^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$'
                  THEN lower(trim(p.contact_email))
                ELSE lower(substring(coalesce(p.public_contact, '') from
                     '([A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,})'))
              END AS send_email
         FROM partner_prospects p
     ), ranked AS (
       SELECT p.id,
              p.send_email,
              p.priority,
              p.known_exam_volume,
              p.organization_name,
              row_number() OVER (
                PARTITION BY p.send_email
                ORDER BY CASE p.priority
                           WHEN 'Very High' THEN 0
                           WHEN 'High' THEN 1
                           WHEN 'Medium' THEN 2
                           ELSE 3
                         END,
                         coalesce(p.known_exam_volume, 0) DESC,
                         p.organization_name
              ) AS recipient_rank
         FROM sourced p
        WHERE p.outreach_status IN ('not_contacted', 'researching')
          AND p.send_email IS NOT NULL
          AND p.send_email <> ''
          AND p.priority IN ('Very High', 'High', 'Medium')
          AND p.segment <> 'other'
          AND p.partner_active = false
          AND p.partner_created_at IS NULL
          AND p.partner_status = 'prospect'
          AND NOT EXISTS (
                SELECT 1 FROM partner_outreach_campaigns c
                 WHERE c.prospect_id = p.id
              )
          AND NOT EXISTS (
                SELECT 1 FROM partner_outreach_campaigns c
                 WHERE lower(trim(c.contact_email)) = p.send_email
              )
          AND NOT EXISTS (
                SELECT 1 FROM partner_email_suppressions s
                 WHERE s.email = p.send_email
              )
     ), candidates AS (
       SELECT p.id, p.send_email
         FROM ranked p
        WHERE p.recipient_rank = 1
        ORDER BY CASE p.priority
                   WHEN 'Very High' THEN 0
                   WHEN 'High' THEN 1
                   WHEN 'Medium' THEN 2
                   ELSE 3
                 END,
                 coalesce(p.known_exam_volume, 0) DESC,
                 p.organization_name
        LIMIT $1
     )
     UPDATE partner_prospects p
        SET outreach_status = 'ready_to_contact',
            contact_email = CASE
              WHEN p.contact_email IS NULL OR trim(p.contact_email) = ''
                THEN c.send_email
              ELSE p.contact_email
            END,
            updated_at = now()
       FROM candidates c
      WHERE p.id = c.id
      RETURNING p.id`,
    [Math.floor(limit)],
  );

  return result.rowCount ?? result.rows.length;
}
