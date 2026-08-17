/**
 * Item difficulty calibration job.
 *
 * Measures how hard each question actually is from real student responses and
 * writes the result back onto the bank. Run it periodically - difficulty
 * estimates improve as more students answer, and a question that was
 * uncalibrated last month may have enough evidence now.
 *
 *   npx tsx server/calibrateDifficulty.ts --dry-run
 *   npx tsx server/calibrateDifficulty.ts
 *
 * Safe to re-run: it only ever updates three derived columns and never touches
 * question content, answer keys or student data.
 */

import { storage } from "./storage";
import { calibrate, MIN_RESPONDENTS, type Difficulty } from "./itemCalibration";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(`[calibrate] reading response statistics...`);
  const stats = await storage.getItemResponseStats();
  console.log(`[calibrate] ${stats.length} questions have at least one response`);

  const calibrated = calibrate(stats);
  const skipped = stats.length - calibrated.length;

  const byDifficulty = calibrated.reduce<Record<string, number>>((acc, i) => {
    acc[i.difficulty] = (acc[i.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`[calibrate] calibrated ${calibrated.length}, skipped ${skipped} ` +
    `(fewer than ${MIN_RESPONDENTS} distinct respondents)`);
  for (const level of ["foundation", "standard", "exam_level", "challenge"] as Difficulty[]) {
    console.log(`             ${level.padEnd(11)} ${byDifficulty[level] ?? 0}`);
  }

  // A bank where almost everything lands in one band usually means the cut
  // points need revisiting, not that the bank is uniform. Worth surfacing
  // rather than silently applying.
  const top = Math.max(0, ...Object.values(byDifficulty));
  if (calibrated.length > 20 && top / calibrated.length > 0.9) {
    console.warn(
      `[calibrate] WARNING: over 90% of items landed in a single band. ` +
      `Check the cut points in itemCalibration.ts before trusting this.`,
    );
  }

  if (dryRun) {
    console.log("[calibrate] dry run - nothing written");
    return;
  }

  const updated = await storage.applyItemDifficulty(
    calibrated.map((i) => ({
      questionId: i.questionId,
      difficulty: i.difficulty,
      pValue: i.pValue,
    })),
  );
  console.log(`[calibrate] updated ${updated} questions`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[calibrate] failed:", err);
    process.exit(1);
  });
