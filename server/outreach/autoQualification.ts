import { pool } from "../db";
import { importProspects } from "../partners/prospectImport";

/**
 * Keep the CRM's pre-contact population ready for automated outreach.
 *
 * The user-facing state is now simple: a normal prospect that has not entered a
 * campaign defaults to ready_to_contact. Delivery safety remains independent
 * of that label. A prospect still cannot be enrolled without a literal email,
 * suppressed addresses stay blocked, existing campaign recipients stay
 * deduplicated, activated partners stay excluded, and the dispatcher still
 * enforces the daily send limit.
 *
 * Repository prospect files are synced before qualification so newly researched
 * public contact details reach production without a separate manual database
 * import. The importer only refreshes public-research columns on existing rows;
 * it does not overwrite campaign state, notes, partner state, or other CRM work.
 * A sync failure is logged but does not disable outreach from data already in
 * the database.
 *
 * Public research may contain a literal business email inside public_contact.
 * We may copy that literal address into contact_email, but never guess or
 * generate one. When several prospect rows share one mailbox, only the
 * highest-ranked row gets that public address promoted into the canonical
 * contact_email field; the cross-campaign recipient guard remains the final
 * duplicate-send protection.
 */
export async function autoQualifyProspects(limit: number): Promise<number> {
  if (!Number.isFinite(limit) || limit <= 0) return 0;

  try {
    const sync = await importProspects();
    if (sync.created > 0 || sync.updated > 0) {
      console.info(
        `[Outreach] prospect research sync: ${JSON.stringify({
          created: sync.created,
          updated: sync.updated,
          unchanged: sync.unchanged,
          skipped: sync.skipped,
        })}`,
      );
    }
  } catch (error) {
    console.error("[Outreach] prospect research sync failed; continuing with existing CRM data", error);
  }

  // First make every untouched, safe prospect visibly ready. This is not a
  // send operation and is intentionally not limited by today's email budget.
  // Phone-only/no-email prospects can be ready while remaining unsendable.
  await pool.query(
    `WITH sourced AS (
       SELECT p.id,
              CASE
                WHEN lower(trim(coalesce(p.contact_email, ''))) ~
                     '^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$'
                  THEN lower(trim(p.contact_email))
                ELSE lower(substring(coalesce(p.public_contact, '') from
                     '([A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,})'))
              END AS send_email
         FROM partner_prospects p
     )
     UPDATE partner_prospects p
        SET outreach_status = 'ready_to_contact',
            updated_at = now()
       FROM sourced s
      WHERE p.id = s.id
        AND p.outreach_status IN ('not_contacted', 'researching')
        AND p.partner_active = false
        AND p.partner_created_at IS NULL
        AND p.partner_status = 'prospect'
        AND NOT EXISTS (
              SELECT 1 FROM partner_outreach_campaigns c
               WHERE c.prospect_id = p.id
            )
        AND (
              s.send_email IS NULL OR NOT EXISTS (
                SELECT 1 FROM partner_email_suppressions x
                 WHERE lower(trim(x.email)) = s.send_email
              )
            )`,
  );

  // Then prepare at most today's remaining new-send budget with canonical
  // literal email addresses. Ranking and mailbox dedupe decide which row wins
  // when the same public mailbox appears on multiple prospect records.
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
                           WHEN 'Low' THEN 3
                           ELSE 4
                         END,
                         coalesce(p.known_exam_volume, 0) DESC,
                         p.organization_name
              ) AS recipient_rank
         FROM sourced p
        WHERE p.outreach_status = 'ready_to_contact'
          AND p.send_email IS NOT NULL
          AND p.send_email <> ''
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
                 WHERE lower(trim(s.email)) = p.send_email
              )
     ), candidates AS (
       SELECT p.id, p.send_email
         FROM ranked p
        WHERE p.recipient_rank = 1
        ORDER BY CASE p.priority
                   WHEN 'Very High' THEN 0
                   WHEN 'High' THEN 1
                   WHEN 'Medium' THEN 2
                   WHEN 'Low' THEN 3
                   ELSE 4
                 END,
                 coalesce(p.known_exam_volume, 0) DESC,
                 p.organization_name
        LIMIT $1
     )
     UPDATE partner_prospects p
        SET contact_email = c.send_email,
            updated_at = now()
       FROM candidates c
      WHERE p.id = c.id
      RETURNING p.id`,
    [Math.floor(limit)],
  );

  return result.rowCount ?? result.rows.length;
}
