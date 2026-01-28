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
