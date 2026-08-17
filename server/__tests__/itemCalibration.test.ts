import { describe, it, expect } from "vitest";
import {
  calibrate,
  difficultyForPValue,
  difficultyMix,
  MIN_RESPONDENTS,
  type ItemStat,
} from "../itemCalibration";

const stat = (over: Partial<ItemStat> = {}): ItemStat => ({
  questionId: "q1",
  respondents: 100,
  correct: 70,
  ...over,
});

describe("difficultyForPValue", () => {
  it("treats a question most students miss as the hardest band", () => {
    expect(difficultyForPValue(0.2)).toBe("challenge");
  });

  it("treats a question nearly everyone gets right as foundation", () => {
    expect(difficultyForPValue(0.95)).toBe("foundation");
  });

  it("orders the ladder monotonically", () => {
    // As items get easier, difficulty must never go back up.
    const order = ["challenge", "exam_level", "standard", "foundation"];
    let last = -1;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const i = order.indexOf(difficultyForPValue(Math.min(p, 1)));
      expect(i).toBeGreaterThanOrEqual(last);
      last = i;
    }
  });

  it("handles the extremes", () => {
    expect(difficultyForPValue(0)).toBe("challenge");
    expect(difficultyForPValue(1)).toBe("foundation");
  });
});

describe("calibrate", () => {
  it("measures difficulty from real answers", () => {
    const [item] = calibrate([stat({ respondents: 100, correct: 30 })]);

    expect(item.pValue).toBeCloseTo(0.3);
    expect(item.difficulty).toBe("challenge");
  });

  it("refuses to label an item with too little evidence", () => {
    // Three students, two wrong, is not a hard question - it is no data. A
    // confident wrong label would actively misroute students.
    expect(calibrate([stat({ respondents: 3, correct: 1 })])).toEqual([]);
  });

  it("uses the documented evidence threshold", () => {
    expect(calibrate([stat({ respondents: MIN_RESPONDENTS - 1 })])).toEqual([]);
    expect(calibrate([stat({ respondents: MIN_RESPONDENTS })])).toHaveLength(1);
  });

  it("survives a corrupt row claiming more correct than respondents", () => {
    const [item] = calibrate([stat({ respondents: 20, correct: 50 })]);

    expect(item.pValue).toBeLessThanOrEqual(1);
    expect(item.difficulty).toBe("foundation");
  });

  it("handles a zero-correct item without dividing by zero", () => {
    const [item] = calibrate([stat({ respondents: 20, correct: 0 })]);

    expect(item.pValue).toBe(0);
    expect(item.difficulty).toBe("challenge");
  });

  it("handles an empty bank", () => {
    expect(calibrate([])).toEqual([]);
  });

  it("calibrates each item independently", () => {
    const out = calibrate([
      stat({ questionId: "hard", respondents: 50, correct: 10 }),
      stat({ questionId: "easy", respondents: 50, correct: 48 }),
      stat({ questionId: "thin", respondents: 2, correct: 1 }),
    ]);

    expect(out.map((i) => i.questionId)).toEqual(["hard", "easy"]);
    expect(out[0].difficulty).toBe("challenge");
    expect(out[1].difficulty).toBe("foundation");
  });
});

describe("difficultyMix", () => {
  it("sums exactly to the requested count", () => {
    for (const n of [5, 10, 13, 20, 37]) {
      for (const t of ["foundation", "standard", "exam_level", "challenge"] as const) {
        const mix = difficultyMix(t, n);
        expect(Object.values(mix).reduce((a, b) => a + b, 0)).toBe(n);
      }
    }
  });

  it("centres the session on the target level", () => {
    const mix = difficultyMix("standard", 20);

    expect(mix.standard).toBeGreaterThan(mix.foundation);
    expect(mix.standard).toBeGreaterThan(mix.exam_level);
  });

  it("includes a stretch band so a student meets the next level before moving up", () => {
    expect(difficultyMix("standard", 20).exam_level).toBeGreaterThan(0);
  });

  it("includes an easier band so a session is not relentless", () => {
    expect(difficultyMix("standard", 20).foundation).toBeGreaterThan(0);
  });

  it("does not serve challenge questions to a foundation student", () => {
    // The anti-goal: repeatedly throwing the hardest items at someone who is
    // already failing.
    const mix = difficultyMix("foundation", 20);

    expect(mix.challenge).toBe(0);
    expect(mix.exam_level).toBe(0);
  });

  it("folds the missing share back into the target at the ends of the ladder", () => {
    const low = difficultyMix("foundation", 20);
    const high = difficultyMix("challenge", 20);

    expect(low.foundation).toBeGreaterThan(difficultyMix("standard", 20).standard);
    expect(high.challenge).toBeGreaterThan(difficultyMix("standard", 20).standard);
  });

  it("still produces a usable mix at small counts", () => {
    const mix = difficultyMix("standard", 3);

    expect(Object.values(mix).reduce((a, b) => a + b, 0)).toBe(3);
    expect(mix.standard).toBeGreaterThan(0);
  });

  it("returns nothing for a zero-length session", () => {
    expect(Object.values(difficultyMix("standard", 0)).reduce((a, b) => a + b, 0)).toBe(0);
  });
});
