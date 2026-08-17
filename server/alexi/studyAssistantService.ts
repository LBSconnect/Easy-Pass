/**
 * StudyAssistantService - the single entry point for everything Alexi does.
 *
 * Routes call this; nothing else calls a provider. Centralising the AI surface
 * is what makes the cross-cutting guarantees - rate limits, usage accounting,
 * caching, fallback, redaction - actually hold, rather than being re-remembered
 * at each of a dozen call sites.
 *
 * Every public method degrades gracefully: if the provider is unavailable,
 * misconfigured or slow, the student still gets a useful answer from approved
 * content. The AI layer is an enhancement, never a dependency.
 */

import { storage } from "../storage";
import { rateLimit } from "../rateLimit";
import { getAIConfig, hasCredentials } from "../ai/config";
import { getProvider } from "../ai";
import { AIError } from "../ai/provider";
import { RECOMMENDATION_PHRASING, promptRef } from "../ai/prompts";
import { recordUsage } from "../ai/usageLog";
import {
  STUDY_ASSISTANT,
  type StudyAssistantConfig,
} from "@shared/studyAssistant";
import { calculateEasyPassScore } from "../easyPassScore";
import { buildLearningProfile, type LearningProfile } from "./learningProfile";
import { recommendNextAction, type Recommendation } from "./nextBestAction";
import {
  buildTutorRequest,
  checkGrounding,
  fallbackAnswer,
  refusalMessage,
  TUTOR_PROMPT_REF,
  type ApprovedQuestionContext,
  type TutorIntent,
} from "./tutor";
import type { ExamCategory } from "@shared/schema";

/**
 * Per-student limits on AI-backed operations.
 *
 * Sized to be invisible to someone studying and obvious to a script. A student
 * working through a practice set might ask for four or five explanations in a
 * sitting; nobody legitimately asks for thirty in fifteen minutes.
 */
const TUTOR_LIMIT = { max: 30, windowMs: 15 * 60 * 1000 };
const PHRASING_LIMIT = { max: 40, windowMs: 15 * 60 * 1000 };

/**
 * Phrasing cache.
 *
 * The recommendation itself is deterministic, so the sentence describing it is
 * too. Without this, every dashboard render would be a model call - the exact
 * "LLM request per page render" pattern that makes an assistant uneconomical.
 * In-memory is the right size for this: entries are small, worthless to
 * persist, and a restart just re-earns them.
 */
const phrasingCache = new Map<string, { text: string; expiresAt: number }>();
const PHRASING_TTL_MS = 60 * 60 * 1000;
const PHRASING_CACHE_MAX = 500;

function cacheKey(rec: Recommendation, language: string): string {
  return [
    language,
    rec.mode,
    rec.concept?.conceptId ?? "none",
    rec.concept ? Math.round(rec.concept.mastery / 5) * 5 : "na",
    rec.estimatedMinutes,
    rec.reasonCodes.join("|"),
  ].join(":");
}

function readCache(key: string): string | null {
  const hit = phrasingCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    phrasingCache.delete(key);
    return null;
  }
  return hit.text;
}

function writeCache(key: string, text: string): void {
  // Crude bound rather than a real LRU: the cache is an optimisation, and
  // evicting the oldest insertion is enough to stop unbounded growth.
  if (phrasingCache.size >= PHRASING_CACHE_MAX) {
    const oldest = phrasingCache.keys().next();
    if (!oldest.done) phrasingCache.delete(oldest.value);
  }
  phrasingCache.set(key, { text, expiresAt: Date.now() + PHRASING_TTL_MS });
}

/** Test seam. */
export function clearPhrasingCache(): void {
  phrasingCache.clear();
}

export interface RecommendationResult {
  recommendation: Recommendation;
  /** Student-facing sentence. Model-phrased when available, else deterministic. */
  phrasing: string;
  /** True when the phrasing came from approved static copy rather than a model. */
  usedFallback: boolean;
  profile: {
    easyPassScore: number | null;
    daysRemaining: number | null;
    isRetaker: boolean;
    weakestConcepts: Array<{ conceptId: string; label: string; mastery: number; band: string }>;
    recentAccuracy: number | null;
    coverage: number;
    insight: string | null;
  };
}

export interface TutorResult {
  answer: string;
  /** grounded = model answer; fallback = approved explanation; refused = insufficient context. */
  source: "grounded" | "fallback" | "refused";
}

export class StudyAssistantService {
  /** What the browser is allowed to know. No provider or model names. */
  getConfig(): StudyAssistantConfig {
    const config = getAIConfig();
    return {
      displayName: STUDY_ASSISTANT.displayName,
      flags: config.flags,
      aiAvailable: hasCredentials(),
    };
  }

