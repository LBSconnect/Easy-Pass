import { pool } from "../db";

/**
 * Automatically promote researched prospects into the dispatch queue.
 *
 * This is deliberately conservative. Automation may only promote a prospect
 * when the CRM already contains an explicit contact_email and the record is a
 * normal prospect with a meaningful priority. We never invent or derive an
 * address here, never revive a suppressed address, and never touch any record
 * that has already entered a campaign or partner relationship.
 *
 * The dispatcher calls this only inside the normal business-hours and
 * deliverability gates, and only for the number of new sends still available
 * in today's budget. That keeps queue population aligned with the existing
 * first-wave safety limits instead of bulk-promoting the entire database.
 */
export async function autoQualifyProspects(limit: number): Promise<number> {
  if (!Number.isFinite(limit) || limit <= 0) return 0;

  const result = await pool.query<{ id: string }>(
    `WITH candidates AS (
       SELECT p.id
         FROM partner_prospects p
        WHERE p.outreach_status IN ('not_contacted', 'researching')
          AND p.contact_email IS NOT NULL
          AND trim(p.contact_email) <> ''
          AND position('@' in p.contact_email) > 1
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
                SELECT 1 FROM partner_email_suppressions s
                 WHERE s.email = lower(trim(p.contact_email))
              )
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
            updated_at = now()
       FROM candidates c
      WHERE p.id = c.id
      RETURNING p.id`,
    [Math.floor(limit)],
  );

  return result.rowCount ?? result.rows.length;
}
