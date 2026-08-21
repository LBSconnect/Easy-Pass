/**
 * Reading the research files in data/prospects into something importable.
 *
 * WHY A PARSER AND NOT A SPLIT
 *
 * The source rows contain commas inside quoted fields - "Nearly 1,500 member
 * agencies" is one field, not two - so splitting on commas silently shifts
 * every later column left. That failure is quiet: the row still imports, the
 * priority column now holds a fragment of a sentence, and nobody notices until
 * a filter returns nothing.
 *
 * WHY PER-FILE COLUMN MAPS
 *
 * The four files do not share a header. The same column is "TREC Sales-Agent
 * Exam Count" in one, "Recruiting Signal" in another and "Candidate Signal" in
 * a third, because each was researched from a different source. Rather than
 * rewrite the files - they are the record of that research - the differences
 * are declared here.
 */

import { normalizePriority, normalizeSegment, prospectKey, type PartnerSegment } from "@shared/partners";

export interface ParsedProspect {
  organizationName: string;
  dedupeKey: string;
  segment: PartnerSegment;
  segmentRaw: string | null;
  market: string | null;
  state: string | null;
  website: string | null;
  publicContact: string | null;
  candidateSignal: string | null;
  knownExamVolume: number | null;
  priority: string | null;
  whyItMatters: string | null;
  sourceUrl: string | null;
}

export interface RowProblem {
  line: number;
  reason: string;
}

export interface ParseResult {
  prospects: ParsedProspect[];
  problems: RowProblem[];
}

/**
 * RFC4180-ish: quoted fields, doubled quotes inside them, newlines allowed
 * within quotes. Written out rather than pulled in as a dependency because it
 * is thirty lines and the alternative is a package in the server bundle for
 * four files that change a few times a year.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normalised first so a CRLF file does not leave \r on the end of every
  // last column - which then fails an exact-match lookup for reasons nobody
  // can see in a terminal.
  const input = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // A file not ending in a newline still has a final row.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Header names that mean "how many candidates does this organization see". */
const SIGNAL_HEADERS = [
  "TREC Sales-Agent Exam Count",
  "Recruiting Signal",
  "Candidate Signal",
];

function clean(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * A count, when the signal column happens to hold one.
 *
 * "15547" is a number. "450+ agents; 200+ hours education" is not, and must not
 * become 450 - that would put a brokerage's agent headcount into the same field
 * as TREC's published exam volume and then rank the two against each other.
 */
export function parseExamVolume(signal: string | null): number | null {
  if (!signal) return null;
  const trimmed = signal.trim().replace(/,/g, "");
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/**
 * Turn one file's text into prospects.
 *
 * A row that cannot be identified - no organization name - is reported rather
 * than imported. Everything else is optional: an incomplete row about a real
 * organization is still worth having, and refusing it would mean the import
 * fails on exactly the rows a person most needs to go and research.
 */
export function parseProspectCsv(text: string, fileLabel: string): ParseResult {
  const rows = parseCsv(text);
  const problems: RowProblem[] = [];
  const prospects: ParsedProspect[] = [];

  if (rows.length === 0) {
    return { prospects, problems: [{ line: 0, reason: `${fileLabel} is empty` }] };
  }

  const header = rows[0].map((h) => h.trim());
  const indexOf = (name: string) => header.findIndex((h) => h === name);

  const nameIdx = indexOf("Organization");
  if (nameIdx === -1) {
    return {
      prospects,
      problems: [{ line: 1, reason: `${fileLabel} has no "Organization" column` }],
    };
  }

  const segmentIdx = indexOf("Segment");
  const marketIdx = indexOf("City / Market");
  const stateIdx = indexOf("State");
  const websiteIdx = indexOf("Website");
  const contactIdx = indexOf("Public Contact");
  const signalIdx = SIGNAL_HEADERS.map(indexOf).find((i) => i !== -1) ?? -1;
  const priorityIdx = indexOf("Priority");
  const whyIdx = indexOf("Why It Matters");
  const sourceIdx = indexOf("Source URL");

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    // +1 because the header is line 1, so the reported line matches the file.
    const line = i + 1;

    const organizationName = clean(row[nameIdx]);
    if (!organizationName) {
      problems.push({ line, reason: "no organization name" });
      continue;
    }

    // A row with fewer cells than the header is not fatal - the missing
    // columns simply read as absent - but it is worth reporting, because it
    // usually means an unescaped comma somewhere upstream.
    if (row.length < header.length) {
      problems.push({
        line,
        reason: `${organizationName}: ${row.length} columns, expected ${header.length}`,
      });
    }

    const segmentRaw = clean(row[segmentIdx]);
    const market = clean(row[marketIdx]);
    const signal = signalIdx === -1 ? null : clean(row[signalIdx]);

    prospects.push({
      organizationName,
      dedupeKey: prospectKey(organizationName, market),
      segment: normalizeSegment(segmentRaw),
      segmentRaw,
      market,
      state: clean(row[stateIdx]),
      website: clean(row[websiteIdx]),
      publicContact: clean(row[contactIdx]),
      candidateSignal: signal,
      knownExamVolume: parseExamVolume(signal),
      priority: normalizePriority(clean(row[priorityIdx])),
      whyItMatters: clean(row[whyIdx]),
      sourceUrl: clean(row[sourceIdx]),
    });
  }

  return { prospects, problems };
}