  /** Assemble the learning profile for one student and exam. */
  async buildProfile(
    userId: string,
    category: ExamCategory,
    now = new Date(),
  ): Promise<LearningProfile> {
    const [responses, results, questionBankSize, profileRow] = await Promise.all([
      storage.getResponsesForCategory(userId, category),
      storage.getExamResults(userId),
      storage.countActiveQuestions(category),
      storage.getProfile(userId),
    ]);

    const mockExamScores = results
      .filter((r) => r.category === category)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .map((r) => r.score);

    const scoreInput = responses.map((r) => ({
      questionId: r.questionId,
      topic: r.topic,
      isCorrect: r.isCorrect,
      answeredAt: new Date(r.answeredAt),
    }));

    const readiness = calculateEasyPassScore({
      responses: scoreInput,
      mockExamScores,
      questionBankSize,
      now,
    });

    return buildLearningProfile({
      category,
      responses: scoreInput,
      mockExamScores,
      questionBankSize,
      examDate: profileRow?.examDate ? new Date(profileRow.examDate) : null,
      hasPreviousAttempt: profileRow?.hasPreviousAttempt ?? null,
      language: profileRow?.preferredLanguage === "es" ? "es" : "en",
      // A provisional score is a placeholder, not a readiness claim - pass it
      // through as "not established" so nothing downstream reasons on it.
      easyPassScore: readiness.provisional ? null : readiness.score,
      now,
    });
  }

  /**
   * The headline call: what should this student do next?
   *
   * The decision is made deterministically first. The model is asked only to
   * phrase it, and only if that phrasing is not already cached. If the model
   * fails, the deterministic copy ships - the student never sees a degraded
   * experience because a provider blinked.
   */
  async getRecommendation(
    userId: string,
    category: ExamCategory,
    options: { availableMinutes?: number; now?: Date } = {},
  ): Promise<RecommendationResult> {
    const now = options.now ?? new Date();
    const profile = await this.buildProfile(userId, category, now);

    const recommendation = recommendNextAction({
      profile,
      availableMinutes: options.availableMinutes,
      now,
    });

    const { phrasing, usedFallback } = await this.phraseRecommendation(
      userId,
      category,
      recommendation,
      profile.language,
    );

    return {
      recommendation,
      phrasing,
      usedFallback,
      profile: {
        easyPassScore: profile.easyPassScore,
        daysRemaining: profile.daysRemaining,
        isRetaker: profile.isRetaker,
        weakestConcepts: profile.weakestConcepts.map((c) => ({
          conceptId: c.conceptId,
          label: c.label,
          mastery: c.mastery,
          band: c.band,
        })),
        recentAccuracy: profile.recentAccuracy,
        coverage: profile.coverage,
        insight: recommendation.insight,
      },
    };
  }

  private async phraseRecommendation(
    userId: string,
    category: ExamCategory,
    rec: Recommendation,
    language: "en" | "es",
  ): Promise<{ phrasing: string; usedFallback: boolean }> {
    const config = getAIConfig();
    const deterministic = rec.detail;

    if (!config.flags.enabled) {
      return { phrasing: deterministic, usedFallback: true };
    }
    if (language === "es" && !config.flags.spanishEnabled) {
      return { phrasing: deterministic, usedFallback: true };
    }

    const key = cacheKey(rec, language);
    const cached = readCache(key);
    if (cached) {
      await recordUsage({
        operation: "recommendation_phrasing",
        outcome: "cache_hit",
        provider: config.provider,
        model: null,
        promptRef: promptRef(RECOMMENDATION_PHRASING),
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        category,
        userId,
      });
      return { phrasing: cached, usedFallback: false };
    }

    const limit = rateLimit(`alexi-phrasing:${userId}`, PHRASING_LIMIT.max, PHRASING_LIMIT.windowMs);
    if (!limit.allowed) {
      return { phrasing: deterministic, usedFallback: true };
    }

    // The model receives the decision and the evidence behind it - never the
    // student's identity, and never raw question content.
    const decided = [
      `Action: ${rec.headline}`,
      `Learning mode: ${rec.mode}`,
      rec.concept ? `Concept: ${rec.concept.label} (mastery ${rec.concept.mastery}%)` : "Concept: mixed",
      `Estimated time: ${rec.estimatedMinutes} minutes`,
      `Evidence: ${rec.evidence.join("; ")}`,
    ].join("\n");

    const started = Date.now();
    try {
      const response = await getProvider().complete({
        role: "utility",
        system: RECOMMENDATION_PHRASING.build({
          language: language === "es" ? "Spanish" : "English",
          recommendation: decided,
        }),
        messages: [{ role: "user", content: "Phrase this recommendation for the student." }],
        maxTokens: 150,
      });

      writeCache(key, response.text);
      await recordUsage({
        operation: "recommendation_phrasing",
        outcome: "success",
        provider: config.provider,
        model: response.model,
        promptRef: promptRef(RECOMMENDATION_PHRASING),
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        latencyMs: response.latencyMs,
        category,
        userId,
      });

      return { phrasing: response.text, usedFallback: false };
    } catch (error) {
      await recordUsage({
        operation: "recommendation_phrasing",
        outcome: "fallback",
        provider: config.provider,
        model: null,
        promptRef: promptRef(RECOMMENDATION_PHRASING),
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        category,
        userId,
        reason: error instanceof AIError ? error.kind : "unknown",
      });
      // Deterministic copy is genuinely good enough; this is not an error the
      // student needs to know about.
      return { phrasing: deterministic, usedFallback: true };
    }
  }

