export interface ExamScoreResult {
  score: number;
  passed: boolean;
}

export interface TopicStat {
  correct: number;
  total: number;
}

export interface TopicBreakdownEntry {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
}

export function calculateExamScore(
  correctAnswers: number,
  totalQuestions: number
): ExamScoreResult {
  if (totalQuestions === 0) {
    return { score: 0, passed: false };
  }
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const passed = score >= 70;
  return { score, passed };
}

export interface ScoredQuestion {
  id: string;
  topic: string | null;
  correctAnswer: number;
}

export interface GradedPaper {
  correctAnswers: number;
  topicStats: Record<string, TopicStat>;
  responses: Array<{
    questionId: string;
    topic: string;
    selectedAnswer: number | null;
    isCorrect: boolean;
  }>;
}

/**
 * Grades a submitted paper and produces the per-question response rows that
 * back topic mastery, the EasyPass Score and adaptive selection.
 *
 * Questions are scored against `answerOrder` - the option order shuffled for
 * this specific session - falling back to the question bank's own
 * `correctAnswer` when the session predates shuffling.
 *
 * Question ids with no matching question row are skipped entirely: they count
 * toward neither the score nor the response log.
 */
export function gradePaper(
  questionIds: string[],
  questionsById: Map<string, ScoredQuestion>,
  answers: Record<string, number>,
  answerOrder: Record<string, number> | null,
): GradedPaper {
  let correctAnswers = 0;
  const topicStats: Record<string, TopicStat> = {};
  const responses: GradedPaper["responses"] = [];

  for (const questionId of questionIds) {
    const question = questionsById.get(questionId);
    if (!question) continue;

    const topic = question.topic || "General";
    if (!topicStats[topic]) {
      topicStats[topic] = { correct: 0, total: 0 };
    }
    topicStats[topic].total++;

    const correctIndex = answerOrder?.[questionId] ?? question.correctAnswer;
    const selectedAnswer = answers[questionId] ?? null;
    const isCorrect = selectedAnswer !== null && selectedAnswer === correctIndex;

    if (isCorrect) {
      correctAnswers++;
      topicStats[topic].correct++;
    }

    responses.push({ questionId, topic, selectedAnswer, isCorrect });
  }

  return { correctAnswers, topicStats, responses };
}

export function calculateTopicBreakdown(
  topicStats: Record<string, TopicStat>
): TopicBreakdownEntry[] {
  return Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
      percentage:
        stats.total === 0
          ? 0
          : Math.round((stats.correct / stats.total) * 100),
    }))
    .sort((a, b) => a.percentage - b.percentage);
}
