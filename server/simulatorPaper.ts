/**
 * Exam-day simulator paper construction.
 *
 * A random draw from the bank does not reproduce exam conditions: it
 * over-samples whatever topic happens to have the most questions written for
 * it. A simulator paper should reflect the shape of the exam.
 *
 * IMPORTANT: we do not have official published domain weights in the schema,
 * and inventing percentages would be a fabricated claim about the real exam.
 * So the paper is weighted by each topic's share of the active question bank -
 * an honest, data-derived proxy. When admin-configurable official weights are
 * added, pass them in as `topicWeights` and they take over.
 *
 * Pure and seed-injected so paper construction is deterministic under test.
 */

export interface PaperQuestion {
  id: string;
  topic: string | null;
}

export interface PaperInput {
  pool: PaperQuestion[];
  targetCount: number;
  /**
   * Optional explicit weights per topic (any positive scale; they are
   * normalized). When omitted, the bank's own topic distribution is used.
   */
  topicWeights?: Map<string, number>;
  /** Deterministic shuffle seed. */
  seed: number;
}

/** Small deterministic PRNG - avoids Math.random so papers are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function groupByTopic(pool: PaperQuestion[]): Map<string, PaperQuestion[]> {
  const byTopic = new Map<string, PaperQuestion[]>();
  for (const q of pool) {
    const topic = q.topic || "General";
    const list = byTopic.get(topic) ?? [];
    list.push(q);
    byTopic.set(topic, list);
  }
  return byTopic;
}

/**
 * Build a topic-weighted paper.
 *
 * Allocation uses largest-remainder, so the parts sum exactly to the target
 * rather than drifting by a question or two through rounding. Topics short on
 * questions give their shortfall back to the pool so the paper still reaches
 * its target length.
 */
export function buildSimulatorPaper(input: PaperInput): PaperQuestion[] {
  const { pool, targetCount, seed } = input;
  if (targetCount <= 0 || pool.length === 0) return [];

  const rand = mulberry32(seed);
  const byTopic = groupByTopic(pool);
  const size = Math.min(targetCount, pool.length);

  const topics = Array.from(byTopic.keys());
  const weightFor = (topic: string) =>
    input.topicWeights?.get(topic) ?? (byTopic.get(topic)?.length ?? 0);

  const totalWeight = topics.reduce((sum, t) => sum + weightFor(t), 0);
  if (totalWeight <= 0) return shuffle(pool, rand).slice(0, size);

  // Largest-remainder allocation.
  const exact = topics.map((topic) => ({
    topic,
    ideal: (weightFor(topic) / totalWeight) * size,
  }));
  const alloc = new Map<string, number>(
    exact.map((e) => [e.topic, Math.floor(e.ideal)]),
  );
  let assigned = Array.from(alloc.values()).reduce((a, b) => a + b, 0);

  const byRemainder = [...exact].sort(
    (a, b) => (b.ideal % 1) - (a.ideal % 1) || a.topic.localeCompare(b.topic),
  );
  let i = 0;
  while (assigned < size && byRemainder.length > 0) {
    const { topic } = byRemainder[i % byRemainder.length];
    alloc.set(topic, (alloc.get(topic) ?? 0) + 1);
    assigned++;
    i++;
  }

  // Draw per topic, tracking any shortfall from thin topics.
  const picked: PaperQuestion[] = [];
  const leftovers: PaperQuestion[] = [];

  for (const topic of topics) {
    const available = shuffle(byTopic.get(topic) ?? [], rand);
    const want = Math.min(alloc.get(topic) ?? 0, available.length);
    picked.push(...available.slice(0, want));
    leftovers.push(...available.slice(want));
  }

  // Backfill so a thin topic does not shorten the whole paper.
  if (picked.length < size) {
    picked.push(...shuffle(leftovers, rand).slice(0, size - picked.length));
  }

  return shuffle(picked, rand);
}
