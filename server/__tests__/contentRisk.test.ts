import { describe, it, expect } from "vitest";
import {
  assessRisk,
  quarantineReason,
  QUARANTINE_THRESHOLD,
  RISK_WINDOW_DAYS,
  type FeedbackSignal,
  type FeedbackType,
} from "../contentRisk";

const NOW = new Date("2026-08-17T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

const report = (
  feedbackType: FeedbackType,
  over: Partial<FeedbackSignal> = {},
): FeedbackSignal => ({
  feedbackType,
  status: "pending",
  createdAt: NOW,
  ...over,
});

const assess = (signals: FeedbackSignal[]) => assessRisk(signals, NOW);

describe("assessRisk", () => {
  it("scores a clean question at zero", () => {
    const r = assess([]);

    expect(r.score).toBe(0);
    expect(r.shouldQuarantine).toBe(false);
  });

  it("quarantines on two independent wrong-answer reports", () => {
    // The case that matters most: a wrong answer key teaches every student
    // who sees it something false, and keeps doing so until someone notices.
    const r = assess([report("wrong_answer"), report("wrong_answer")]);

    expect(r.shouldQuarantine).toBe(true);
    expect(r.drivers[0]).toBe("wrong_answer");
  });

  it("does not quarantine on a single wrong-answer report", () => {
    // One student can be mistaken. Pulling a question on one report would
    // let any individual take content offline.
    expect(assess([report("wrong_answer")]).shouldQuarantine).toBe(false);
  });

  it("does not quarantine on cosmetic complaints alone", () => {
    const r = assess([
      report("unclear"), report("unclear"), report("unclear"),
      report("suggestion"), report("suggestion"),
    ]);

    expect(r.shouldQuarantine).toBe(false);
  });

  it("gives suggestions no weight at all", () => {
    expect(assess(Array.from({ length: 20 }, () => report("suggestion"))).score).toBe(0);
  });

  it("accumulates mixed reports toward the threshold", () => {
    const r = assess([report("wrong_answer"), report("error"), report("translation")]);

    expect(r.score).toBeGreaterThanOrEqual(QUARANTINE_THRESHOLD);
    expect(r.shouldQuarantine).toBe(true);
  });

  it("ignores reports an admin dismissed", () => {
    // An admin who looked and decided the question is fine has overruled that
    // signal; continuing to count it would re-quarantine on the next report.
    const r = assess([
      report("wrong_answer", { status: "dismissed" }),
      report("wrong_answer", { status: "dismissed" }),
      report("wrong_answer", { status: "dismissed" }),
    ]);

    expect(r.score).toBe(0);
    expect(r.shouldQuarantine).toBe(false);
  });

  it("ignores reports already resolved", () => {
    const r = assess([
      report("wrong_answer", { status: "resolved" }),
      report("wrong_answer", { status: "resolved" }),
    ]);

    expect(r.shouldQuarantine).toBe(false);
  });

  it("still counts reports an admin has merely acknowledged", () => {
    // "reviewed" means seen, not judged - the risk has not been cleared.
    const r = assess([
      report("wrong_answer", { status: "reviewed" }),
      report("wrong_answer", { status: "pending" }),
    ]);

    expect(r.shouldQuarantine).toBe(true);
  });

  it("lets stale reports age out", () => {
    const r = assess([
      report("wrong_answer", { createdAt: daysAgo(RISK_WINDOW_DAYS + 1) }),
      report("wrong_answer", { createdAt: daysAgo(RISK_WINDOW_DAYS + 30) }),
    ]);

    expect(r.countedReports).toBe(0);
    expect(r.shouldQuarantine).toBe(false);
  });

  it("counts a report exactly on the window boundary", () => {
    expect(assess([report("wrong_answer", { createdAt: daysAgo(RISK_WINDOW_DAYS - 1) })])
      .countedReports).toBe(1);
  });

  it("orders drivers by contribution", () => {
    const r = assess([
      report("unclear"), report("unclear"),
      report("wrong_answer"), report("wrong_answer"),
    ]);

    expect(r.drivers[0]).toBe("wrong_answer");
  });

  it("is deterministic for the same input", () => {
    const signals = [report("wrong_answer"), report("error"), report("unclear")];

    expect(assess(signals)).toEqual(assess(signals));
  });
});

describe("quarantineReason", () => {
  it("explains why a question was pulled without reading the report table", () => {
    const reason = quarantineReason(assess([report("wrong_answer"), report("wrong_answer")]));

    expect(reason).toMatch(/risk score \d+/);
    expect(reason).toMatch(/2 open reports/);
    expect(reason).toMatch(/wrong_answer/);
  });

  it("uses the singular for one report", () => {
    expect(quarantineReason(assess([report("wrong_answer")]))).toMatch(/1 open report\b/);
  });
});