  /**
   * Ask about a question the student has already answered.
   *
   * Two gates before any model call: the student must have answered this
   * question (otherwise it is an answer-key oracle for the whole bank), and we
   * must hold an approved explanation (otherwise the model would be inventing
   * regulation).
   */
  async askTutor(params: {
    userId: string;
    questionId: string;
    intent: TutorIntent;
    studentMessage?: string | null;
    language: "en" | "es";
  }): Promise<TutorResult> {
    const { userId, questionId, intent, language } = params;
    const config = getAIConfig();

    const question = await storage.getQuestion(questionId);
    if (!question) {
      return { answer: refusalMessage(language), source: "refused" };
    }

    const context: ApprovedQuestionContext = {
      questionId: question.id,
      topic: question.topic,
      questionText: language === "es" ? question.questionTextEs : question.questionTextEn,
      options: (language === "es" ? question.optionsEs : question.optionsEn) ?? [],
      correctIndex: question.correctAnswer,
      explanation: language === "es" ? question.explanationEs : question.explanationEn,
      category: question.category,
    };

    // Gate 1: has this student actually answered it?
    const responses = await storage.getResponsesForCategory(
      userId,
      question.category as ExamCategory,
    );
    const answered = responses.filter((r) => r.questionId === questionId);
    if (answered.length === 0) {
      await recordUsage({
        operation: "tutor_explanation",
        outcome: "blocked",
        provider: config.provider,
        model: null,
        promptRef: TUTOR_PROMPT_REF,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        category: question.category,
        userId,
        reason: "not_answered",
      });
      return { answer: refusalMessage(language), source: "refused" };
    }

    // Gate 2: do we hold approved material to ground an answer in?
    const grounding = checkGrounding(context);
    if (!grounding.sufficient) {
      return { answer: fallbackAnswer(context, language), source: "fallback" };
    }

    if (!config.flags.enabled || !config.flags.tutorEnabled) {
      return { answer: fallbackAnswer(context, language), source: "fallback" };
    }
    if (language === "es" && !config.flags.spanishEnabled) {
      return { answer: fallbackAnswer(context, language), source: "fallback" };
    }

    const limit = rateLimit(`alexi-tutor:${userId}`, TUTOR_LIMIT.max, TUTOR_LIMIT.windowMs);
    if (!limit.allowed) {
      return { answer: fallbackAnswer(context, language), source: "fallback" };
    }

    const latest = answered.sort(
      (a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime(),
    )[0];

    const started = Date.now();
    try {
      const response = await getProvider().complete(
        buildTutorRequest({
          intent,
          context,
          studentAnswerIndex: latest.selectedAnswer ?? null,
          studentMessage: params.studentMessage,
          language,
        }),
      );

      await recordUsage({
        operation: "tutor_explanation",
        outcome: "success",
        provider: config.provider,
        model: response.model,
        promptRef: TUTOR_PROMPT_REF,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        latencyMs: response.latencyMs,
        category: question.category,
        userId,
      });

      return { answer: response.text, source: "grounded" };
    } catch (error) {
      await recordUsage({
        operation: "tutor_explanation",
        outcome: "fallback",
        provider: config.provider,
        model: null,
        promptRef: TUTOR_PROMPT_REF,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        category: question.category,
        userId,
        reason: error instanceof AIError ? error.kind : "unknown",
      });
      // The approved explanation is still a correct answer to the student's
      // question. They lose the rephrasing, not the help.
      return { answer: fallbackAnswer(context, language), source: "fallback" };
    }
  }
}

export const studyAssistant = new StudyAssistantService();
