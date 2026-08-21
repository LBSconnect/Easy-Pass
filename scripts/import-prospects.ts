/**
 * Import the prospect research files. Run by a person, on purpose.
 *
 *   DATABASE_URL=... npx tsx scripts/import-prospects.ts
 *
 * Safe to run repeatedly: it refreshes the public research in
 * data/prospects/*.csv and leaves every CRM field - decision makers, notes,
 * outreach history, partner status - exactly as it found them.
 */

import { importProspects, PROSPECT_DATA_DIR } from "../server/partners/prospectImport";
import { pool } from "../server/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const dir = process.argv[2] ?? PROSPECT_DATA_DIR;
  console.log(`Importing prospects from ${dir}`);

  const summary = await importProspects(dir);

  console.log(`\nFiles read:  ${summary.files.join(", ")}`);
  console.log(`Created:     ${summary.created}`);
  console.log(`Updated:     ${summary.updated}`);
  console.log(`Unchanged:   ${summary.unchanged}`);
  console.log(`Skipped:     ${summary.skipped}`);

  if (summary.problems.length > 0) {
    console.log(`\nRows needing attention (${summary.problems.length}):`);
    for (const problem of summary.problems) {
      console.log(`  ${problem.file}:${problem.line}  ${problem.reason}`);
    }
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error("Prospect import failed:", error);
  await pool.end().catch(() => {});
  process.exit(1);
});
