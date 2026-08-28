/**
 * Importing the research files, repeatedly, without destroying anyone's work.
 *
 * THE RULE THIS FILE ENFORCES
 *
 * The CSVs own the public research. People own everything else.
 *
 * A row in data/prospects records what could be found on the open web: the
 * organization's name, website, published contact, why it looked promising.
 * Re-importing should refresh those. Everything a person adds afterwards - who
 * they spoke to, what was said, whether the organization is a partner - exists
 * nowhere else. There is no second copy, so an import that overwrote it would
 * destroy it permanently, and the only symptom would be a colleague's notes
 * quietly emptying.
 *
 * New imported prospects begin ready_to_contact. Re-importing an existing row
 * never rewrites its CRM status, so contacted, replied, suppressed and partner
 * history cannot be reset by refreshing public research.
 *
 * WHY THIS IS NOT WIRED INTO STARTUP
 *
 * Migrations run on boot because a deploy that ships code without its columns
 * is broken. Nothing about this data is like that: the app works perfectly with
 * an empty prospect table. An import on every boot would instead mean every
 * restart re-writes rows nobody asked it to touch.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pool } from "../db";
import { parseProspectCsv, type ParsedProspect, type RowProblem } from "./prospectCsv";

export interface ImportSummary {
  created: number;
  updated: number;
  /** Rows whose public research already matched; no write was needed. */
  unchanged: number;
  skipped: number;
  problems: Array<RowProblem & { file: string }>;
  files: string[];
}

/**
 * Two rows in one run claiming the same organization.
 *
 * The later one is dropped rather than merged: a genuine duplicate is a data
 * problem in the source file that somebody should look at, and silently
 * picking a winner hides it.
 */
function dedupeWithinRun(
  prospects: Array<ParsedProspect & { file: string; line: number }>,
): {
  unique: Array<ParsedProspect & { file: string; line: number }>;
  problems: Array<RowProblem & { file: string }>;
} {
  const seen = new Map<string, { file: string; line: number }>();
  const unique: Array<ParsedProspect & { file: string; line: number }> = [];
  const problems: Array<RowProblem & { file: string }> = [];

  for (const prospect of prospects) {
    const previous = seen.get(prospect.dedupeKey);
    if (previous) {
      problems.push({
        file: prospect.file,
        line: prospect.line,
        reason: `${prospect.organizationName}: duplicate of ${previous.file} line ${previous.line}`,
      });
      continue;
    }
    seen.set(prospect.dedupeKey, { file: prospect.file, line: prospect.line });
    unique.push(prospect);
  }

  return { unique, problems };
}

export const PROSPECT_DATA_DIR = path.resolve(process.cwd(), "data", "prospects");

/**
 * Read every CSV in the prospect directory and write what they hold.
 *
 * Returns counts rather than logging them, so the command-line wrapper and any
 * future admin trigger report the same numbers.
 */
export async function importProspects(dir: string = PROSPECT_DATA_DIR): Promise<ImportSummary> {
  const entries = await readdir(dir);
  const files = entries.filter((name) => name.toLowerCase().endsWith(".csv")).sort();

  const parsed: Array<ParsedProspect & { file: string; line: number }> = [];
  const problems: Array<RowProblem & { file: string }> = [];

  for (const file of files) {
    const text = await readFile(path.join(dir, file), "utf8");
    const result = parseProspectCsv(text, file);
    problems.push(...result.problems.map((p) => ({ ...p, file })));
    // Line numbers are recomputed here rather than threaded through the parser,
    // which returns prospects in file order.
    let line = 1;
    for (const prospect of result.prospects) {
      line += 1;
      parsed.push({ ...prospect, file, line });
    }
  }

  const { unique, problems: duplicateProblems } = dedupeWithinRun(parsed);
  problems.push(...duplicateProblems);

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const prospect of unique) {
    // ON CONFLICT rather than SELECT-then-INSERT: two imports running at once
    // would otherwise both find nothing and both insert.
    //
    // ready_to_contact is supplied only for INSERT. The DO UPDATE list remains
    // public research only, which means refreshing a row can never reopen a
    // campaign or overwrite a human/automation outcome.
    const result = await pool.query<{ id: string; was_insert: boolean }>(
      `INSERT INTO partner_prospects (
         organization_name, dedupe_key, segment, segment_raw, market, state,
         website, public_contact, candidate_signal, known_exam_volume,
         priority, why_it_matters, source_url, outreach_status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'ready_to_contact')
       ON CONFLICT (dedupe_key) DO UPDATE SET
         organization_name = EXCLUDED.organization_name,
         segment           = EXCLUDED.segment,
         segment_raw       = EXCLUDED.segment_raw,
         market            = EXCLUDED.market,
         state             = EXCLUDED.state,
         website           = EXCLUDED.website,
         public_contact    = EXCLUDED.public_contact,
         candidate_signal  = EXCLUDED.candidate_signal,
         known_exam_volume = EXCLUDED.known_exam_volume,
         priority          = EXCLUDED.priority,
         why_it_matters    = EXCLUDED.why_it_matters,
         source_url        = EXCLUDED.source_url,
         updated_at        = now()
       -- Only write when the file actually says something different.
       --
       -- This also does the counting. A DO UPDATE whose WHERE is false updates
       -- nothing and returns no row, so "no row came back" means the record
       -- already matched - which is why a second run of an unchanged file
       -- reports 62 unchanged rather than 62 updates, and leaves updated_at
       -- alone so it still means "when did this last actually change".
       --
       -- The comparison must live here rather than in RETURNING: inside DO
       -- UPDATE the table name is the existing row, but by RETURNING it is the
       -- new one, so the same expression there would compare a value with itself.
       WHERE partner_prospects.organization_name IS DISTINCT FROM EXCLUDED.organization_name
          OR partner_prospects.segment           IS DISTINCT FROM EXCLUDED.segment
          OR partner_prospects.segment_raw       IS DISTINCT FROM EXCLUDED.segment_raw
          OR partner_prospects.market            IS DISTINCT FROM EXCLUDED.market
          OR partner_prospects.state             IS DISTINCT FROM EXCLUDED.state
          OR partner_prospects.website           IS DISTINCT FROM EXCLUDED.website
          OR partner_prospects.public_contact    IS DISTINCT FROM EXCLUDED.public_contact
          OR partner_prospects.candidate_signal  IS DISTINCT FROM EXCLUDED.candidate_signal
          OR partner_prospects.known_exam_volume IS DISTINCT FROM EXCLUDED.known_exam_volume
          OR partner_prospects.priority          IS DISTINCT FROM EXCLUDED.priority
          OR partner_prospects.why_it_matters    IS DISTINCT FROM EXCLUDED.why_it_matters
          OR partner_prospects.source_url        IS DISTINCT FROM EXCLUDED.source_url
       RETURNING id, (xmax = 0) AS was_insert`,
      [
        prospect.organizationName,
        prospect.dedupeKey,
        prospect.segment,
        prospect.segmentRaw,
        prospect.market,
        prospect.state,
        prospect.website,
        prospect.publicContact,
        prospect.candidateSignal,
        prospect.knownExamVolume,
        prospect.priority,
        prospect.whyItMatters,
        prospect.sourceUrl,
      ],
    );

    const row = result.rows[0];
    if (!row) unchanged += 1;
    else if (row.was_insert) created += 1;
    else updated += 1;
  }

  return {
    created,
    updated,
    unchanged,
    skipped: problems.filter((p) => p.reason.includes("duplicate") || p.reason.includes("no organization")).length,
    problems,
    files,
  };
}
