/**
 * Reading the research files.
 *
 * The parsing cases here are not hypothetical: every one of them is a shape
 * that appears in data/prospects today, and the quoted-comma case is one that
 * a naive split gets wrong silently rather than loudly.
 */
import { describe, it, expect } from "vitest";
import { parseCsv, parseProspectCsv, parseExamVolume } from "../partners/prospectCsv";
import { normalizeSegment, normalizePartnerCode, prospectKey } from "@shared/partners";

describe("parseCsv", () => {
  it("keeps a quoted comma inside its field", () => {
    // This exact string is in insurance-agencies.csv. Splitting on commas
    // shifts every later column left, and nothing complains.
    const rows = parseCsv('A,B\n"Nearly 1,500 member agencies",Very High');

    expect(rows[1]).toEqual(["Nearly 1,500 member agencies", "Very High"]);
  });

  it("handles a doubled quote inside a quoted field", () => {
    expect(parseCsv('A\n"He said ""yes"""')[1]).toEqual(['He said "yes"']);
  });

  it("handles a newline inside a quoted field", () => {
    expect(parseCsv('A,B\n"line one\nline two",x')[1]).toEqual(["line one\nline two", "x"]);
  });

  it("reads a file that does not end in a newline", () => {
    expect(parseCsv("A,B\n1,2")).toHaveLength(2);
  });

  it("survives CRLF without leaving carriage returns on the last column", () => {
    expect(parseCsv("A,B\r\n1,2\r\n")[1]).toEqual(["1", "2"]);
  });

  it("drops blank lines rather than importing empty organizations", () => {
    expect(parseCsv("A,B\n1,2\n\n\n3,4")).toHaveLength(3);
  });
});

describe("parseExamVolume", () => {
  it("reads TREC's published count", () => {
    expect(parseExamVolume("15547")).toBe(15547);
    expect(parseExamVolume("1,234")).toBe(1234);
  });

  it("refuses a sentence that merely starts with a number", () => {
    // "450+ agents; 200+ hours education" must not become 450 - that would put
    // an agent headcount in the same column as an exam count and then rank the
    // two against each other.
    expect(parseExamVolume("450+ agents; 200+ hours education")).toBeNull();
    expect(parseExamVolume("Nearly 1,500 member agencies")).toBeNull();
    expect(parseExamVolume(null)).toBeNull();
    expect(parseExamVolume("")).toBeNull();
  });
});

describe("parseProspectCsv", () => {
  const header = "Organization,Segment,City / Market,State,Website,Public Contact,TREC Sales-Agent Exam Count,Priority,Why It Matters,Source URL";

  it("reads a row into a prospect", () => {
    const { prospects, problems } = parseProspectCsv(
      `${header}\nChampions School,Real Estate School,Houston,TX,https://x.test/,,15547,Very High,Big,https://src.test/`,
      "test.csv",
    );

    expect(problems).toEqual([]);
    expect(prospects[0]).toMatchObject({
      organizationName: "Champions School",
      segment: "real_estate_school",
      market: "Houston",
      knownExamVolume: 15547,
      priority: "Very High",
    });
  });

  it("accepts each file's own name for the signal column", () => {
    for (const signalHeader of ["Recruiting Signal", "Candidate Signal"]) {
      const text = `Organization,Segment,${signalHeader}\nAcme,Insurance Agency,Hiring producers`;
      expect(parseProspectCsv(text, "f.csv").prospects[0].candidateSignal).toBe("Hiring producers");
    }
  });

  it("reports a row with no organization rather than importing it", () => {
    const { prospects, problems } = parseProspectCsv(`${header}\n,Real Estate School,Houston,TX,,,,,,`, "test.csv");

    expect(prospects).toHaveLength(0);
    expect(problems[0]).toMatchObject({ line: 2, reason: "no organization name" });
  });

  it("reports a short row but still imports what it has", () => {
    const { prospects, problems } = parseProspectCsv(`${header}\nAcme,Real Estate School`, "test.csv");

    // An incomplete row about a real organization is worth keeping - it is
    // exactly the row somebody needs to go and research.
    expect(prospects).toHaveLength(1);
    expect(problems.some((p) => p.reason.includes("expected"))).toBe(true);
  });

  it("refuses a file with no Organization column", () => {
    const { prospects, problems } = parseProspectCsv("Name,Segment\nAcme,School", "wrong.csv");

    expect(prospects).toHaveLength(0);
    expect(problems[0].reason).toContain("Organization");
  });

  it("reports an empty file", () => {
    expect(parseProspectCsv("", "empty.csv").problems[0].reason).toContain("empty");
  });
});

describe("normalizeSegment", () => {
  it.each([
    ["Real Estate School", "real_estate_school"],
    ["Real Estate School / Education", "real_estate_school"],
    ["Real Estate Brokerage", "real_estate_brokerage"],
    ["Real Estate Team / Brokerage", "real_estate_brokerage"],
    ["Insurance School", "insurance_school"],
    ["Insurance Agency", "insurance_agency"],
    ["Insurance Agency / Life Recruiting", "insurance_agency"],
    ["Insurance Carrier / Agent Recruiting", "insurance_agency"],
  ])("folds %s to %s", (raw, expected) => {
    expect(normalizeSegment(raw)).toBe(expected);
  });

  it("treats an association as an association even when it mentions insurance", () => {
    // Reaching an association is a different conversation from reaching one
    // agency, so the more specific fact has to win over the substring both share.
    expect(normalizeSegment("Insurance Association / Recruiting Network")).toBe("association");
    expect(normalizeSegment("Association / Education")).toBe("association");
  });

  it("falls back rather than guessing", () => {
    expect(normalizeSegment("Something Else")).toBe("other");
    expect(normalizeSegment("")).toBe("other");
    expect(normalizeSegment(null)).toBe("other");
  });
});

describe("normalizePartnerCode", () => {
  it("accepts a plain code", () => {
    expect(normalizePartnerCode("kw-southwest")).toBe("kw-southwest");
  });

  it("tidies what an admin is likely to type", () => {
    expect(normalizePartnerCode("  KW Southwest  ")).toBe("kw-southwest");
    expect(normalizePartnerCode("JPAR — DFW")).toBe("jpar-dfw");
    expect(normalizePartnerCode("a__b")).toBe("a-b");
  });

  it("refuses what cannot be a URL segment", () => {
    expect(normalizePartnerCode("")).toBeNull();
    expect(normalizePartnerCode("   ")).toBeNull();
    expect(normalizePartnerCode("---")).toBeNull();
    expect(normalizePartnerCode(null)).toBeNull();
    expect(normalizePartnerCode("a".repeat(200))).toBeNull();
  });

  it("cannot produce a path traversal or a query string", () => {
    expect(normalizePartnerCode("../../etc/passwd")).toBe("etc-passwd");
    expect(normalizePartnerCode("x?y=1")).toBe("x-y-1");
    expect(normalizePartnerCode("<script>")).toBe("script");
  });
});

describe("prospectKey", () => {
  it("treats legal-suffix and punctuation differences as one organization", () => {
    expect(prospectKey("Champions School of Real Estate LTD", "Houston"))
      .toBe(prospectKey("Champions School of Real Estate, Ltd.", "Houston"));
  });

  it("keeps two offices of the same brand apart", () => {
    // "Keller Williams" names dozens of independent offices; only the market
    // separates them, and merging them would merge their outreach histories.
    expect(prospectKey("Keller Williams", "Plano"))
      .not.toBe(prospectKey("Keller Williams", "Southwest"));
  });
});
