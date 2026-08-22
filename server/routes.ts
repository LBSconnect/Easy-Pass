import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./simpleAuth";
import { getCachedStripeClient } from "./stripeClient";
import { initializeStripePrices, REQUIRED_PRICES } from "./initializeStripePrices";
import { sendPasswordResetEmail } from "./resendClient";
import { rateLimit, getClientIp } from "./rateLimit";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { insertQuestionSchema, insertCallbackRequestSchema, insertQuestionFeedbackSchema, insertGuestArticleSchema, insertEmployerInquirySchema, callbackRequests, questionFeedback, type ExamCategory, examCategoryEnum, feedbackStatusEnum, guestArticleStatusEnum, employerInquiryStatusEnum } from "@shared/schema";
const DIAGNOSTIC_QUESTION_COUNT = 10;
import { studyTopicsConfig, getTopicById, getTopicsByCategory } from "@shared/studyTopics";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { sanitizeHtml } from "./sanitize";
import { checkSubscriptionActive } from "./subscriptionCheck";
import { gradePaper, calculateExamScore, calculateTopicBreakdown, type TopicStat } from "./examScoring";
import { calculateEasyPassScore } from "./easyPassScore";
import { generateStudyPlan } from "./studyPlan";
import { selectAdaptiveQuestions, buildHistory } from "./adaptiveSelection";
import { difficultyFor } from "./alexi/nextBestAction";
import { assessRisk, quarantineReason, type FeedbackType } from "./contentRisk";
import { checkSchemaHealth } from "./migrations";
import { weakTopics, type WeakTopic } from "@shared/diagnosticWeakness";
import { normalizePartnerCode } from "@shared/partners";
import {
  resolveActivePartner,
  attributeUserToPartner,
  storedAttribution,
  prospectState,
  recordPartnerConversion,
  listProspects,
  updateProspect,
  partnerPerformance,
} from "./partners/partnerStore";
import { buildOutreachDraft } from "@shared/partnerOutreach";
import { runOutreachDispatch } from "./outreach/engine";
import { ResendOutreachEmailService } from "./outreach/emailService";
import {
  processUnsubscribeToken,
  processWebhookEvent,
  verifyWebhookSignature,
} from "./outreach/replyProcessor";
import {
  campaignByProspect,
  listCampaignSummaries,
  setPaused,
  transitionCampaign,
} from "./outreach/campaignStore";
import type { PartnerSegment } from "@shared/partners";
import { validatePartnerState, partnerCodeChangeProblem } from "@shared/partners";
import { examDatePatch } from "@shared/examDatePatch";
import { checkGlossaryDraft } from "@shared/glossaryGate";
import { glossaryCandidates } from "./alexi/glossaryCandidates";
import { pool } from "./db";
import { buildNotebook, filterNotebook, notebookCounts, type NotebookFilter } from "./missedQuestions";
import { buildSimulatorPaper } from "./simulatorPaper";
import { buildTargetedPaper } from "./alexi/targetedPaper";
import { auditBank, findThinTopics } from "./alexi/bankAudit";
import { topReminders } from "@shared/studyReminders";
import { reminderCopy } from "@shared/reminderCopy";
import { dispatchReminderEmails } from "./reminderDispatch";
import { resolveTargetedPractice, TARGETED_PRACTICE_ENV } from "@shared/alexiFlags";
import { EXAM_MODES, isRepresentativeSitting, questionCountFor, timeLimitFor } from "@shared/examMode";
import { selectDueCards, scheduleNext, newCardState } from "./spacedRepetition";
import { shuffleQuestionOptions } from "./shuffleQuestionOptions";
import { studyAssistant } from "./alexi/studyAssistantService";
import { TUTOR_INTENTS, MAX_STUDENT_MESSAGE_CHARS, type TutorIntent } from "./alexi/tutor";
import { buildSessionPlan, type PlannableQuestion } from "./alexi/sessionPlan";
import { keyPointsFor } from "./alexi/keyPoints";
import {
  buildGenerationRequest, parseGenerationResponse, buildValidationRequest,
  interpretValidation, batchSizeFor, MAX_BATCH_SIZE, GENERATION_VERSION,
  type SourceQuestion,
} from "./alexi/questionGeneration";
import { validateGeneratedQuestion } from "./alexi/questionValidation";
import { conceptIdFor } from "@shared/concepts";
import { getProvider } from "./ai";
import { getAIConfig } from "./ai/config";

const alexiTutorSchema = z.object({
  questionId: z.string().min(1),
  intent: z.enum(TUTOR_INTENTS as [TutorIntent, ...TutorIntent[]]),
  // Optional free text, hard-capped. The cap is the substantive control on
  // how much attacker-controlled text can reach a prompt.
  message: z.string().max(MAX_STUDENT_MESSAGE_CHARS).optional(),
});

const approveDraftSchema = z.object({
  questionTextEn: z.string().min(20).max(600),
  questionTextEs: z.string().min(1).max(900),
  optionsEn: z.array(z.string().min(1)).length(4),
  optionsEs: z.array(z.string().min(1)).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanationEn: z.string().max(2000).nullable().optional(),
  explanationEs: z.string().max(2000).nullable().optional(),
  topic: z.string().max(120).nullable().optional(),
  note: z.string().max(500).optional(),
});

const rejectDraftSchema = z.object({ note: z.string().max(500).optional() });

const sessionAnswerSchema = z.object({
  questionId: z.string().min(1),
  answerIndex: z.number().int().min(0).max(9),
});

/**
 * What an unsubscribe link lands on.
 *
 * Deliberately a plain page rather than a redirect into the app: the person
 * clicking is usually signed out, and bouncing them to a login screen after
 * they asked to stop receiving email is the opposite of what they wanted.
 * The same page is shown whether or not the token matched, so the endpoint
 * cannot be used to check whether one exists.
 */
const UNSUBSCRIBE_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Reminders off - MyEasyPass</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 34rem; margin: 4rem auto; padding: 0 1.5rem; line-height: 1.6; color: #1f2937;">
<h1 style="color: #2563eb; font-size: 1.5rem;">MyEasyPass</h1>
<p>You will not receive any more study reminder emails.</p>
<p style="color: #6b7280;">No se enviaran mas correos de recordatorio.</p>
<p>You can turn them back on any time from your profile.</p>
<p><a href="https://www.myeasypass.net" style="color: #2563eb;">myeasypass.net</a></p>
</body></html>`;

/** Findings returned by the content audit. The summary counts are unaffected. */
const MAX_AUDIT_FINDINGS = 500;

/** How far back a question counts as "recently seen" for targeted practice. */
const RECENTLY_SEEN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const startExamSchema = z.object({
  category: z.enum(examCategoryEnum.enumValues),
  // "targeted" is practice weighted toward what this student keeps getting
  // wrong. It is deliberately not called a mock exam anywhere - see
  // server/alexi/targetedPaper.ts for why the two must stay distinct.
  mode: z.enum(EXAM_MODES).default("practice"),
});

const submitExamSchema = z.object({
  answers: z.record(z.string(), z.number()),
});

const checkoutSchema = z.object({
  priceId: z.string().min(1),
  /**
   * The exam whose card the student pressed Subscribe on. Display context
   * only - it decides which exam the pricing page re-selects if they cancel
   * out of Stripe, never what is charged (the priceId does that, and it is
   * validated against live Stripe data below). Constrained to the enum so a
   * crafted value cannot ride into the cancel URL.
   */
  category: z.enum(examCategoryEnum.enumValues).optional(),
});

const glossaryTermSchema = z.object({
  category: z.enum(examCategoryEnum.enumValues).nullable().optional(),
  termEn: z.string().min(1).max(120),
  termEs: z.string().min(1).max(120),
  definitionEn: z.string().min(1).max(4000),
  definitionEs: z.string().min(1).max(4000),
  sourceQuestionIds: z.array(z.string()).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

const profileUpdateSchema = z.object({
  phone: z.string().max(20).optional(),
  preferredLanguage: z.enum(["en", "es"]).optional(),
  // null is meaningful: it clears a previously set exam date back to
  // "not scheduled yet", which is a supported answer rather than a gap.
  examDate: z.string().datetime().nullable().optional(),
  // "Not scheduled yet" as a remembered answer rather than a click that
  // evaporates on reload.
  examDateSkipped: z.boolean().nullable().optional(),
  hasPreviousAttempt: z.boolean().nullable().optional(),
  // The exam the student is actively studying for.
  preferredCategory: z.enum(examCategoryEnum.enumValues).nullable().optional(),
  // Study reminder emails. Off unless explicitly turned on, and turning it
  // off has to work as reliably as turning it on.
  emailRemindersOptIn: z.boolean().nullable().optional(),
});

const VALID_PRICE_IDS = new Set<string>();

// Helper to read a Stripe metadata field, handling trailing-space key bugs
function getMetaField(meta: Record<string, string> | null | undefined, key: string): string | undefined {
  if (!meta) return undefined;
  if (meta[key] !== undefined) return meta[key];
  const found = Object.keys(meta).find(k => k.trim() === key);
  return found ? meta[found] : undefined;
}

// Helper: does this product name match a known exam category or bundle?
function isKnownExamProduct(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('real estate') || n.includes('general lines') ||
         (n.includes('property') && n.includes('casualty')) ||
         n.includes('life insurance') || n.includes('bundle');
}

// Determine whether a Stripe price object represents a legitimate, currently-sellable
// exam subscription price (active + tagged with our subscription metadata, or a recurring
// price matching a known exam product name as a fallback for untagged legacy prices).
function isSellableExamPrice(price: { active: boolean; recurring?: unknown; metadata?: Record<string, string> | null; product: any }): boolean {
  if (!price.active) return false;
  const product = typeof price.product === "object" && price.product && !("deleted" in price.product) ? price.product : null;
  if (getMetaField(price.metadata, "subscription_type") || getMetaField(product?.metadata, "subscription_type")) {
    return true;
  }
  return !!price.recurring && isKnownExamProduct(product?.name);
}

// Validate a client-supplied Stripe price ID against live Stripe data before using it to
// create a checkout session. Falls back to a live lookup (rather than only trusting the
// VALID_PRICE_IDS cache, which is only populated as a side effect of GET /api/stripe/prices
// and would otherwise fail open — accepting any price ID — before that endpoint is first hit,
// e.g. right after a server restart) so the price actually being charged is always verified
// server-side against Stripe, never assumed from client input.
async function isValidCheckoutPriceId(stripe: Awaited<ReturnType<typeof getCachedStripeClient>>, priceId: string): Promise<boolean> {
  // Deliberately NOT short-circuited by VALID_PRICE_IDS.
  //
  // That cache never expires, so a price validated once stayed "valid" forever -
  // including after it was archived. Repricing archives the superseded prices,
  // so a cached-then-archived id sailed past this check and then failed inside
  // checkout.sessions.create, surfacing to the student as a bare 500 on the
  // Subscribe button. Checkout happens once per subscriber; one extra Stripe
  // lookup is a trivial price for not selling against a stale price id.
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    if (isSellableExamPrice(price)) {
      VALID_PRICE_IDS.add(price.id);
      return true;
    }
    console.warn(
      `[checkout] price ${priceId} rejected: active=${price.active} ` +
      `recurring=${Boolean(price.recurring)}`,
    );
    return false;
  } catch (error) {
    console.error("Error validating price ID:", error);
    return false;
  }
}

/**
 * The student's profile row, creating it if this is the first time we need it.
 *
 * Rows are created lazily rather than at registration, so any route that
 * writes to a profile has to cope with there not being one yet. GET did;
 * PATCH did not, and its UPDATE simply matched zero rows - returning a 200
 * with an empty body while saving nothing.
 *
 * In practice the dashboard fetches the profile before it renders anything
 * that can write to it, which is why this went unnoticed. That is an ordering
 * accident, not a guarantee, and the first client to write before reading
 * would have lost the write silently.
 */
async function ensureProfile(userId: string) {
  const existing = await storage.getProfile(userId);
  if (existing) return existing;
  return storage.createProfile({ userId, preferredLanguage: "en", role: "user" });
}

async function ensureSubscriptionActive(userId: string, category?: ExamCategory): Promise<{ active: boolean; message?: string }> {
  const profile = await storage.getProfile(userId);
  return checkSubscriptionActive(profile, category);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Public marketing endpoint: returns one real, illustrative question for a
  // category (or set of categories) so landing pages can show a genuine
  // sample question instead of an invented one. Not part of a graded exam
  // session, so including the answer/explanation here is intentional.
  app.get("/api/questions/sample", async (req, res) => {
    try {
      const categoriesParam = (req.query.categories as string | undefined) ?? "";
      const requested = categoriesParam
        .split(",")
        .map((c) => c.trim())
        .filter((c): c is ExamCategory => examCategoryEnum.enumValues.includes(c as ExamCategory));

      const categories = requested.length > 0 ? requested : [...examCategoryEnum.enumValues];

      const pools = await Promise.all(
        categories.map((category) => storage.getQuestions(category, 5))
      );
      const pool = pools.flat();

      if (pool.length === 0) {
        return res.status(404).json({ message: "No sample question available" });
      }

      const question = pool[Math.floor(Math.random() * pool.length)];
      res.json(question);
    } catch (error) {
      console.error("Error fetching sample question:", error);
      res.status(500).json({ message: "Failed to fetch sample question" });
    }
  });

  // Public diagnostic/readiness assessment: a short, ungated quiz used as a
  // lead-gen tool on the homepage. No subscription or login required, so
  // it's rate-limited by IP instead. Uses the same per-attempt option
  // shuffle as real exam sessions so the shared question bank is never
  // modified.
  app.post("/api/diagnostic/start", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const rateLimitResult = rateLimit(`diagnostic-start:${clientIp}`, 10, 15 * 60 * 1000);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          message: "Too many attempts. Please try again later.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
        });
      }

      const schema = z.object({ category: z.enum(examCategoryEnum.enumValues) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid category" });
      }

      const questions = await storage.getQuestions(parsed.data.category, DIAGNOSTIC_QUESTION_COUNT);
      if (questions.length === 0) {
        return res.status(404).json({ message: "No questions available for this category" });
      }

      const answerOrder: Record<string, number> = {};
      const questionsForClient = questions.map((question) => {
        const shuffled = shuffleQuestionOptions(
          question.optionsEn,
          question.optionsEs,
          question.correctAnswer,
        );
        answerOrder[question.id] = shuffled.correctAnswer;

        const { correctAnswer, explanationEn, explanationEs, ...rest } = question;
        return {
          ...rest,
          optionsEn: shuffled.optionsEn,
          optionsEs: shuffled.optionsEs,
        };
      });

      const attempt = await storage.createDiagnosticAttempt({
        userId: req.session.userId ?? undefined,
        category: parsed.data.category,
        questionIds: questions.map((q) => q.id),
        answerOrder,
        totalQuestions: questions.length,
      });

      res.json({ attemptId: attempt.id, questions: questionsForClient });
    } catch (error) {
      console.error("Error starting diagnostic assessment:", error);
      res.status(500).json({ message: "Failed to start assessment" });
    }
  });

  app.post("/api/diagnostic/:attemptId/submit", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const rateLimitResult = rateLimit(`diagnostic-submit:${clientIp}`, 20, 15 * 60 * 1000);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          message: "Too many attempts. Please try again later.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
        });
      }

      const { attemptId } = req.params;
      const schema = z.object({ answers: z.record(z.string(), z.number()) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid answers format" });
      }

      const attempt = await storage.getDiagnosticAttempt(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Assessment attempt not found" });
      }
      if (attempt.completedAt) {
        return res.status(400).json({ message: "This assessment has already been submitted" });
      }

      const answerOrder = attempt.answerOrder as Record<string, number>;
      const questionIds = attempt.questionIds as string[];
      const outcomes = new Map<string, boolean>();
      let correctAnswers = 0;
      for (const questionId of questionIds) {
        const correct = parsed.data.answers[questionId] === answerOrder[questionId];
        outcomes.set(questionId, correct);
        if (correct) correctAnswers++;
      }
      const score = Math.round((correctAnswers / attempt.totalQuestions) * 100);

      const updated = await storage.completeDiagnosticAttempt(attemptId, { score, correctAnswers });

      // Which areas cost them marks. This is the same pass that produced the
      // score, read for topic rather than thrown away, so it needs no extra
      // storage and cannot disagree with the number above it. Topic names
      // only - never which option was right.
      let weakAreas: WeakTopic[] = [];
      try {
        const questions = await storage.getQuestionsByIds(questionIds);
        weakAreas = weakTopics(
          questions.map((question) => ({
            topic: question.topic,
            correct: outcomes.get(question.id) === true,
          })),
          (topicId) => {
            const found = getTopicById(topicId);
            return found ? { nameEn: found.topic.nameEn, nameEs: found.topic.nameEs } : undefined;
          },
        );
      } catch (weaknessError) {
        // A student who finished their diagnostic is owed their score. Losing
        // the "focus next on" list is a smaller failure than turning a
        // completed attempt into a 500, so this degrades rather than throws.
        console.error("Error deriving diagnostic weak areas:", weaknessError);
      }

      res.json({
        score,
        correctAnswers,
        totalQuestions: attempt.totalQuestions,
        category: attempt.category,
        completedAt: updated?.completedAt,
        weakAreas,
      });
    } catch (error) {
      console.error("Error submitting diagnostic assessment:", error);
      res.status(500).json({ message: "Failed to submit assessment" });
    }
  });

  // ==========================================
  // Bilingual glossary
  // ==========================================

  /**
   * What a student sees. Published terms only.
   *
   * A draft is somebody's half-written definition of a legal term, which is
   * worse in front of a revising student than no definition at all.
   */
  app.get("/api/glossary", async (req, res) => {
    try {
      const raw = typeof req.query.category === "string" ? req.query.category : undefined;
      const category = examCategoryEnum.enumValues.includes(raw as ExamCategory)
        ? (raw as ExamCategory)
        : undefined;

      res.json(await storage.getPublishedGlossary(category));
    } catch (error) {
      console.error("Error fetching glossary:", error);
      res.status(500).json({ message: "Failed to fetch glossary" });
    }
  });

  /** Everything, drafts included. */
  app.get("/api/admin/glossary", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;
      res.json(await storage.getAllGlossaryTerms());
    } catch (error) {
      console.error("Error fetching glossary for admin:", error);
      res.status(500).json({ message: "Failed to fetch glossary" });
    }
  });

  /**
   * Terms the question bank uses that the glossary does not define yet.
   *
   * A worklist, never content: this returns phrases and where they appear,
   * and no definition of any kind. What a term means in Texas insurance or
   * real-estate law belongs to someone qualified to say so.
   */
  app.get("/api/admin/glossary/candidates", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;

      const raw = typeof req.query.category === "string" ? req.query.category : undefined;
      const category = examCategoryEnum.enumValues.includes(raw as ExamCategory)
        ? (raw as ExamCategory)
        : undefined;

      // No category means "across every exam", which the storage method does
      // not express - so ask for each and pool them.
      const categories = category ? [category] : [...examCategoryEnum.enumValues];
      const [pools, existing] = await Promise.all([
        Promise.all(categories.map((c) => storage.getActiveQuestions(c))),
        storage.getAllGlossaryTerms(),
      ]);
      const questionsInBank = pools.flat();

      res.json(
        glossaryCandidates(
          questionsInBank.map((q) => ({
            id: q.id,
            topic: q.topic,
            questionTextEn: q.questionTextEn,
            explanationEn: q.explanationEn,
          })),
          existing.map((t) => t.termEn),
        ),
      );
    } catch (error) {
      console.error("Error building glossary candidates:", error);
      res.status(500).json({ message: "Failed to build candidate list" });
    }
  });

  app.post("/api/admin/glossary", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = await requireAdmin(req, res);
      if (!adminId) return;

      const parsed = glossaryTermSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid term", errors: parsed.error.errors });
      }

      // Publishing needs both languages complete; saving a draft does not,
      // because a half-written entry is exactly what a draft is for.
      if (parsed.data.status === "published") {
        const gate = checkGlossaryDraft(parsed.data);
        if (!gate.ready) {
          return res.status(400).json({
            message: `Cannot publish yet - missing: ${gate.missing.join(", ")}`,
            missing: gate.missing,
          });
        }
      }

      res.json(await storage.createGlossaryTerm({ ...parsed.data, createdBy: adminId }));
    } catch (error: any) {
      // The unique index is the guard against two contradictory definitions
      // of one term, so a collision is a message rather than a 500.
      if (error?.code === "23505") {
        return res.status(409).json({ message: "That term is already defined for this exam" });
      }
      console.error("Error creating glossary term:", error);
      res.status(500).json({ message: "Failed to create term" });
    }
  });

  app.patch("/api/admin/glossary/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;

      const parsed = glossaryTermSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid term", errors: parsed.error.errors });
      }

      if (parsed.data.status === "published") {
        // Check the merged result, not just the patch: publishing a term by
        // sending only `status` must still verify what is already stored.
        const existing = (await storage.getAllGlossaryTerms()).find((t) => t.id === req.params.id);
        if (!existing) return res.status(404).json({ message: "Term not found" });

        const gate = checkGlossaryDraft({ ...existing, ...parsed.data });
        if (!gate.ready) {
          return res.status(400).json({
            message: `Cannot publish yet - missing: ${gate.missing.join(", ")}`,
            missing: gate.missing,
          });
        }
      }

      const updated = await storage.updateGlossaryTerm(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Term not found" });
      res.json(updated);
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "That term is already defined for this exam" });
      }
      console.error("Error updating glossary term:", error);
      res.status(500).json({ message: "Failed to update term" });
    }
  });

  app.delete("/api/admin/glossary/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;
      const removed = await storage.deleteGlossaryTerm(req.params.id);
      if (!removed) return res.status(404).json({ message: "Term not found" });
      res.json({ deleted: true });
    } catch (error) {
      console.error("Error deleting glossary term:", error);
      res.status(500).json({ message: "Failed to delete term" });
    }
  });

  /**
   * The student's most recent completed readiness check.
   *
   * WHY THIS EXISTS
   *
   * The result was already being written to diagnostic_attempts, and nothing
   * ever read it back. So a student would finish their readiness check, be
   * shown the subscribe prompt, decide not to subscribe yet, return to the
   * dashboard - and be asked to take the readiness check again, because the
   * dashboard's only evidence of activity was questions answered inside a
   * paid exam session, which is zero until they subscribe. They could repeat
   * that loop forever.
   *
   * Returns null rather than 404 when there is nothing: "this student has not
   * done one" is a normal answer, not an error, and a 404 makes every client
   * treat an ordinary state as a failure.
   */
  app.get("/api/diagnostic/latest", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attempt = await storage.getLatestDiagnosticAttempt(userId);
      if (!attempt) return res.json(null);

      // Deliberately not the questions, the answer order, or which items were
      // missed - this answers "have you done one, and how did it go".
      res.json({
        id: attempt.id,
        category: attempt.category,
        score: attempt.score,
        correctAnswers: attempt.correctAnswers,
        totalQuestions: attempt.totalQuestions,
        completedAt: attempt.completedAt,
      });
    } catch (error) {
      console.error("Error fetching latest diagnostic attempt:", error);
      res.status(500).json({ message: "Failed to fetch readiness check" });
    }
  });

  // Public guest preview of the real quick-practice exam: lets an
  // unauthenticated visitor try a handful of real questions from the bank
  // before hitting a sign-up wall. Deliberately does NOT create an
  // exam_sessions row (that table requires a userId, and a guest never
  // reaches "submit" - they're walled after GUEST_PREVIEW_QUESTION_COUNT
  // questions) - this just hands back a few shuffled questions, same as
  // the diagnostic assessment above. Rate-limited by IP.
  const GUEST_PREVIEW_QUESTION_COUNT = 5;

  app.post("/api/exams/guest-preview", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const rateLimitResult = rateLimit(`guest-preview:${clientIp}`, 10, 15 * 60 * 1000);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          message: "Too many attempts. Please try again later.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
        });
      }

      const schema = z.object({ category: z.enum(examCategoryEnum.enumValues) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid category" });
      }

      const questions = await storage.getQuestions(parsed.data.category, GUEST_PREVIEW_QUESTION_COUNT);
      if (questions.length === 0) {
        return res.status(404).json({ message: "No questions available for this category" });
      }

      const questionsForClient = questions.map((question) => {
        const shuffled = shuffleQuestionOptions(
          question.optionsEn,
          question.optionsEs,
          question.correctAnswer,
        );
        const { correctAnswer, explanationEn, explanationEs, ...rest } = question;
        return {
          ...rest,
          optionsEn: shuffled.optionsEn,
          optionsEs: shuffled.optionsEs,
        };
      });

      res.json({ questions: questionsForClient, limit: GUEST_PREVIEW_QUESTION_COUNT });
    } catch (error) {
      console.error("Error starting guest exam preview:", error);
      res.status(500).json({ message: "Failed to load practice questions" });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      res.json(await ensureProfile(userId));
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const parsed = profileUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: parsed.error.errors });
      }

      const {
        phone,
        preferredLanguage,
        examDate,
        examDateSkipped,
        hasPreviousAttempt,
        preferredCategory,
        emailRemindersOptIn,
      } = parsed.data;
      const sanitizedPhone = phone ? sanitizeHtml(phone) ?? phone : undefined;

      // Without this the UPDATE matches nothing for a student who has never
      // had a profile row, and the write is lost with a 200.
      await ensureProfile(userId);

      const updated = await storage.updateProfile(userId, {
        phone: sanitizedPhone,
        preferredLanguage,
        // undefined leaves the field alone; null clears it. The two date
        // fields can contradict each other, so they are reconciled in one
        // place rather than by the order of two spreads here.
        ...examDatePatch({ examDate, examDateSkipped }),
        ...(hasPreviousAttempt !== undefined ? { hasPreviousAttempt } : {}),
        ...(preferredCategory !== undefined ? { preferredCategory } : {}),
        ...(emailRemindersOptIn !== undefined ? { emailRemindersOptIn } : {}),
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/exams/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const parsed = startExamSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid category", errors: parsed.error.errors });
      }
      
      const { category, mode } = parsed.data;
      
      const subscriptionCheck = await ensureSubscriptionActive(userId, category);
      if (!subscriptionCheck.active) {
        return res.status(403).json({ message: subscriptionCheck.message });
      }
      
      if (mode === "targeted" && !resolveTargetedPractice(process.env[TARGETED_PRACTICE_ENV])) {
        return res.status(403).json({ message: "Targeted practice is not available yet" });
      }

      // Practice: 50 random questions, 90 min | Full Mock: 150 random questions, 120 min
      // Targeted: 50 questions weighted to this student's weak topics, 90 min.
      const questionLimit = questionCountFor(mode);
      const timeLimit = timeLimitFor(mode);
      
      console.log(`[Exam Start] Category: ${category}, Mode: ${mode}, Limit: ${questionLimit}, Time: ${timeLimit}s`);
      // Full mock = exam-day simulator: the paper is weighted so topics appear
      // in proportion to the bank rather than by luck of a random draw.
      // Practice stays a straight random sample.
      let questions;
      if (mode === "full" || mode === "targeted") {
        const activePool = await storage.getActiveQuestions(category);
        const pool = activePool.map((q) => ({ id: q.id, topic: q.topic }));
        const seed = Date.now();

        let paper;
        if (mode === "targeted") {
          const mastery = await storage.getTopicMastery(userId, category);
          // Only topics the student has actually attempted carry an accuracy.
          // The rest are left out so buildTargetedPaper treats them as
          // unknown rather than as a score of zero, which would send the
          // whole paper to topics they have simply never opened.
          const topicAccuracy = mastery
            .filter((m) => m.answered > 0 && m.topic)
            .map((m) => ({ topic: m.topic, accuracy: m.accuracy }));

          // A fortnight is long enough that a question is not fresh in mind
          // and short enough that a regular student still has unseen ones.
          const since = new Date(seed - RECENTLY_SEEN_WINDOW_MS);
          const recent = await storage.getResponsesSince(userId, since);

          paper = buildTargetedPaper({
            pool,
            targetCount: questionLimit,
            topicAccuracy,
            recentlySeenIds: recent.map((r) => r.questionId),
            seed,
          });
        } else {
          paper = buildSimulatorPaper({ pool, targetCount: questionLimit, seed });
        }

        const byId = new Map(activePool.map((q) => [q.id, q]));
        questions = paper
          .map((p) => byId.get(p.id))
          .filter((q): q is NonNullable<typeof q> => Boolean(q));
      } else {
        questions = await storage.getQuestions(category, questionLimit);
      }
      console.log(`[Exam Start] Retrieved ${questions.length} questions for category ${category}`);
      
      if (questions.length === 0) {
        return res.status(404).json({ message: "No questions available for this category" });
      }
      
      // Randomize each question's option order for this session only - the
      // shared question bank is never modified, so every attempt (by any
      // user, or the same user retaking the exam) gets its own fresh order.
      const answerOrder: Record<string, number> = {};
      const questionsForClient = questions.map((question) => {
        const shuffled = shuffleQuestionOptions(
          question.optionsEn,
          question.optionsEs,
          question.correctAnswer,
        );
        answerOrder[question.id] = shuffled.correctAnswer;

        const { correctAnswer, explanationEn, explanationEs, ...rest } = question;
        return {
          ...rest,
          optionsEn: shuffled.optionsEn,
          optionsEs: shuffled.optionsEs,
        };
      });

      const session = await storage.createExamSession({
        userId,
        category,
        questionIds: questions.map(q => q.id),
        answerOrder,
        currentQuestionIndex: 0,
        timeLimit,
        isCompleted: false,
        // Recorded so the result can say what kind of paper it was. A
        // targeted paper's score is not comparable with a full mock's.
        mode,
      });

      // Never send the per-session shuffled correct-answer mapping to the client
      const { answerOrder: _answerOrder, ...sessionForClient } = session;

      res.json({ session: sessionForClient, questions: questionsForClient });
    } catch (error) {
      console.error("Error starting exam:", error);
      res.status(500).json({ message: "Failed to start exam" });
    }
  });

  app.post("/api/exams/:sessionId/submit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;
      
      const parsed = submitExamSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid answers format. Expected { answers: { questionId: answerIndex } }",
          errors: parsed.error.errors 
        });
      }
      
      const { answers } = parsed.data;
      
      const session = await storage.getExamSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.isCompleted) {
        return res.status(400).json({ message: "Exam already submitted" });
      }
      
      const questionIds = session.questionIds as string[];
      const answerOrder = session.answerOrder as Record<string, number> | null;

      // One query for the whole paper instead of one per question.
      const sessionQuestions = await storage.getQuestionsByIds(questionIds);
      const questionsById = new Map(sessionQuestions.map((q) => [q.id, q]));

      const { correctAnswers, topicStats, responses } = gradePaper(
        questionIds,
        questionsById,
        answers,
        answerOrder,
      );

      const totalQuestions = questionIds.length;
      const { score, passed } = calculateExamScore(correctAnswers, totalQuestions);
      const timeTaken = Math.floor(
        (Date.now() - new Date(session.startedAt).getTime()) / 1000
      );

      await storage.updateExamSession(sessionId, {
        answers,
        isCompleted: true,
        completedAt: new Date(),
      });

      const result = await storage.createExamResult({
        userId,
        sessionId,
        category: session.category,
        totalQuestions,
        correctAnswers,
        score,
        passed,
        timeTaken,
      });

      // Response history feeds mastery, the EasyPass Score and adaptive
      // selection. It must never cost a student their submitted result, so a
      // failure here is logged and swallowed rather than surfaced.
      try {
        await storage.recordQuestionResponses(
          responses.map((r) => ({
            ...r,
            userId,
            category: session.category,
            // A targeted paper is a drill, and the existing enum already has
            // the word for it. Recorded honestly so the score can weigh these
            // answers correctly rather than mistaking them for a sitting that
            // sampled the whole syllabus.
            source: session.mode === "targeted" ? ("drill" as const) : ("exam" as const),
            sessionId,
          })),
        );
      } catch (error) {
        console.error("Error recording question responses:", error);
      }

      const topicBreakdown = calculateTopicBreakdown(topicStats);

      // EasyPass Score impact. Computed twice from the same history - once
      // including this sitting, once excluding it - so the delta reflects
      // what this exam actually moved rather than a remembered client value.
      // Never allowed to fail the submission.
      let readiness = null;
      try {
        const [allResponses, allResults, bankSize] = await Promise.all([
          storage.getResponsesForCategory(userId, session.category),
          storage.getExamResults(userId),
          storage.countActiveQuestions(session.category),
        ]);

        // Targeted papers are excluded: their score is depressed by design,
        // and letting it move the readiness figure would punish the student
        // for practising their weak areas.
        const categoryResults = allResults
          .filter((r) => r.category === session.category && isRepresentativeSitting(r.mode))
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

        const toScoreInput = (
          rows: typeof allResponses,
          mockScores: number[],
        ) => ({
          responses: rows.map((r) => ({
            questionId: r.questionId,
            topic: r.topic,
            isCorrect: r.isCorrect,
            answeredAt: new Date(r.answeredAt),
            // Carried so the score can leave drill answers out of the
            // recent-accuracy component. See server/easyPassScore.ts.
            source: r.source,
          })),
          mockExamScores: mockScores,
          questionBankSize: bankSize,
          now: new Date(),
        });

        const after = calculateEasyPassScore(
          toScoreInput(allResponses, categoryResults.map((r) => r.score)),
        );
        const before = calculateEasyPassScore(
          toScoreInput(
            allResponses.filter((r) => r.sessionId !== sessionId),
            categoryResults.filter((r) => r.sessionId !== sessionId).map((r) => r.score),
          ),
        );

        readiness = {
          score: after.score,
          band: after.band,
          delta: after.score - before.score,
          provisional: after.provisional,
          weakestTopic: after.weakestTopic,
        };
      } catch (error) {
        console.error("Error computing readiness impact:", error);
      }

      res.json({ result, topicBreakdown, readiness });
    } catch (error) {
      console.error("Error submitting exam:", error);
      res.status(500).json({ message: "Failed to submit exam" });
    }
  });

  app.delete("/api/exams/:sessionId/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;
      
      const session = await storage.getExamSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.isCompleted) {
        return res.status(400).json({ message: "Cannot cancel a completed exam" });
      }
      
      await storage.deleteExamSession(sessionId);
      
      res.json({ message: "Exam cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling exam:", error);
      res.status(500).json({ message: "Failed to cancel exam" });
    }
  });

  // EasyPass Score for one category. Deliberately not gated on subscription:
  // a lapsed student should still be able to see where they stand, and the
  // response contains no question content.
  /**
   * What is worth telling this student right now.
   *
   * Every reminder is derived from something already stored - a date they
   * gave us, an answer they recorded, a subscription period Stripe reported.
   * Nothing here is generated, so it costs nothing and works with the model
   * provider down.
   */
  app.get("/api/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [profile, missedIds, results, lastAnsweredAt] = await Promise.all([
        storage.getProfile(userId),
        storage.getMissedQuestionIds(userId),
        storage.getExamResults(userId),
        storage.getLastAnsweredAt(userId),
      ]);

      const language = profile?.preferredLanguage === "es" ? "es" : "en";
      const reminders = topReminders({
        now: new Date(),
        examDate: profile?.examDate ? new Date(profile.examDate) : null,
        subscriptionEndDate: profile?.subscriptionEndDate
          ? new Date(profile.subscriptionEndDate)
          : null,
        hasActiveSubscription: profile?.subscriptionStatus === "active",
        lastAnsweredAt,
        missedQuestionCount: missedIds.length,
        totalAttempts: results.length,
      });

      res.json({
        reminders: reminders.map((r) => ({ ...r, copy: reminderCopy(r, language) })),
        emailRemindersOptIn: profile?.emailRemindersOptIn === true,
      });
    } catch (error) {
      console.error("Error building reminders:", error);
      res.status(500).json({ message: "Failed to build reminders" });
    }
  });

  /**
   * One-click unsubscribe, no login required.
   *
   * Public by necessity: a student clicking a link in an email is often not
   * signed in, and making them sign in to stop emails is how people mark
   * messages as spam instead. The token can only turn reminders off - it
   * reads nothing and grants nothing else - and an unknown token gets the
   * same page as a valid one, so the endpoint cannot be used to test whether
   * a token exists.
   *
   * Accepts POST as well, because the List-Unsubscribe-Post header tells mail
   * clients they may unsubscribe with a POST and no user interaction.
   */
  const handleUnsubscribe = async (req: any, res: any) => {
    try {
      const token = String(req.query.token ?? "").trim();
      if (token) await storage.unsubscribeByToken(token);
      res
        .status(200)
        .type("html")
        .send(UNSUBSCRIBE_PAGE);
    } catch (error) {
      console.error("Error unsubscribing:", error);
      res.status(500).type("html").send(UNSUBSCRIBE_PAGE);
    }
  };
  app.get("/api/reminders/unsubscribe", handleUnsubscribe);
  app.post("/api/reminders/unsubscribe", handleUnsubscribe);

  /**
   * Send the reminder emails that are due.
   *
   * Guarded by a shared secret rather than a session, because the caller is a
   * scheduler and not a person. With REMINDER_DISPATCH_SECRET unset the route
   * refuses every request: an unauthenticated endpoint that sends mail to
   * every opted-in student is not something to leave open by default.
   */
  app.post("/api/reminders/dispatch", async (req, res) => {
    try {
      const secret = process.env.REMINDER_DISPATCH_SECRET;
      if (!secret) {
        return res.status(503).json({ message: "Reminder dispatch is not configured" });
      }
      const provided = req.get("x-reminder-secret") ?? "";
      // Length-independent comparison would be better still, but the secret
      // is a long random string and this is not a per-request oracle.
      if (provided !== secret) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const result = await dispatchReminderEmails();
      console.log("[Reminders] dispatch:", JSON.stringify(result));
      res.json(result);
    } catch (error) {
      console.error("Error dispatching reminders:", error);
      res.status(500).json({ message: "Failed to dispatch reminders" });
    }
  });

  app.get("/api/readiness/:category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.params;

      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }
      const examCategory = category as ExamCategory;

      const [responses, results, questionBankSize] = await Promise.all([
        storage.getResponsesForCategory(userId, examCategory),
        storage.getExamResults(userId),
        storage.countActiveQuestions(examCategory),
      ]);

      const mockExamScores = results
        .filter((r) => r.category === examCategory && isRepresentativeSitting(r.mode))
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .map((r) => r.score);

      const now = new Date();
      const scoreInput = responses.map((r) => ({
        questionId: r.questionId,
        topic: r.topic,
        isCorrect: r.isCorrect,
        answeredAt: new Date(r.answeredAt),
        source: r.source,
      }));

      const readiness = calculateEasyPassScore({
        responses: scoreInput,
        mockExamScores,
        questionBankSize,
        now,
      });

      // Weekly movement, computed rather than invented: re-run the same pure
      // scoring function over only the work that existed a week ago. A student
      // with under a week of history has no trend, and reporting one would be
      // a fabricated number on the most prominent card on the dashboard.
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const priorResponses = scoreInput.filter((r) => r.answeredAt <= weekAgo);
      let weeklyDelta: number | null = null;

      if (priorResponses.length > 0) {
        const prior = calculateEasyPassScore({
          responses: priorResponses,
          mockExamScores: results
            .filter((r) => r.category === examCategory && new Date(r.completedAt) <= weekAgo)
            .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
            .map((r) => r.score),
          questionBankSize,
          now: weekAgo,
        });
        // A provisional prior score is not a baseline worth subtracting from.
        if (!prior.provisional && !readiness.provisional) {
          weeklyDelta = readiness.score - prior.score;
        }
      }

      res.json({ ...readiness, weeklyDelta });
    } catch (error) {
      console.error("Error computing readiness score:", error);
      res.status(500).json({ message: "Failed to compute readiness score" });
    }
  });

  // Today's personalised study plan for one category, derived from the
  // student's actual topic standing, missed-question backlog and exam date.
  app.get("/api/study-plan/:category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.params;

      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }
      const examCategory = category as ExamCategory;

      const [mastery, missedIds, profile, results] = await Promise.all([
        storage.getTopicMastery(userId, examCategory),
        storage.getMissedQuestionIds(userId, examCategory),
        storage.getProfile(userId),
        storage.getExamResults(userId),
      ]);

      const plan = generateStudyPlan({
        topics: mastery.map((m) => ({
          topic: m.topic,
          answered: m.answered,
          accuracy: m.accuracy,
        })),
        missedQuestionCount: missedIds.length,
        examDate: profile?.examDate ? new Date(profile.examDate) : null,
        now: new Date(),
        hasPreviousAttempt: profile?.hasPreviousAttempt ?? false,
        hasSatMock: results.some((r) => r.category === examCategory),
      });

      res.json(plan);
    } catch (error) {
      console.error("Error generating study plan:", error);
      res.status(500).json({ message: "Failed to generate study plan" });
    }
  });

  // Topic mastery for the heatmap. Sorted weakest-first so the UI shows what
  // needs work at the top without re-sorting.
  app.get("/api/mastery/:category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.params;

      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }

      const mastery = await storage.getTopicMastery(userId, category as ExamCategory);
      res.json(mastery.sort((a, b) => a.accuracy - b.accuracy));
    } catch (error) {
      console.error("Error fetching topic mastery:", error);
      res.status(500).json({ message: "Failed to fetch topic mastery" });
    }
  });

  // --- Study assistant (Alexi) ------------------------------------------
  // Every capability here is feature-flagged and degrades to approved static
  // content when the AI provider is unavailable, so these routes never become
  // a dependency for studying.

  // What the browser may know about the assistant. Deliberately excludes
  // provider, model and prompt versions.
  app.get("/api/alexi/config", isAuthenticated, async (_req: any, res) => {
    try {
      res.json(studyAssistant.getConfig());
    } catch (error) {
      console.error("Error fetching assistant config:", error);
      res.status(500).json({ message: "Failed to fetch assistant config" });
    }
  });

  // The headline call: what should this student do next? The decision is
  // deterministic; only its phrasing may involve a model.
  app.get("/api/alexi/recommendation/:category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.params;

      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }

      const parsedMinutes = Number.parseInt(String(req.query.minutes ?? ""), 10);
      // Clamp rather than reject: a nonsense value should still produce a
      // sensible session, not an error page.
      const availableMinutes = Number.isFinite(parsedMinutes)
        ? Math.min(120, Math.max(5, parsedMinutes))
        : undefined;

      const result = await studyAssistant.getRecommendation(userId, category as ExamCategory, {
        availableMinutes,
      });
      res.json(result);
    } catch (error) {
      console.error("Error building study recommendation:", error);
      res.status(500).json({ message: "Failed to build recommendation" });
    }
  });

  // Grounded tutoring on a question the student has already answered.
  app.post("/api/alexi/tutor", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = alexiTutorSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ message: "Invalid request", errors: validated.error.errors });
      }

      const profile = await storage.getProfile(userId);
      const result = await studyAssistant.askTutor({
        userId,
        questionId: validated.data.questionId,
        intent: validated.data.intent,
        studentMessage: validated.data.message ?? null,
        // Language comes from the stored profile, not the request body - it is
        // not something a caller should be able to vary per request.
        language: profile?.preferredLanguage === "es" ? "es" : "en",
      });

      res.json(result);
    } catch (error) {
      console.error("Error answering tutor request:", error);
      res.status(500).json({ message: "Failed to answer" });
    }
  });

  // How many questions each category holds. Public: it is a fact about the
  // product, the same one the marketing pages state, and nothing about it is
  // specific to a student.
  app.get("/api/questions/counts", async (_req, res) => {
    try {
      res.json(await storage.getActiveQuestionCounts());
    } catch (error) {
      console.error("Error counting questions:", error);
      res.status(500).json({ message: "Failed to count questions" });
    }
  });

  // ---------------------------------------------------------------------
  // Alexi sessions.
  //
  // The recommendation engine has always described a session - "3-minute
  // review, 8 flashcards, 12 targeted questions" - and Start dropped the
  // student on a generic page. These two routes make the described session a
  // thing you can actually sit.
  //
  // Answers are recorded as `drill` responses, which feed mastery and the
  // EasyPass Score, but deliberately do NOT create an exam_result. A five
  // question warm-up is not a sitting, and letting it into "Recent Results"
  // would quietly redefine what that card means.
  // ---------------------------------------------------------------------
  app.post("/api/alexi/session/:category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.params;

      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }
      const examCategory = category as ExamCategory;

      const subscriptionCheck = await ensureSubscriptionActive(userId, examCategory);
      if (!subscriptionCheck.active) {
        return res.status(403).json({ message: subscriptionCheck.message });
      }

      const profile = await storage.getProfile(userId);
      const language = profile?.preferredLanguage === "es" ? "es" : "en";

      const requestedMinutes = Number.parseInt(String(req.query.minutes ?? ""), 10);
      const minutes = Number.isFinite(requestedMinutes)
        ? Math.min(Math.max(requestedMinutes, 5), 90)
        : 15;

      const recommendation = await studyAssistant.getRecommendation(userId, examCategory, {
        availableMinutes: minutes,
      });

      const [pool, responses] = await Promise.all([
        storage.getActiveQuestions(examCategory),
        storage.getResponsesForCategory(userId, examCategory),
      ]);

      // Option order is shuffled per session, so the stored bank is never
      // mutated and two students never share an answer key.
      const answerOrder: Record<string, number> = {};
      const plannable: PlannableQuestion[] = pool.map((question) => {
        const shuffled = shuffleQuestionOptions(
          question.optionsEn,
          question.optionsEs,
          question.correctAnswer,
        );
        answerOrder[question.id] = shuffled.correctAnswer;
        return {
          id: question.id,
          topic: question.topic ?? "General",
          questionText: language === "es" ? question.questionTextEs : question.questionTextEn,
          options: language === "es" ? shuffled.optionsEs : shuffled.optionsEn,
          correctAnswer: shuffled.correctAnswer,
          explanation: language === "es" ? question.explanationEs : question.explanationEn,
        };
      });

      // Key points for the teach step. Authored content in the study-topic
      // config wins; otherwise they are distilled from the approved
      // explanations on this concept, so every line is something the question
      // bank already says rather than something a model recalled.
      const conceptTopic = recommendation.recommendation.concept?.label ?? null;
      const authored = getTopicsByCategory(examCategory)
        .find((topic) =>
          [topic.nameEn, topic.nameEs].some(
            (n) => n.trim().toLowerCase() === conceptTopic?.trim().toLowerCase(),
          ),
        );
      const { points: keyPoints } = keyPointsFor(
        language === "es" ? authored?.keyPointsEs : authored?.keyPointsEn,
        plannable.map((q) => ({ topic: q.topic, explanation: q.explanation })),
        conceptTopic,
      );

      // The response log, not a pre-filtered list of misses: review selection
      // needs when each item was last seen as much as whether it was wrong.
      // Topic comes from the bank rather than the response row, so a question
      // re-filed under a different topic is scored where it now lives.
      const topicById = new Map(plannable.map((q) => [q.id, q.topic]));
      const plan = buildSessionPlan({
        blocks: recommendation.recommendation.blocks,
        pool: plannable,
        exposures: responses.map((r) => ({
          questionId: r.questionId,
          topic: topicById.get(r.questionId) ?? r.topic ?? "General",
          isCorrect: r.isCorrect,
          answeredAt: r.answeredAt,
        })),
        answeredQuestionIds: new Set(responses.map((r) => r.questionId)),
        conceptTopic,
        keyPoints,
      });

      if (plan.blocks.length === 0) {
        return res.status(404).json({ message: "No material available for this session" });
      }

      // A session row exists to hold the answer order for grading. It is
      // never completed through the exam-submit path.
      const session = await storage.createExamSession({
        userId,
        category: examCategory,
        questionIds: plan.questionIds,
        answerOrder,
        currentQuestionIndex: 0,
        timeLimit: plan.estimatedMinutes * 60,
        isCompleted: false,
      });

      res.json({
        sessionId: session.id,
        category: examCategory,
        headline: recommendation.recommendation.headline,
        phrasing: recommendation.phrasing,
        concept: recommendation.recommendation.concept,
        estimatedMinutes: plan.estimatedMinutes,
        blocks: plan.blocks,
      });
    } catch (error) {
      console.error("Error starting Alexi session:", error);
      res.status(500).json({ message: "Failed to start session" });
    }
  });

  // One answer at a time, so a student who stops halfway keeps credit for the
  // questions they did answer, and gets the explanation while the question is
  // still in front of them.
  app.post("/api/alexi/session/:sessionId/answer", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;

      const parsed = sessionAnswerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid answer", errors: parsed.error.errors });
      }
      const { questionId, answerIndex } = parsed.data;

      const session = await storage.getExamSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (!(session.questionIds as string[]).includes(questionId)) {
        return res.status(400).json({ message: "Question is not part of this session" });
      }

      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const profile = await storage.getProfile(userId);
      const language = profile?.preferredLanguage === "es" ? "es" : "en";

      // The shuffled index recorded when the session started is the authority,
      // never the bank's stored index - the student saw the shuffled order.
      const answerOrder = (session.answerOrder ?? {}) as Record<string, number>;
      const correctIndex = answerOrder[questionId] ?? question.correctAnswer;
      const isCorrect = answerIndex === correctIndex;

      await storage.recordQuestionResponses([
        {
          userId,
          questionId,
          category: session.category,
          topic: question.topic ?? "General",
          source: "drill",
          sessionId,
          selectedAnswer: answerIndex,
          isCorrect,
          language,
        },
      ]);

      res.json({
        isCorrect,
        correctIndex,
        explanation: language === "es" ? question.explanationEs : question.explanationEn,
      });
    } catch (error) {
      console.error("Error recording session answer:", error);
      res.status(500).json({ message: "Failed to record answer" });
    }
  });

  // ---------------------------------------------------------------------
  // Generated questions, and the review queue they must pass through.
  //
  // Nothing here can reach a student on its own. Drafts land in
  // `generated_questions`, a table no student-facing query touches, and only
  // an admin pressing Approve copies one into `questions`. The validator can
  // reject a draft outright; it can never approve one.
  // ---------------------------------------------------------------------
  async function requireAdmin(req: any, res: any): Promise<string | null> {
    const userId = req.user.claims.sub;
    const profile = await storage.getProfile(userId);
    if (profile?.role !== "admin") {
      res.status(403).json({ message: "Forbidden" });
      return null;
    }
    return userId;
  }

  // ---------------------------------------------------------------------
  // Partner acquisition CRM. Admin only, without exception.
  //
  // Everything below discloses business-development data: which organizations
  // we are approaching, who we spoke to there, what was said, and what we
  // think the opportunity is. None of it belongs in front of a student, and
  // the prospect list is not ours to publish - most of those organizations
  // have never heard of MyEasyPass.
  // ---------------------------------------------------------------------
  app.get("/api/admin/partners/prospects", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;
      res.json(await listProspects());
    } catch (error) {
      console.error("Error listing prospects:", error);
      res.status(500).json({ message: "Failed to list prospects" });
    }
  });

  app.patch("/api/admin/partners/prospects/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;

      const patch = { ...(req.body ?? {}) } as Record<string, unknown>;

      // A partner code becomes a public URL, so it is normalised to the shape
      // the route can actually resolve rather than stored as typed. Rejecting
      // here - instead of silently storing something unreachable - is the
      // difference between "that code is invalid" and a link that 404s for
      // every one of the partner's students.
      if (typeof patch.partnerCode === "string" && patch.partnerCode.trim() !== "") {
        const code = normalizePartnerCode(patch.partnerCode);
        if (!code) {
          return res.status(400).json({
            message: "Partner code must be letters, numbers and hyphens.",
          });
        }
        patch.partnerCode = code;
      }

      // VALIDATE WHAT THE RECORD WILL BE, NOT WHAT THE REQUEST SAYS
      //
      // The previous version only checked anything when `partnerActive: true`
      // appeared in the body, which meant a live partner could be edited into
      // a broken state one field at a time - clearing the exam category on its
      // own left the link active and pointing at nothing, because no rule ran.
      //
      // So the existing row is loaded, the patch applied on top, and the
      // RESULT validated. Splitting a change across two requests no longer
      // avoids the check.
      const existing = await prospectState(req.params.id);
      if (!existing) return res.status(404).json({ message: "Prospect not found" });

      // Once a link has been live its code is fixed. Analytics events carry the
      // code they were recorded under, and the performance report joins them to
      // the partner's current code - so renaming a live partner does not move
      // its history, it detaches it, and the partner appears to have sent
      // nobody. Aliases would fix that properly and are deliberately not being
      // improvised here.
      const codeProblem = partnerCodeChangeProblem(existing, patch.partnerCode as string | null | undefined);
      if (codeProblem) {
        return res.status(codeProblem.status).json({ message: codeProblem.message });
      }

      const resulting = {
        partnerStatus: ("partnerStatus" in patch ? patch.partnerStatus : existing.partnerStatus) as string | null,
        partnerCode: ("partnerCode" in patch ? patch.partnerCode : existing.partnerCode) as string | null,
        defaultExamCategory: ("defaultExamCategory" in patch
          ? patch.defaultExamCategory
          : existing.defaultExamCategory) as string | null,
        partnerActive: ("partnerActive" in patch ? patch.partnerActive : existing.partnerActive) as boolean | null,
        partnerCreatedAt: existing.partnerCreatedAt,
      };

      const problems = validatePartnerState(resulting);
      if (problems.length > 0) {
        // The first problem is the one to fix; listing all four at once reads
        // as a form error rather than an answer.
        return res.status(problems[0].status).json({ message: problems[0].message });
      }

      const updated = await updateProspect(req.params.id, patch);
      if (!updated) return res.status(404).json({ message: "Prospect not found" });

      res.json({ updated: true });
    } catch (error: any) {
      // The unique index on partner_code is the only constraint an admin can
      // realistically trip, and "that code is taken" is a far more useful
      // answer than a 500.
      if (error?.code === "23505") {
        return res.status(409).json({ message: "That partner code is already in use." });
      }
      console.error("Error updating prospect:", error);
      res.status(500).json({ message: "Failed to update prospect" });
    }
  });

  app.get("/api/admin/partners/performance", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;
      res.json(await partnerPerformance());
    } catch (error) {
      console.error("Error loading partner performance:", error);
      res.status(500).json({ message: "Failed to load partner performance" });
    }
  });

  /**
   * A draft email. Returned to the admin, never sent by us.
   *
   * There is no transport in this path on purpose - see shared/partnerOutreach.
   */
  app.get("/api/admin/partners/prospects/:id/outreach", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;

      const prospect = (await listProspects()).find((p) => p.id === req.params.id);
      if (!prospect) return res.status(404).json({ message: "Prospect not found" });

      res.json(buildOutreachDraft({
        organizationName: prospect.organizationName,
        segment: prospect.segment as PartnerSegment,
        decisionMakerName: prospect.decisionMakerName,
        partnershipHypothesis: prospect.partnershipHypothesis,
      }));
    } catch (error) {
      console.error("Error building outreach draft:", error);
      res.status(500).json({ message: "Failed to build draft" });
    }
  });

  // ---------------------------------------------------------------------
  // Automated partner outreach engine.
  //
  // Same operational pattern as study reminders: no scheduler in the app, a
  // secret-guarded dispatch route an external cron calls, and the run itself
  // decides whether anything may leave (business hours, daily limit, stop
  // conditions - see server/outreach/engine.ts). With OUTREACH_ENABLED unset
  // or the secret unset, nothing sends, ever.
  // ---------------------------------------------------------------------

  app.post("/api/outreach/dispatch", async (req, res) => {
    try {
      const secret = process.env.OUTREACH_DISPATCH_SECRET;
      if (!secret) {
        return res.status(503).json({ message: "Outreach dispatch is not configured" });
      }
      if ((req.get("x-outreach-secret") ?? "") !== secret) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const result = await runOutreachDispatch(new ResendOutreachEmailService());
      console.log("[Outreach] dispatch:", JSON.stringify(result));
      res.json(result);
    } catch (error) {
      console.error("Error dispatching outreach:", error);
      res.status(500).json({ message: "Failed to dispatch outreach" });
    }
  });

  /**
   * Resend webhooks: bounces, spam complaints, and inbound replies.
   *
   * Signature-verified against the endpoint secret (Svix scheme) using the
   * raw body captured by the JSON middleware. An unverifiable request learns
   * nothing: the same 401 whether the secret is wrong or the event unknown.
   */
  app.post("/api/outreach/webhook", async (req: any, res) => {
    try {
      const secret = process.env.OUTREACH_WEBHOOK_SECRET;
      if (!secret) {
        return res.status(503).json({ message: "Not configured" });
      }
      const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body ?? {});
      const verified = verifyWebhookSignature(rawBody, {
        id: req.get("svix-id"),
        timestamp: req.get("svix-timestamp"),
        signature: req.get("svix-signature"),
      }, secret);
      if (!verified) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const outcome = await processWebhookEvent(req.body ?? {}, new ResendOutreachEmailService());
      res.json(outcome);
    } catch (error) {
      console.error("Error processing outreach webhook:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  /**
   * One-click unsubscribe from any outreach email. Token-based, no login,
   * and deliberately uninformative: the response never confirms who the
   * token belonged to, and an invalid token gets the same page.
   */
  const outreachUnsubscribe = async (req: any, res: any) => {
    try {
      const limit = rateLimit(`outreach-unsub:${getClientIp(req)}`, 20, 15 * 60 * 1000);
      if (!limit.allowed) {
        return res.status(429).send("Too many requests. Please try again later.");
      }
      const token = String(req.query.token ?? "");
      if (token) await processUnsubscribeToken(token);
      res
        .status(200)
        .type("html")
        .send("<html><body style=\"font-family: sans-serif; padding: 40px;\"><h2>You're unsubscribed.</h2><p>You won't receive any more of these emails from MyEasyPass.</p></body></html>");
    } catch (error) {
      console.error("Error processing outreach unsubscribe:", error);
      res.status(200).type("html").send("<html><body style=\"font-family: sans-serif; padding: 40px;\"><h2>You're unsubscribed.</h2></body></html>");
    }
  };
  app.get("/api/outreach/unsubscribe", outreachUnsubscribe);
  app.post("/api/outreach/unsubscribe", outreachUnsubscribe);

  /** Campaign state for the admin table, keyed by prospect id. */
  app.get("/api/admin/partners/campaigns", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;
      res.json(await listCampaignSummaries());
    } catch (error) {
      console.error("Error listing campaigns:", error);
      res.status(500).json({ message: "Failed to list campaigns" });
    }
  });

  /**
   * The admin's controls over one prospect's automation. Pause and resume
   * hold or release the sequence; stop, mark-interested and
   * mark-not-interested end it. None of these touch partner activation -
   * that stays with the existing PATCH route and its validation.
   */
  app.post("/api/admin/partners/campaigns/:prospectId/action", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;

      const action = String(req.body?.action ?? "");
      const campaign = await campaignByProspect(req.params.prospectId);
      if (!campaign) return res.status(404).json({ message: "No campaign for this prospect" });

      switch (action) {
        case "pause":
          await setPaused(campaign.id, true);
          break;
        case "resume":
          await setPaused(campaign.id, false);
          break;
        case "stop":
          await transitionCampaign(campaign.id, "stopped", { stopReason: "manual_stop" });
          break;
        case "mark_interested":
          await transitionCampaign(campaign.id, "interested", { stopReason: "manual_classification" });
          break;
        case "mark_not_interested":
          await transitionCampaign(campaign.id, "not_interested", { stopReason: "manual_classification" });
          break;
        default:
          return res.status(400).json({ message: "Unknown action" });
      }

      res.json({ updated: true });
    } catch (error) {
      console.error("Error applying campaign action:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.post("/api/admin/generate-questions/:category", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = await requireAdmin(req, res);
      if (!adminId) return;

      const { category } = req.params;
      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }
      const examCategory = category as ExamCategory;

      const config = getAIConfig();
      if (!config.flags.enabled || !config.flags.quizGenerationEnabled) {
        return res.status(503).json({
          message: "Question generation is switched off. Set ALEXI_QUIZ_GENERATION_ENABLED to use it.",
        });
      }

      const wanted = Math.min(Math.max(Number(req.body?.count) || 5, 1), MAX_BATCH_SIZE);
      const topic = typeof req.body?.topic === "string" ? req.body.topic : null;

      const pool = await storage.getActiveQuestions(examCategory);
      const onTopic = topic
        ? pool.filter((q) => (q.topic ?? "").trim().toLowerCase() === topic.trim().toLowerCase())
        : pool;
      if (onTopic.length === 0) {
        return res.status(404).json({ message: "No approved questions to ground generation in" });
      }

      // Variants are grounded in approved bank questions, so the sources are
      // real questions with real explanations - never a bare topic name.
      const sources: SourceQuestion[] = onTopic.slice(0, 6).map((q) => ({
        id: q.id,
        topic: q.topic,
        questionText: q.questionTextEn,
        options: q.optionsEn,
        correctIndex: q.correctAnswer,
        explanation: q.explanationEn,
      }));

      const conceptTopicName = topic ?? sources[0].topic ?? "General";
      const generationInput = {
        examId: examCategory,
        conceptId: conceptIdFor(conceptTopicName),
        sources,
        count: batchSizeFor(wanted),
        difficulty: "standard" as const,
        language: "en" as const,
      };
      const generated = await getProvider().complete(buildGenerationRequest(generationInput));

      // Parsing needs the same input the request was built from, so a response
      // can be checked against what was actually asked for.
      const candidates = parseGenerationResponse(generated.text, generationInput);
      if (candidates.length === 0) {
        return res.status(502).json({ message: "The generator returned nothing usable" });
      }

      const existingTexts = pool.map((q) => q.questionTextEn);
      const drafts = [];
      const discarded: string[] = [];

      for (const candidate of candidates) {
        // Gate 1: deterministic checks - shape, leakage, duplication.
        const deterministic = validateGeneratedQuestion(candidate, {
          validExamIds: [...examCategoryEnum.enumValues],
          existingQuestions: existingTexts,
          allowedSourceIds: sources.map((src) => src.id),
        });
        if (!deterministic.passed) {
          discarded.push(deterministic.issues.map((i) => i.detail).join("; "));
          continue;
        }

        // Gate 2: an independent model pass that may only reject.
        const checked = await getProvider().complete(
          buildValidationRequest(candidate, sources),
        );
        const verdict = interpretValidation(checked.text);
        if (verdict.verdict !== "PASS") {
          discarded.push(verdict.reason || "validator rejected");
          continue;
        }

        drafts.push({
          category: examCategory,
          topic: candidate.topic ?? topic ?? null,
          questionTextEn: candidate.question,
          optionsEn: candidate.choices.map((c) => c.text),
          // The generator names the answer by choice id ("A"); the bank stores
          // an index. Convert once, here, rather than at every reader.
          correctAnswer: Math.max(
            0,
            candidate.choices.findIndex((c) => c.id === candidate.correctAnswer),
          ),
          explanationEn: candidate.explanation,
          sourceQuestionIds: candidate.sourceIds ?? sources.map((src) => src.id),
          status: "pending" as const,
          validationNotes: deterministic.issues.map((i) => `${i.severity}: ${i.detail}`),
          validatorConfidenceBasisPoints: Math.round((verdict.confidence ?? 0) * 10000),
          promptRef: GENERATION_VERSION,
        });
      }

      const stored = await storage.createGeneratedQuestions(drafts);
      res.json({
        generated: candidates.length,
        queuedForReview: stored,
        discarded: discarded.length,
        // Said plainly so nobody assumes these are live.
        note: "Drafts are queued for review. None of them reach students until an admin approves them.",
      });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ message: "Failed to generate questions" });
    }
  });

  app.get("/api/admin/generated-questions", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = await requireAdmin(req, res);
      if (!adminId) return;
      const status = ["pending", "approved", "rejected"].includes(String(req.query.status))
        ? String(req.query.status)
        : "pending";
      res.json(await storage.listGeneratedQuestions(status));
    } catch (error) {
      console.error("Error listing generated questions:", error);
      res.status(500).json({ message: "Failed to list generated questions" });
    }
  });

  app.post("/api/admin/generated-questions/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = await requireAdmin(req, res);
      if (!adminId) return;

      const parsed = approveDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid question", errors: parsed.error.errors });
      }
      const { note, ...edits } = parsed.data;

      // The reviewer's edited text is what publishes, not the draft: someone
      // who corrected the wording expects the correction to be what ships.
      const result = await storage.approveGeneratedQuestion(req.params.id, adminId, {
        questionTextEn: edits.questionTextEn,
        questionTextEs: edits.questionTextEs,
        optionsEn: edits.optionsEn,
        optionsEs: edits.optionsEs,
        correctAnswer: edits.correctAnswer,
        explanationEn: edits.explanationEn ?? null,
        explanationEs: edits.explanationEs ?? null,
        topic: edits.topic ?? null,
      }, note);

      if (!result) {
        return res.status(409).json({ message: "That draft has already been reviewed" });
      }
      res.json({ questionId: result.questionId });
    } catch (error) {
      console.error("Error approving generated question:", error);
      res.status(500).json({ message: "Failed to approve question" });
    }
  });

  app.post("/api/admin/generated-questions/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = await requireAdmin(req, res);
      if (!adminId) return;
      const parsed = rejectDraftSchema.safeParse(req.body ?? {});
      const ok = await storage.rejectGeneratedQuestion(
        req.params.id, adminId, parsed.success ? parsed.data.note : undefined,
      );
      if (!ok) return res.status(409).json({ message: "That draft has already been reviewed" });
      res.json({ rejected: true });
    } catch (error) {
      console.error("Error rejecting generated question:", error);
      res.status(500).json({ message: "Failed to reject question" });
    }
  });

  // Schema health. Reports which expected tables and columns are actually
  // present in the database.
  //
  // The admin gate uses a RAW query for the role rather than storage.getProfile,
  // because the failure this diagnoses is a missing column on user_profiles -
  // and getProfile is precisely what breaks then. A diagnostic that fails the
  // same way as the bug is no diagnostic at all.
  app.get("/api/admin/schema-health", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roleResult = await pool.query(
        "SELECT role FROM user_profiles WHERE user_id = $1 LIMIT 1",
        [userId],
      );
      if (roleResult.rows[0]?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(await checkSchemaHealth());
    } catch (error) {
      console.error("Error checking schema health:", error);
      res.status(500).json({ message: "Failed to check schema health" });
    }
  });

  // AI spend and reliability rollup. Admin only - cost data is internal.
  app.get("/api/admin/ai-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const parsedDays = Number.parseInt(String(req.query.days ?? ""), 10);
      const days = Number.isFinite(parsedDays) ? Math.min(90, Math.max(1, parsedDays)) : 30;

      res.json(await storage.getAiUsageSummary(days));
    } catch (error) {
      console.error("Error fetching AI usage summary:", error);
      res.status(500).json({ message: "Failed to fetch AI usage" });
    }
  });

  // Weak-area drill: a practice session built from the questions most likely
  // to move this student's readiness, rather than a random draw from the bank.
  app.post("/api/drills/weak-areas/:category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.params;

      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }
      const examCategory = category as ExamCategory;

      const subscriptionCheck = await ensureSubscriptionActive(userId, examCategory);
      if (!subscriptionCheck.active) {
        return res.status(403).json({ message: subscriptionCheck.message });
      }

      const requested = Number(req.body?.questionCount);
      const drillSize = Number.isFinite(requested)
        ? Math.min(Math.max(Math.trunc(requested), 5), 50)
        : 20;

      const [pool, mastery, responses] = await Promise.all([
        storage.getActiveQuestions(examCategory),
        storage.getTopicMastery(userId, examCategory),
        storage.getResponsesForCategory(userId, examCategory),
      ]);

      if (pool.length === 0) {
        return res.status(404).json({ message: "No questions available for this category" });
      }

      // Aim the drill at the level this student is actually working at, from
      // their standing on the weakest topic. Questions the bank has not yet
      // calibrated score neutral, so this degrades rather than starving the
      // pool while calibration is still filling in.
      const weakestAccuracy = mastery.length > 0
        ? Math.min(...mastery.map((m) => m.accuracy))
        : null;
      const targetDifficulty = difficultyFor(weakestAccuracy);

      const selected = selectAdaptiveQuestions(
        {
          candidates: pool.map((q) => ({ id: q.id, topic: q.topic, difficulty: q.difficulty })),
          topicAccuracy: new Map(mastery.map((m) => [m.topic, m.accuracy])),
          history: buildHistory(
            responses.map((r) => ({
              questionId: r.questionId,
              isCorrect: r.isCorrect,
              answeredAt: new Date(r.answeredAt),
            })),
          ),
          targetDifficulty,
          now: new Date(),
        },
        drillSize,
      );

      const byId = new Map(pool.map((q) => [q.id, q]));
      const drillQuestions = selected
        .map((s) => byId.get(s.id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q));

      // Same per-session option shuffling as a normal exam, so the shared
      // question bank is never mutated and each attempt gets its own order.
      const answerOrder: Record<string, number> = {};
      const questionsForClient = drillQuestions.map((question) => {
        const shuffled = shuffleQuestionOptions(
          question.optionsEn,
          question.optionsEs,
          question.correctAnswer,
        );
        answerOrder[question.id] = shuffled.correctAnswer;

        const { correctAnswer, explanationEn, explanationEs, ...rest } = question;
        return { ...rest, optionsEn: shuffled.optionsEn, optionsEs: shuffled.optionsEs };
      });

      const session = await storage.createExamSession({
        userId,
        category: examCategory,
        questionIds: drillQuestions.map((q) => q.id),
        answerOrder,
        currentQuestionIndex: 0,
        // Roughly 90 seconds per question; drills are practice, not timed exams.
        timeLimit: drillQuestions.length * 90,
        isCompleted: false,
      });

      const { answerOrder: _omit, ...sessionForClient } = session;

      res.json({
        session: sessionForClient,
        questions: questionsForClient,
        // What the drill targeted, so the UI can say why these questions.
        targetedTopics: mastery
          .filter((m) => m.accuracy < 70)
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 3)
          .map((m) => ({ topic: m.topic, accuracy: m.accuracy })),
      });
    } catch (error) {
      console.error("Error starting weak-area drill:", error);
      res.status(500).json({ message: "Failed to start weak-area drill" });
    }
  });

  // The missed-question notebook. Returns full question detail including the
  // correct answer and explanation, because reviewing a miss without seeing
  // why it was wrong is useless.
  //
  // Deliberately NOT subscription gated. The payload is bounded to questions
  // this student has already answered, and responses are only written on
  // authenticated exam submit, so a student who never subscribed has no
  // history to read. Gating it would only stop lapsed students from reviewing
  // work they already did.
  app.get("/api/missed-questions/:category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.params;

      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }
      const examCategory = category as ExamCategory;

      const filterParam = String(req.query.filter ?? "all");
      const filter: NotebookFilter = (
        ["all", "struggling", "mastered", "recent", "topic"] as const
      ).includes(filterParam as NotebookFilter)
        ? (filterParam as NotebookFilter)
        : "all";
      const topic = req.query.topic ? String(req.query.topic) : undefined;

      const [responses, bookmarkedIds] = await Promise.all([
        storage.getResponsesForCategory(userId, examCategory),
        storage.getBookmarkedQuestionIds(userId, examCategory),
      ]);

      const notebook = buildNotebook(
        responses.map((r) => ({
          questionId: r.questionId,
          topic: r.topic,
          isCorrect: r.isCorrect,
          answeredAt: new Date(r.answeredAt),
        })),
        new Date(),
      );

      const counts = notebookCounts(notebook);
      const visible = filterNotebook(notebook, filter, topic);

      // Hydrate only the entries actually being shown.
      const questionRows = await storage.getQuestionsByIds(visible.map((e) => e.questionId));
      const byId = new Map(questionRows.map((q) => [q.id, q]));
      const bookmarked = new Set(bookmarkedIds);

      const entries = visible
        .map((entry) => {
          const question = byId.get(entry.questionId);
          // A question deleted from the bank leaves history behind; drop it
          // from the notebook rather than rendering a blank card.
          if (!question) return null;
          return {
            ...entry,
            isBookmarked: bookmarked.has(entry.questionId),
            question: {
              id: question.id,
              topic: question.topic,
              questionTextEn: question.questionTextEn,
              questionTextEs: question.questionTextEs,
              optionsEn: question.optionsEn,
              optionsEs: question.optionsEs,
              correctAnswer: question.correctAnswer,
              explanationEn: question.explanationEn,
              explanationEs: question.explanationEs,
            },
          };
        })
        .filter(Boolean);

      const topics = Array.from(new Set(notebook.map((e) => e.topic))).sort();

      res.json({ entries, counts, topics });
    } catch (error) {
      console.error("Error fetching missed questions:", error);
      res.status(500).json({ message: "Failed to fetch missed questions" });
    }
  });

  app.post("/api/bookmarks/:questionId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { questionId } = req.params;

      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const result = await storage.toggleBookmark(userId, questionId, question.category);
      res.json(result);
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      res.status(500).json({ message: "Failed to toggle bookmark" });
    }
  });

  // Smart flashcards. Cards are backed by existing questions - front is the
  // question, back is the correct answer and explanation - so the deck never
  // drifts from the question bank.
  app.get("/api/flashcards/:category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.params;

      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }
      const examCategory = category as ExamCategory;

      const requested = Number(req.query.limit);
      const limit = Number.isFinite(requested)
        ? Math.min(Math.max(Math.trunc(requested), 1), 50)
        : 20;
      const scope = String(req.query.scope ?? "smart");

      const [pool, reviews, mastery, responses, bookmarkIds] = await Promise.all([
        storage.getActiveQuestions(examCategory),
        storage.getFlashcardReviews(userId, examCategory),
        storage.getTopicMastery(userId, examCategory),
        storage.getResponsesForCategory(userId, examCategory),
        storage.getBookmarkedQuestionIds(userId, examCategory),
      ]);

      const stateByQuestion = new Map(
        reviews.map((r) => [
          r.questionId,
          {
            streak: r.streak,
            intervalDays: r.intervalDays,
            ease: r.easeHundredths / 100,
            dueAt: new Date(r.dueAt),
          },
        ]),
      );
      const accuracyByTopic = new Map(mastery.map((m) => [m.topic, m.accuracy]));
      const history = buildHistory(
        responses.map((r) => ({
          questionId: r.questionId,
          isCorrect: r.isCorrect,
          answeredAt: new Date(r.answeredAt),
        })),
      );
      const bookmarked = new Set(bookmarkIds);

      let candidates = pool.map((q) => ({
        questionId: q.id,
        topic: q.topic || "General",
        state: stateByQuestion.get(q.id) ?? null,
        topicAccuracy: accuracyByTopic.get(q.topic || "General") ?? null,
        lastWasWrong: history.get(q.id)?.lastWasWrong ?? false,
        isBookmarked: bookmarked.has(q.id),
      }));

      // Scopes narrow the deck before scheduling decides the order.
      if (scope === "bookmarked") {
        candidates = candidates.filter((c) => c.isBookmarked);
      } else if (scope === "weak") {
        candidates = candidates.filter(
          (c) => c.topicAccuracy !== null && c.topicAccuracy < 70,
        );
      } else if (scope === "missed") {
        candidates = candidates.filter((c) => c.lastWasWrong);
      } else if (req.query.topic) {
        candidates = candidates.filter((c) => c.topic === String(req.query.topic));
      }

      const due = selectDueCards(candidates, new Date(), limit);
      const byId = new Map(pool.map((q) => [q.id, q]));

      const cards = due
        .map((c) => byId.get(c.questionId))
        .filter((q): q is NonNullable<typeof q> => Boolean(q))
        .map((q) => ({
          questionId: q.id,
          topic: q.topic || "General",
          frontEn: q.questionTextEn,
          frontEs: q.questionTextEs,
          backEn: q.optionsEn[q.correctAnswer],
          backEs: q.optionsEs[q.correctAnswer],
          explanationEn: q.explanationEn,
          explanationEs: q.explanationEs,
        }));

      res.json({ cards, dueCount: candidates.filter((c) => !c.state || c.state.dueAt <= new Date()).length });
    } catch (error) {
      console.error("Error building flashcard deck:", error);
      res.status(500).json({ message: "Failed to build flashcard deck" });
    }
  });

  app.post("/api/flashcards/:questionId/review", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { questionId } = req.params;
      const rating = req.body?.rating;

      if (rating !== "known" && rating !== "needs_work") {
        return res.status(400).json({ message: "rating must be 'known' or 'needs_work'" });
      }

      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const now = new Date();
      const existing = (await storage.getFlashcardReviews(userId, question.category))
        .find((r) => r.questionId === questionId);

      const current = existing
        ? {
            streak: existing.streak,
            intervalDays: existing.intervalDays,
            ease: existing.easeHundredths / 100,
            dueAt: new Date(existing.dueAt),
          }
        : newCardState(now);

      const next = scheduleNext(current, rating, now);
      await storage.upsertFlashcardReview(userId, questionId, question.category, next);

      res.json({ dueAt: next.dueAt, intervalDays: next.intervalDays, streak: next.streak });
    } catch (error) {
      console.error("Error recording flashcard review:", error);
      res.status(500).json({ message: "Failed to record review" });
    }
  });

  app.get("/api/results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const results = await storage.getExamResults(userId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  // Generate certificate for a passed exam result
  app.post("/api/results/:resultId/certificate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { resultId } = req.params;
      
      // Get the exam result and verify ownership
      const results = await storage.getExamResults(userId);
      const result = results.find(r => r.id === resultId);
      
      if (!result) {
        return res.status(404).json({ message: "Result not found" });
      }
      
      if (!result.passed) {
        return res.status(400).json({ message: "Certificate can only be generated for passed exams" });
      }
      
      // Check if certificate already exists
      const existing = await storage.getCertificateByResultId(resultId);
      if (existing) {
        return res.json(existing);
      }
      
      // Get user info for certificate name
      const user = await storage.getUser(userId);
      const recipientName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user?.firstName || user?.email?.split('@')[0] || 'Student';
      
      // Generate unique slug (10 chars alphanumeric)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let slug = '';
      for (let i = 0; i < 10; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const certificate = await storage.createCertificate({
        resultId,
        userId,
        category: result.category,
        score: result.score,
        slug,
        recipientName,
        completedAt: result.completedAt,
      });
      
      res.json(certificate);
    } catch (error) {
      console.error("Error generating certificate:", error);
      res.status(500).json({ message: "Failed to generate certificate" });
    }
  });

  // Get user's certificates
  app.get("/api/certificates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const certificates = await storage.getCertificatesByUser(userId);
      res.json(certificates);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  // Public endpoint - Get certificate by slug (for sharing)
  app.get("/api/certificates/public/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const certificate = await storage.getCertificateBySlug(slug);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      
      if (certificate.isRevoked) {
        return res.status(410).json({ message: "This certificate has been revoked" });
      }
      
      // Return certificate data (minimal PII)
      res.json({
        id: certificate.id,
        recipientName: certificate.recipientName,
        category: certificate.category,
        score: certificate.score,
        completedAt: certificate.completedAt,
        slug: certificate.slug,
      });
    } catch (error) {
      console.error("Error fetching public certificate:", error);
      res.status(500).json({ message: "Failed to fetch certificate" });
    }
  });

  // Guest article submission (public endpoint)
  app.post("/api/guest-articles", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const rateLimitResult = rateLimit(`guest-articles:${clientIp}`, 5, 15 * 60 * 1000);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          message: "Too many submissions. Please try again later.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
        });
      }

      const parsed = insertGuestArticleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid submission", errors: parsed.error.errors });
      }

      const sanitizedData = {
        ...parsed.data,
        name: sanitizeHtml(parsed.data.name) ?? parsed.data.name,
        email: parsed.data.email,
        topic: sanitizeHtml(parsed.data.topic) ?? parsed.data.topic,
        message: sanitizeHtml(parsed.data.message) ?? parsed.data.message,
        articleUrl: parsed.data.articleUrl ? sanitizeHtml(parsed.data.articleUrl) ?? parsed.data.articleUrl : null,
      };
      
      const article = await storage.createGuestArticle(sanitizedData);
      res.status(201).json({ message: "Article submission received", id: article.id });
    } catch (error) {
      console.error("Error submitting guest article:", error);
      res.status(500).json({ message: "Failed to submit article" });
    }
  });

  // Admin: Get all guest articles
  app.get("/api/admin/guest-articles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const articles = await storage.getAllGuestArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching guest articles:", error);
      res.status(500).json({ message: "Failed to fetch guest articles" });
    }
  });

  // Admin: Update guest article status
  app.patch("/api/admin/guest-articles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { id } = req.params;
      const statusSchema = z.object({
        status: z.enum(guestArticleStatusEnum.enumValues),
        adminNotes: z.string().optional(),
      });
      
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid status", errors: parsed.error.errors });
      }
      
      const article = await storage.updateGuestArticleStatus(id, parsed.data.status, parsed.data.adminNotes);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      res.json(article);
    } catch (error) {
      console.error("Error updating guest article:", error);
      res.status(500).json({ message: "Failed to update guest article" });
    }
  });

  // Employer inquiry lead form - public submission
  app.post("/api/employer-inquiries", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const rateLimitResult = rateLimit(`employer-inquiries:${clientIp}`, 5, 15 * 60 * 1000);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          message: "Too many submissions. Please try again later.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
        });
      }

      const parsed = insertEmployerInquirySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid submission", errors: parsed.error.errors });
      }

      const sanitizedData = {
        ...parsed.data,
        companyName: sanitizeHtml(parsed.data.companyName) ?? parsed.data.companyName,
        contactName: sanitizeHtml(parsed.data.contactName) ?? parsed.data.contactName,
        email: parsed.data.email,
        phone: parsed.data.phone ? sanitizeHtml(parsed.data.phone) ?? parsed.data.phone : undefined,
        teamSize: parsed.data.teamSize ? sanitizeHtml(parsed.data.teamSize) ?? parsed.data.teamSize : undefined,
        message: parsed.data.message ? sanitizeHtml(parsed.data.message) ?? parsed.data.message : undefined,
      };

      const inquiry = await storage.createEmployerInquiry(sanitizedData);
      res.status(201).json({ message: "Inquiry received", id: inquiry.id });
    } catch (error) {
      console.error("Error submitting employer inquiry:", error);
      res.status(500).json({ message: "Failed to submit inquiry" });
    }
  });

  // Admin: Get all employer inquiries
  app.get("/api/admin/employer-inquiries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const inquiries = await storage.getAllEmployerInquiries();
      res.json(inquiries);
    } catch (error) {
      console.error("Error fetching employer inquiries:", error);
      res.status(500).json({ message: "Failed to fetch employer inquiries" });
    }
  });

  // Admin: Update employer inquiry status
  app.patch("/api/admin/employer-inquiries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const statusSchema = z.object({
        status: z.enum(employerInquiryStatusEnum.enumValues),
        adminNotes: z.string().optional(),
      });

      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid status", errors: parsed.error.errors });
      }

      const inquiry = await storage.updateEmployerInquiryStatus(id, parsed.data.status, parsed.data.adminNotes);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }

      res.json(inquiry);
    } catch (error) {
      console.error("Error updating employer inquiry:", error);
      res.status(500).json({ message: "Failed to update employer inquiry" });
    }
  });

  // Analytics: lightweight self-hosted event log (no third-party platform
  // configured - see Phase 1 audit). Accepts events from both anonymous and
  // authenticated visitors; failures here must never break the page.
  const analyticsEventSchema = z.object({
    event: z.string().min(1).max(100),
    path: z.string().max(500).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  });

  /**
   * Resolve a partner code for the public /p/:partnerCode route.
   *
   * Answers 404 for anything that is not a live partner - an unknown code, a
   * prospect nobody activated, a partner switched off. One answer for all
   * three on purpose: a distinguishable "exists but inactive" would confirm
   * that MyEasyPass holds a record on that organization, and most of the
   * organizations in that table have never heard of us.
   *
   * On success it returns the minimum needed to render the visit, and stashes
   * the partner server-side so the attribution survives the rest of the funnel
   * without the browser having to carry it.
   */
  app.get("/api/partners/resolve/:partnerCode", async (req: any, res) => {
    try {
      const clientIp = getClientIp(req);
      // Codes are guessable by design - they are short and meant to be typed -
      // so this is the thing that stops the endpoint being walked to enumerate
      // which organizations we have activated.
      const rateLimitResult = rateLimit(`partner-resolve:${clientIp}`, 30, 15 * 60 * 1000);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          message: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
        });
      }

      const code = normalizePartnerCode(req.params.partnerCode);
      if (!code) return res.status(404).json({ message: "Not found" });

      const partner = await resolveActivePartner(code);
      if (!partner) return res.status(404).json({ message: "Not found" });

      // First touch wins. A visitor who arrives through a second partner's
      // link later in the same session still belongs to the one that
      // introduced them.
      if (!req.session.partnerAttribution) {
        req.session.partnerAttribution = {
          prospectId: partner.prospectId,
          partnerCode: partner.partnerCode,
        };
      }

      // WHO OWNS THIS STUDENT, AS OPPOSED TO WHOSE LINK THEY JUST CLICKED
      //
      // These are different questions and the answer differs for a returning
      // student. The database already refused to move an existing attribution,
      // so revenue stayed with the original partner - but the response still
      // named the clicked partner, the client remembered that, and every event
      // for the rest of the visit was filed under it. The result was a report
      // where one partner had the visits and the diagnostics and another had
      // the subscription, which is not two views of one funnel; it is two
      // wrong funnels.
      //
      // So the owner is resolved here, from the student's stored attribution
      // when there is one, and returned separately from the clicked code.
      let attributionPartnerCode = partner.partnerCode;

      if (req.session.userId) {
        const existing = await storedAttribution(req.session.userId).catch((error) => {
          console.error("Stored partner attribution lookup failed:", error);
          return null;
        });

        if (existing) {
          // Already owned. Nothing is written, and the clicked partner does
          // not become the analytics owner either.
          attributionPartnerCode = existing.partnerCode;
        } else {
          // No owner yet: this link is the introduction, exactly as it is for
          // an anonymous visitor who registers later.
          await attributeUserToPartner(req.session.userId, {
            prospectId: partner.prospectId,
            partnerCode: partner.partnerCode,
          }).catch((error) => {
            console.error("Partner attribution failed:", error);
          });
        }
      } else if (req.session.partnerAttribution) {
        // An anonymous visitor who follows a second link in the same visit
        // keeps the first one, which is what the session already holds.
        attributionPartnerCode = req.session.partnerAttribution.partnerCode;
      }

      res.json({
        // The link that was clicked. Drives navigation, and is reported as
        // referral_partner_code so "which link is being shared" stays visible.
        partnerCode: partner.partnerCode,
        // Who the acquisition belongs to. This is what analytics must group by,
        // and it is the code the verified subscription will be credited to.
        attributionPartnerCode,
        displayName: partner.displayName,
        examCategory: partner.examCategory,
        landingVariant: partner.landingVariant,
      });
    } catch (error) {
      console.error("Error resolving partner code:", error);
      res.status(500).json({ message: "Failed to resolve partner" });
    }
  });

  app.post("/api/analytics/events", async (req: any, res) => {
    try {
      const parsed = analyticsEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid event" });
      }

      const userId = req.user?.claims?.sub;

      await storage.createAnalyticsEvent({
        event: parsed.data.event,
        path: parsed.data.path,
        metadata: parsed.data.metadata,
        userId,
      });

      res.status(204).end();
    } catch (error) {
      console.error("Error logging analytics event:", error);
      res.status(500).json({ message: "Failed to log event" });
    }
  });

  // Admin-only diagnostic endpoint to see raw Stripe data. Previously unauthenticated;
  // restricted to admins because it discloses environment (prod/dev), internal Stripe
  // product/price IDs, and metadata, and echoed raw Stripe error messages on failure.
  app.get("/api/stripe/debug", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const stripe = await getCachedStripeClient();
      const products = await stripe.products.list({ active: true, limit: 100 });
      const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
      const isProduction = process.env.NODE_ENV === "production";

      res.json({
        environment: isProduction ? 'PRODUCTION' : 'development',
        products: products.data.map(p => ({
          id: p.id,
          name: p.name,
          metadata: p.metadata
        })),
        prices: prices.data.map(p => ({
          id: p.id,
          product_id: typeof p.product === 'string' ? p.product : p.product.id,
          product_name: typeof p.product === 'object' && !('deleted' in p.product) ? p.product.name : null,
          amount: p.unit_amount,
          interval: p.recurring?.interval,
          price_metadata: p.metadata,
          product_metadata: typeof p.product === 'object' && !('deleted' in p.product) ? p.product.metadata : null
        }))
      });
    } catch (error: any) {
      console.error("Error in stripe debug endpoint:", error);
      res.status(500).json({ message: "Failed to fetch Stripe diagnostic data" });
      console.error("Error in Stripe debug endpoint:", error);
      res.status(500).json({ error: "Failed to fetch Stripe diagnostic data" });
    }
  });

  app.get("/api/stripe/prices", async (req, res) => {
    try {
      const stripe = await getCachedStripeClient();
      const prices = await stripe.prices.list({
        active: true,
        limit: 100,
        expand: ["data.product"],
      });
      const formattedPrices = prices.data
        .filter(p => isSellableExamPrice(p))
        .map(p => {
          VALID_PRICE_IDS.add(p.id);
          const product = typeof p.product === "object" && !('deleted' in p.product) ? p.product : null;
          const interval = p.recurring?.interval;
          const billingPeriod = getMetaField(p.metadata, 'billing_period') || getMetaField(product?.metadata, 'billing_period') ||
            (interval === 'week' ? 'weekly' : interval === 'month' ? 'monthly' : null);
          const subscriptionType = getMetaField(p.metadata, 'subscription_type') || getMetaField(product?.metadata, 'subscription_type') ||
            // Infer subscription type from product name when metadata is entirely absent
            (product?.name ? (product.name.toLowerCase().includes('bundle') ? 'bundle' : 'single') : undefined);
          const allowedCategoriesStr = getMetaField(p.metadata, 'allowed_categories') || getMetaField(product?.metadata, 'allowed_categories');
          const allowedCategories = allowedCategoriesStr?.split(',').map((c: string) => c.trim()) || [];
          // Fallback: infer category from product name when allowed_categories metadata is missing
          if (allowedCategories.length === 0 && subscriptionType === 'single' && product?.name) {
            const pname = product.name.toLowerCase();
            if (pname.includes('real estate') && !pname.includes('bundle')) {
              allowedCategories.push('real_estate');
            } else if (pname.includes('property') && pname.includes('casualty')) {
              allowedCategories.push('property_casualty');
            } else if (pname.includes('life insurance')) {
              allowedCategories.push('life_insurance');
            } else if (pname.includes('general lines')) {
              allowedCategories.push('general_lines');
            }
          }
          return {
            id: p.id,
            unit_amount: p.unit_amount,
            currency: p.currency,
            recurring_interval: interval,
            recurring: p.recurring,
            product_id: typeof p.product === "string" ? p.product : p.product?.id,
            product_name: product?.name || null,
            subscription_type: subscriptionType,
            allowed_categories: allowedCategories,
            billing_period: billingPeriod,
          };
        });
      
      res.json(formattedPrices);
    } catch (error: any) {
      console.error("Error fetching prices:", error);
      res.status(500).json({ message: "Failed to fetch pricing information" });
    }
  });

  app.post("/api/stripe/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid price ID", errors: parsed.error.errors });
      }
      
      const { priceId, category } = parsed.data;

      const stripe = await getCachedStripeClient();

      // Validate the price ID against live Stripe data (not just the in-memory cache,
      // which is only warmed by GET /api/stripe/prices and would otherwise fail open
      // before that endpoint is first hit) so we never create a checkout session for a
      // price we don't recognize as a legitimate exam subscription price.
      if (!(await isValidCheckoutPriceId(stripe, priceId))) {
        return res.status(400).json({ message: "Invalid price ID" });
      }

      const user = await storage.getUser(userId);
      let profile = await storage.getProfile(userId);

      if (!profile) {
        profile = await storage.createProfile({
          userId,
          preferredLanguage: "en",
          role: "user",
        });
      }

      let customerId = profile.stripeCustomerId;

      // Verify the stored customer still exists in THIS Stripe account before
      // using it. A stored id can go stale - the customer was deleted, or it
      // was created against a different account - and Stripe then rejects the
      // whole session with "No such customer", which surfaced as a failed
      // Subscribe with nothing pointing at the cause. Re-creating is safe:
      // the id is only a pointer, and existing subscriptions live on the
      // customer record we are about to replace only if it no longer exists.
      if (customerId) {
        try {
          const existing = await stripe.customers.retrieve(customerId);
          if ((existing as { deleted?: boolean }).deleted) {
            console.warn(`[checkout] stored customer ${customerId} is deleted; recreating`);
            customerId = null;
          }
        } catch (err) {
          console.warn(
            `[checkout] stored customer ${customerId} not found in this account; recreating`,
            (err as { code?: string }).code,
          );
          customerId = null;
        }
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          name: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.updateProfile(userId, { stripeCustomerId: customerId });
      }
      
      const host = req.get("host");
      const protocol = host?.includes("localhost") ? "http" : "https";
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${protocol}://${host}/dashboard?success=true`,
        // Cancelling must not cost the student their exam choice: the pricing
        // page re-selects from this parameter, so Subscribe works again
        // without reconstructing anything.
        cancel_url: category
          ? `${protocol}://${host}/pricing?category=${category}&canceled=true`
          : `${protocol}://${host}/pricing?canceled=true`,
        metadata: { userId },
        subscription_data: {
          metadata: { userId },
        },
      });
      
      res.json({ url: session.url });
    } catch (error) {
      // A bare 500 told the student nothing and told us nothing either. Stripe
      // errors carry a type and code that say exactly what went wrong, so log
      // them and translate the ones the student can act on.
      const stripeError = error as {
        type?: string;
        code?: string;
        param?: string;
        statusCode?: number;
        message?: string;
      };

      console.error("Error creating checkout:", {
        type: stripeError?.type,
        code: stripeError?.code,
        param: stripeError?.param,
        statusCode: stripeError?.statusCode,
        message: stripeError?.message,
        // From the raw body: `parsed` is scoped to the try block, and by the
        // time we are here the id is the single most useful thing to log.
        priceId: typeof req.body?.priceId === "string" ? req.body.priceId : null,
      });

      // Stripe rejecting the request itself is a configuration problem on our
      // side (an archived or otherwise unusable price), not a server fault.
      // Saying so lets the student retry or contact us instead of staring at
      // a 500, and points whoever reads the log at the price.
      if (stripeError?.type === "StripeInvalidRequestError") {
        return res.status(400).json({
          message:
            "This subscription option is temporarily unavailable. Please refresh " +
            "the page and try again, or contact support if it persists.",
        });
      }

      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/portal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (!profile?.stripeCustomerId) {
        return res.status(400).json({ message: "No subscription found" });
      }
      
      const stripe = await getCachedStripeClient();
      const host = req.get("host");
      const protocol = host?.includes("localhost") ? "http" : "https";
      const returnUrl = `${protocol}://${host}/profile`;
      
      console.log("Creating portal session for customer:", profile.stripeCustomerId);
      console.log("Return URL:", returnUrl);
      
      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripeCustomerId,
        return_url: returnUrl,
      });
      
      console.log("Portal session created:", session.url);
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating portal:", error?.message || error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  app.post("/api/stripe/cancel-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (!profile?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No subscription found" });
      }
      
      const stripe = await getCachedStripeClient();
      await stripe.subscriptions.update(profile.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({ success: true, message: "Subscription will be cancelled at the end of the billing period" });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Sync subscription status from Stripe for current user
  app.post("/api/stripe/sync-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (!profile?.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer found" });
      }
      
      const stripe = await getCachedStripeClient();
      
      // Find active subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripeCustomerId,
        status: 'active',
        limit: 1,
      });
      
      if (subscriptions.data.length === 0) {
        // Check for trialing subscriptions
        const trialingSubscriptions = await stripe.subscriptions.list({
          customer: profile.stripeCustomerId,
          status: 'trialing',
          limit: 1,
        });
        
        if (trialingSubscriptions.data.length === 0) {
          return res.json({ message: "No active subscription found", synced: false });
        }
        
        subscriptions.data = trialingSubscriptions.data;
      }
      
      const subscription = subscriptions.data[0];
      const item = subscription.items?.data?.[0];
      
      // Get metadata from product
      let subscriptionType: 'single' | 'bundle' | undefined;
      let allowedCategories: string[] | undefined;
      
      if (item?.price?.product) {
        const productId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product.id;
        
        const product = await stripe.products.retrieve(productId);
        subscriptionType = product.metadata?.subscription_type as 'single' | 'bundle' | undefined;
        const allowedCategoriesStr = product.metadata?.allowed_categories;
        allowedCategories = allowedCategoriesStr 
          ? allowedCategoriesStr.split(',').map(c => c.trim()) 
          : undefined;
      }
      
      // Check price metadata as fallback
      if (!subscriptionType || !allowedCategories) {
        const priceMetadata = item?.price?.metadata;
        if (priceMetadata) {
          if (!subscriptionType) {
            subscriptionType = priceMetadata.subscription_type as 'single' | 'bundle' | undefined;
          }
          if (!allowedCategories) {
            const allowedCategoriesStr = priceMetadata.allowed_categories;
            allowedCategories = allowedCategoriesStr 
              ? allowedCategoriesStr.split(',').map(c => c.trim()) 
              : undefined;
          }
        }
      }
      
      const interval = item?.price?.recurring?.interval;
      const plan = interval === 'week' ? 'weekly' : interval === 'month' ? 'monthly' : undefined;
      
      const periodEnd = (subscription as any).current_period_end;
      const endDate = periodEnd ? new Date(periodEnd * 1000) : undefined;
      
      await storage.updateProfile(userId, {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status === 'active' ? 'active' : 
                           subscription.status === 'trialing' ? 'trialing' : 'canceled',
        subscriptionPlan: plan,
        subscriptionType: subscriptionType,
        allowedCategories: allowedCategories,
        subscriptionEndDate: endDate,
      });
      
      console.log(`Synced subscription for user ${userId}: type=${subscriptionType}, categories=${allowedCategories?.join(',')}`);

      // Credit the partner who introduced this student, if one did.
      //
      // Deliberately here and nowhere else in the request path. This is the
      // point where the server has asked Stripe and been told the subscription
      // is live - the same fact the Google Ads conversion has hung off since
      // #160 - so "a partner sale" and "a reported conversion" mean the same
      // thing. Attributing at checkout, or on the success URL, would count
      // sales that never completed.
      //
      // Nothing in the request decides the partner: recordPartnerConversion
      // reads it from the student's profile, where it was written when they
      // first arrived. So a crafted checkout cannot credit anyone.
      //
      // Duplicates collapse on the unique subscription id, which is why a
      // reload, a second tab and a repeated sync add up to one sale.
      //
      // A failure here must not fail the sync. Access is what the student paid
      // for; internal reporting is not worth a 500 in front of someone who has
      // just handed over money.
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        try {
          await recordPartnerConversion({
            userId,
            stripeSubscriptionId: subscription.id,
            examCategory: (allowedCategories?.[0] as ExamCategory | undefined) ?? null,
            billingPeriod: plan ?? null,
            status: subscription.status,
          });
        } catch (partnerError) {
          console.error("Partner conversion record failed:", partnerError);
        }
      }
      
      res.json({
        synced: true,
        // The client uses this to report a subscription to Google Ads exactly
        // once. It stays in the browser as a deduplication key and is never
        // sent on to Google. It is the caller's own subscription, and this
        // route is behind isAuthenticated.
        subscriptionId: subscription.id,
        subscriptionType,
        allowedCategories,
        plan,
        status: subscription.status
      });
    } catch (error) {
      console.error("Error syncing subscription:", error);
      res.status(500).json({ message: "Failed to sync subscription" });
    }
  });

  app.post("/api/admin/init-stripe-prices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      console.log("[Admin] Manually triggering Stripe price initialization...");
      await initializeStripePrices();
      
      res.json({ success: true, message: "Stripe prices initialized" });
    } catch (error) {
      console.error("Error initializing Stripe prices:", error);
      res.status(500).json({ message: "Failed to initialize Stripe prices" });
    }
  });
  
  // Diagnostic endpoint to see what products/prices exist in Stripe
  app.get("/api/admin/stripe-diagnostic", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const stripe = await getCachedStripeClient();
      const products = await stripe.products.list({ active: true, limit: 100 });
      const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
      
      const isProduction = process.env.NODE_ENV === "production";
      
      const productInfo = products.data.map(p => ({
        id: p.id,
        name: p.name,
        metadata: p.metadata
      }));
      
      const priceInfo = prices.data.map(p => {
        const product = typeof p.product === 'object' && !('deleted' in p.product) ? p.product : null;
        return {
          id: p.id,
          product_id: typeof p.product === 'string' ? p.product : p.product.id,
          product_name: product?.name || 'unknown',
          amount: p.unit_amount,
          interval: p.recurring?.interval,
          metadata: p.metadata
        };
      });
      
      // Determine what's missing. Derived from the same REQUIRED_PRICES used to
      // actually create prices in Stripe (initializeStripePrices.ts) - this used
      // to be a separately hardcoded, stale list that still included weekly
      // prices ($6.99/week per category, $12.99/week bundle) that are no longer
      // offered in Stripe or on the site, so it always reported them "missing".
      const requiredPrices = REQUIRED_PRICES.map(config => ({
        product: config.productName,
        category: config.category,
        prices: config.prices.map(p => ({ amount: p.amount, interval: p.interval })),
      }));
      
      const missing: string[] = [];
      for (const req of requiredPrices) {
        const matchingProduct = products.data.find(p => 
          p.metadata?.allowed_categories === req.category ||
          (req.category === 'bundle' && (p.metadata?.subscription_type === 'bundle' || p.metadata?.allowed_categories?.includes(',')))
        );
        
        if (!matchingProduct) {
          missing.push(`Product: ${req.product}`);
        } else {
          for (const priceReq of req.prices) {
            const matchingPrice = prices.data.find(pr => {
              const prodId = typeof pr.product === 'string' ? pr.product : pr.product.id;
              return prodId === matchingProduct.id && 
                     pr.recurring?.interval === priceReq.interval &&
                     pr.unit_amount === priceReq.amount;
            });
            if (!matchingPrice) {
              missing.push(`Price: ${req.product} - $${priceReq.amount / 100}/${priceReq.interval}`);
            }
          }
        }
      }
      
      res.json({
        environment: isProduction ? 'PRODUCTION' : 'development',
        products: productInfo,
        prices: priceInfo,
        missing,
        summary: {
          totalProducts: products.data.length,
          totalPrices: prices.data.length,
          missingCount: missing.length
        }
      });
    } catch (error: any) {
      console.error("Error in stripe diagnostic:", error);
      res.status(500).json({ message: "Failed to get Stripe diagnostic", error: error.message });
    }
  });
  
  // Force create missing Stripe products and prices
  app.post("/api/admin/stripe-force-create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const stripe = await getCachedStripeClient();
      const isProduction = process.env.NODE_ENV === "production";
      
      const results: string[] = [];
      
      // Same REQUIRED_PRICES source used by initializeStripePrices.ts - see the
      // comment in the diagnostic endpoint above for why this is no longer a
      // separately hardcoded (and stale) list.
      const REQUIRED = REQUIRED_PRICES.map(config => ({
        name: config.productName,
        category: config.category,
        isBundle: !!config.isBundle,
        prices: config.prices.map(p => ({ amount: p.amount, interval: p.interval, billingPeriod: p.billingPeriod })),
      }));
      
      // Get existing products/prices
      const existingProducts = await stripe.products.list({ active: true, limit: 100 });
      const existingPrices = await stripe.prices.list({ active: true, limit: 100 });
      
      // Build lookup for existing prices
      const priceKeys = new Set<string>();
      for (const p of existingPrices.data) {
        const prodId = typeof p.product === 'string' ? p.product : p.product;
        priceKeys.add(`${prodId}-${p.recurring?.interval}-${p.unit_amount}`);
      }
      
      for (const config of REQUIRED) {
        // Find or create product
        let product = existingProducts.data.find(p => 
          p.metadata?.allowed_categories === config.category ||
          (config.isBundle && (p.metadata?.subscription_type === 'bundle' || p.metadata?.allowed_categories?.includes(',')))
        );
        
        if (!product) {
          try {
            product = await stripe.products.create({
              name: config.name,
              metadata: {
                subscription_type: config.isBundle ? 'bundle' : 'single',
                allowed_categories: config.isBundle ? 'real_estate,property_casualty,life_insurance,general_lines' : config.category
              }
            });
            results.push(`Created product: ${config.name} (${product.id})`);
          } catch (err: any) {
            results.push(`ERROR creating product ${config.name}: ${err.message}`);
            continue;
          }
        } else {
          results.push(`Product exists: ${config.name} (${product.id})`);
        }
        
        // Create missing prices
        for (const priceConfig of config.prices) {
          const key = `${product.id}-${priceConfig.interval}-${priceConfig.amount}`;
          if (!priceKeys.has(key)) {
            try {
              const price = await stripe.prices.create({
                product: product.id,
                unit_amount: priceConfig.amount,
                currency: 'usd',
                recurring: { interval: priceConfig.interval },
                metadata: {
                  subscription_type: config.isBundle ? 'bundle' : 'single',
                  allowed_categories: config.isBundle ? 'real_estate,property_casualty,life_insurance,general_lines' : config.category,
                  billing_period: priceConfig.billingPeriod
                }
              });
              results.push(`Created price: ${config.name} $${priceConfig.amount / 100}/${priceConfig.interval} (${price.id})`);
            } catch (err: any) {
              results.push(`ERROR creating price for ${config.name}: ${err.message}`);
            }
          } else {
            results.push(`Price exists: ${config.name} $${priceConfig.amount / 100}/${priceConfig.interval}`);
          }
        }
      }
      
      res.json({
        environment: isProduction ? 'PRODUCTION' : 'development',
        results
      });
    } catch (error: any) {
      console.error("Error force creating Stripe prices:", error);
      res.status(500).json({ message: "Failed to create prices", error: error.message });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const analytics = await storage.getAdminAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const users = await storage.getAllUsers();
      const formatted = users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.profile?.role || "user",
        subscriptionStatus: u.profile?.subscriptionStatus,
        subscriptionPlan: u.profile?.subscriptionPlan,
        subscriptionType: u.profile?.subscriptionType,
        allowedCategories: u.profile?.allowedCategories,
        stripeCustomerId: u.profile?.stripeCustomerId,
        stripeSubscriptionId: u.profile?.stripeSubscriptionId,
        createdAt: u.createdAt,
        examCount: u.examCount,
        lastExamAt: u.lastExamAt,
      }));

      res.json(formatted);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Sync a specific user's subscription from Stripe
  app.post("/api/admin/sync-user-subscription/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminProfile = await storage.getProfile(adminUserId);

      if (adminProfile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let profile = await storage.getProfile(userId);

      if (!profile) {
        profile = await storage.createProfile({
          userId,
          preferredLanguage: "en",
          role: "user",
        });
      }

      const stripe = await getCachedStripeClient();

      // If user has a stripeCustomerId, search by that
      // Otherwise, search by email
      let customerId = profile.stripeCustomerId;

      if (!customerId && user.email) {
        // Search for customer by email
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          // Update profile with found customer ID
          await storage.updateProfile(userId, { stripeCustomerId: customerId });
        }
      }

      if (!customerId) {
        return res.json({
          synced: false,
          message: "No Stripe customer found for this user"
        });
      }

      // Find active or trialing subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 10,
      });

      // Find an active or trialing subscription
      const activeSubscription = subscriptions.data.find(
        s => s.status === 'active' || s.status === 'trialing'
      );

      if (!activeSubscription) {
        // No active subscription - update profile to reflect this
        await storage.updateProfile(userId, {
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: undefined,
          allowedCategories: undefined,
        });

        return res.json({
          synced: true,
          message: "No active subscription found - status updated to canceled",
          status: 'canceled'
        });
      }

      // Get metadata from subscription
      const item = activeSubscription.items?.data?.[0];
      let subscriptionType: 'single' | 'bundle' | undefined;
      let allowedCategories: string[] | undefined;

      if (item?.price?.product) {
        const productId = typeof item.price.product === 'string'
          ? item.price.product
          : item.price.product.id;

        const product = await stripe.products.retrieve(productId);
        subscriptionType = product.metadata?.subscription_type as 'single' | 'bundle' | undefined;
        const allowedCategoriesStr = product.metadata?.allowed_categories;
        allowedCategories = allowedCategoriesStr
          ? allowedCategoriesStr.split(',').map(c => c.trim())
          : undefined;
      }

      // Check price metadata as fallback
      if (!subscriptionType || !allowedCategories) {
        const priceMetadata = item?.price?.metadata;
        if (priceMetadata) {
          if (!subscriptionType) {
            subscriptionType = priceMetadata.subscription_type as 'single' | 'bundle' | undefined;
          }
          if (!allowedCategories) {
            const allowedCategoriesStr = priceMetadata.allowed_categories;
            allowedCategories = allowedCategoriesStr
              ? allowedCategoriesStr.split(',').map(c => c.trim())
              : undefined;
          }
        }
      }

      const interval = item?.price?.recurring?.interval;
      const plan = interval === 'week' ? 'weekly' : interval === 'month' ? 'monthly' : undefined;

      const periodEnd = (activeSubscription as any).current_period_end;
      const endDate = periodEnd ? new Date(periodEnd * 1000) : undefined;

      await storage.updateProfile(userId, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: activeSubscription.id,
        subscriptionStatus: activeSubscription.status === 'active' ? 'active' :
                           activeSubscription.status === 'trialing' ? 'trialing' : 'canceled',
        subscriptionPlan: plan,
        subscriptionType: subscriptionType,
        allowedCategories: allowedCategories,
        subscriptionEndDate: endDate,
      });

      console.log(`[Admin] Synced subscription for user ${userId}: type=${subscriptionType}, categories=${allowedCategories?.join(',')}, status=${activeSubscription.status}`);

      res.json({
        synced: true,
        message: "Subscription synced successfully",
        status: activeSubscription.status,
        subscriptionType,
        allowedCategories,
        plan,
        subscriptionEndDate: endDate,
      });
    } catch (error: any) {
      console.error("Error syncing user subscription:", error);
      res.status(500).json({ message: "Failed to sync subscription", error: error.message });
    }
  });

  // Promote or demote a user's admin role.
  app.patch("/api/admin/users/:userId/role", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminProfile = await storage.getProfile(adminUserId);

      if (adminProfile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;
      const roleSchema = z.object({ role: z.enum(["user", "admin"]) });
      const validated = roleSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ message: "Invalid role", errors: validated.error.errors });
      }

      if (userId === adminUserId && validated.data.role === "user") {
        return res.status(400).json({ message: "You cannot remove your own admin access" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let profile = await storage.getProfile(userId);
      if (!profile) {
        profile = await storage.createProfile({ userId, preferredLanguage: "en", role: "user" });
      }

      const updated = await storage.updateProfile(userId, { role: validated.data.role });

      res.json({ message: `${user.email} is now ${validated.data.role === "admin" ? "an admin" : "a regular user"}`, role: updated?.role });
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update role", error: error.message });
    }
  });

  // Manually grant a user access without a real Stripe subscription - for
  // comp access, customer-service goodwill, promotions, etc. Deliberately
  // never sets stripeSubscriptionId, so the daily subscription reconciliation
  // job (subscriptionReconciliation.ts) knows to leave this grant alone.
  app.post("/api/admin/users/:userId/comp-access", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminProfile = await storage.getProfile(adminUserId);

      if (adminProfile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;
      const compAccessSchema = z.object({
        categories: z.array(z.enum(examCategoryEnum.enumValues)).min(1),
        expiresInDays: z.number().int().positive().optional(),
      });
      const validated = compAccessSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ message: "Invalid request", errors: validated.error.errors });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let profile = await storage.getProfile(userId);
      if (!profile) {
        profile = await storage.createProfile({ userId, preferredLanguage: "en", role: "user" });
      }

      const { categories, expiresInDays } = validated.data;
      const subscriptionType = categories.length >= 4 ? "bundle" : "single";
      const subscriptionEndDate = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      await storage.updateProfile(userId, {
        subscriptionStatus: "active",
        subscriptionType,
        allowedCategories: categories,
        subscriptionEndDate,
      });

      console.log(`[Admin] ${adminUserId} granted comp access to ${userId}: categories=${categories.join(",")}, expires=${subscriptionEndDate?.toISOString() || "never"}`);

      res.json({
        message: `Granted access to ${user.email}`,
        categories,
        subscriptionEndDate,
      });
    } catch (error: any) {
      console.error("Error granting comp access:", error);
      res.status(500).json({ message: "Failed to grant access", error: error.message });
    }
  });

  // Manually revoke a user's access (comp grant or otherwise) without
  // touching their Stripe subscription. Distinct from sync-user-subscription,
  // which pulls real data from Stripe - this is an admin override.
  app.post("/api/admin/users/:userId/revoke-access", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminProfile = await storage.getProfile(adminUserId);

      if (adminProfile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateProfile(userId, {
        subscriptionStatus: "canceled",
        allowedCategories: undefined,
      });

      console.log(`[Admin] ${adminUserId} revoked access for ${userId}`);

      res.json({ message: `Revoked access for ${user.email}` });
    } catch (error: any) {
      console.error("Error revoking access:", error);
      res.status(500).json({ message: "Failed to revoke access", error: error.message });
    }
  });

  // Permanently delete a user's account and app-activity data. Payment and
  // subscription records are retained (see storage.deleteUserAccount for why).
  app.delete("/api/admin/users/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminProfile = await storage.getProfile(adminUserId);

      if (adminProfile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;
      if (userId === adminUserId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const deleted = await storage.deleteUserAccount(userId);

      console.log(`[Admin] ${adminUserId} deleted account ${userId} (${user.email}):`, deleted);

      res.json({
        message: `Deleted account for ${user.email}`,
        deleted,
      });
    } catch (error: any) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ message: "Failed to delete account", error: error.message });
    }
  });

  // Clear a user's exam history (sessions, results, study progress, certificates).
  // For cases like a customer's practice results being invalidated by a data
  // issue (e.g. the exam-answer-position bug) and needing a clean slate.
  app.delete("/api/admin/users/:userId/exam-history", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminProfile = await storage.getProfile(adminUserId);

      if (adminProfile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const deleted = await storage.clearUserExamHistory(userId);

      res.json({
        message: `Cleared exam history for ${user.email}`,
        deleted,
      });
    } catch (error: any) {
      console.error("Error clearing user exam history:", error);
      res.status(500).json({ message: "Failed to clear exam history", error: error.message });
    }
  });

  app.get("/api/admin/questions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const categoryParam = req.query.category as string | undefined;
      const category = categoryParam && categoryParam !== "all" ? categoryParam as ExamCategory : undefined;
      const questions = await storage.getQuestions(category);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  /**
   * Quality audit of the live question bank.
   *
   * The validation pipeline only ever ran on generated candidates, so the
   * hand-written bank students actually sit has never been checked against
   * the same standard. This runs those checks over what is really stored.
   *
   * Read-only: it reports, it never edits or deactivates a question. What to
   * do about a finding is a judgement call, and a bad one would delete
   * material a paying student is studying from.
   */
  app.get("/api/admin/content-audit", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await requireAdmin(req, res))) return;

      const categoryParam = req.query.category as string | undefined;
      const category =
        categoryParam && categoryParam !== "all" ? (categoryParam as ExamCategory) : undefined;
      if (category && !examCategoryEnum.enumValues.includes(category)) {
        return res.status(400).json({ message: "Unknown exam category" });
      }

      const bank = await storage.getQuestions(category);
      const auditable = bank.map((q) => ({
        id: q.id,
        category: q.category,
        topic: q.topic,
        questionTextEn: q.questionTextEn,
        questionTextEs: q.questionTextEs,
        optionsEn: q.optionsEn,
        optionsEs: q.optionsEs,
        correctAnswer: q.correctAnswer,
        explanationEn: q.explanationEn,
        explanationEs: q.explanationEs,
      }));

      const report = auditBank(auditable);
      res.json({
        ...report,
        // Capped: the summary counts are the point, and a bank with
        // thousands of warnings would otherwise return a response no one can
        // read and the browser struggles to render.
        findings: report.findings.slice(0, MAX_AUDIT_FINDINGS),
        findingsTruncated: report.findings.length > MAX_AUDIT_FINDINGS,
        thinTopics: findThinTopics(auditable),
      });
    } catch (error) {
      console.error("Error auditing content:", error);
      res.status(500).json({ message: "Failed to audit content" });
    }
  });

  // One-time maintenance action: randomize each question's answer position.
  // Question content was originally authored/imported with the correct answer
  // heavily concentrated in one option position per category (e.g. almost
  // always option A for real estate) rather than randomized.
  app.post("/api/admin/questions/shuffle-answers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const categoryParam = req.query.category as string | undefined;
      const category = categoryParam && categoryParam !== "all" ? categoryParam as ExamCategory : undefined;
      const questions = await storage.getQuestions(category);

      let updated = 0;
      for (const question of questions) {
        const shuffled = shuffleQuestionOptions(
          question.optionsEn,
          question.optionsEs,
          question.correctAnswer,
        );
        await storage.updateQuestion(question.id, {
          optionsEn: shuffled.optionsEn,
          optionsEs: shuffled.optionsEs,
          correctAnswer: shuffled.correctAnswer,
        });
        updated++;
      }

      res.json({ message: `Shuffled answer positions for ${updated} questions`, updated });
    } catch (error) {
      console.error("Error shuffling question answers:", error);
      res.status(500).json({ message: "Failed to shuffle question answers" });
    }
  });

  app.post("/api/admin/questions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validated = insertQuestionSchema.parse(req.body);

      if (validated.optionsEn.length !== validated.optionsEs.length) {
        return res.status(400).json({ message: "English and Spanish options must have the same number of choices" });
      }
      if (validated.correctAnswer < 0 || validated.correctAnswer >= validated.optionsEn.length) {
        return res.status(400).json({ message: "Correct answer must reference a valid option index" });
      }

      const sanitizedData = {
        ...validated,
        questionTextEn: sanitizeHtml(validated.questionTextEn as string) || validated.questionTextEn,
        questionTextEs: sanitizeHtml(validated.questionTextEs as string) || validated.questionTextEs,
        optionsEn: (validated.optionsEn as string[]).map(opt => sanitizeHtml(opt) || opt),
        optionsEs: (validated.optionsEs as string[]).map(opt => sanitizeHtml(opt) || opt),
        explanationEn: validated.explanationEn ? sanitizeHtml(validated.explanationEn as string) : null,
        explanationEs: validated.explanationEs ? sanitizeHtml(validated.explanationEs as string) : null,
      };
      const question = await storage.createQuestion(sanitizedData as any);
      res.json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.patch("/api/admin/questions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      
      const updateSchema = insertQuestionSchema.partial();
      const validated = updateSchema.parse(req.body);

      if (validated.optionsEn && validated.optionsEs && validated.optionsEn.length !== validated.optionsEs.length) {
        return res.status(400).json({ message: "English and Spanish options must have the same number of choices" });
      }
      if (validated.optionsEn && validated.correctAnswer !== undefined &&
        (validated.correctAnswer < 0 || validated.correctAnswer >= validated.optionsEn.length)) {
        return res.status(400).json({ message: "Correct answer must reference a valid option index" });
      }

      const sanitizedData: any = { ...validated };
      if (validated.questionTextEn) sanitizedData.questionTextEn = sanitizeHtml(validated.questionTextEn as string) || validated.questionTextEn;
      if (validated.questionTextEs) sanitizedData.questionTextEs = sanitizeHtml(validated.questionTextEs as string) || validated.questionTextEs;
      if (validated.optionsEn) sanitizedData.optionsEn = (validated.optionsEn as string[]).map(opt => sanitizeHtml(opt) || opt);
      if (validated.optionsEs) sanitizedData.optionsEs = (validated.optionsEs as string[]).map(opt => sanitizeHtml(opt) || opt);
      if (validated.explanationEn) sanitizedData.explanationEn = sanitizeHtml(validated.explanationEn as string);
      if (validated.explanationEs) sanitizedData.explanationEs = sanitizeHtml(validated.explanationEs as string);
      
      const question = await storage.updateQuestion(id, sanitizedData);
      res.json(question);
    } catch (error) {
      console.error("Error updating question:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete("/api/admin/questions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      await storage.deleteQuestion(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  app.post("/api/question-feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertQuestionFeedbackSchema.safeParse({ ...req.body, userId });
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      
      const sanitizedData = {
        ...parsed.data,
        message: sanitizeHtml(parsed.data.message) || parsed.data.message,
      };
      
      const feedback = await storage.createQuestionFeedback(sanitizedData);

      // Reassess the question's risk now that a new report has landed. A
      // question whose answer key is wrong teaches something false to every
      // student who sees it, and it kept doing so until an admin happened to
      // look. Crossing the threshold pulls it from circulation pending review.
      //
      // Wrapped so a failure here can never fail the student's report - losing
      // the quarantine is recoverable, losing the report is not.
      try {
        const reports = await storage.getQuestionFeedback(sanitizedData.questionId);
        const assessment = assessRisk(
          reports.map((r) => ({
            feedbackType: r.feedbackType as FeedbackType,
            status: r.status as "pending" | "reviewed" | "resolved" | "dismissed",
            createdAt: new Date(r.createdAt),
          })),
          new Date(),
        );

        if (assessment.shouldQuarantine) {
          const question = await storage.getQuestion(sanitizedData.questionId);
          if (question?.isActive) {
            await storage.updateQuestion(sanitizedData.questionId, { isActive: false });
            console.warn(
              `[content-risk] question ${sanitizedData.questionId} pulled from circulation. ` +
              quarantineReason(assessment),
            );
          }
        }
      } catch (riskError) {
        console.error("Error assessing content risk:", riskError);
      }

      res.json({ success: true, feedback });
    } catch (error) {
      console.error("Error creating question feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get("/api/admin/question-feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const feedback = await storage.getAllQuestionFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching question feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.patch("/api/admin/question-feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      const updateSchema = z.object({
        status: z.enum(feedbackStatusEnum.enumValues).optional(),
        adminNotes: z.string().optional(),
      });
      
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      
      const updated = await storage.updateQuestionFeedback(id, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating question feedback:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  app.post("/api/callback-requests", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const rateLimitResult = rateLimit(`callback-requests:${clientIp}`, 5, 15 * 60 * 1000);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          message: "Too many submissions. Please try again later.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
        });
      }

      const parsed = insertCallbackRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }

      const sanitizedData = {
        ...parsed.data,
        firstName: sanitizeHtml(parsed.data.firstName) ?? parsed.data.firstName,
        lastName: sanitizeHtml(parsed.data.lastName) ?? parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        preferredDay: sanitizeHtml(parsed.data.preferredDay) ?? parsed.data.preferredDay,
        preferredTime: sanitizeHtml(parsed.data.preferredTime) ?? parsed.data.preferredTime,
      };
      
      const [request] = await db.insert(callbackRequests).values(sanitizedData).returning();
      res.json({ success: true, id: request.id });
    } catch (error) {
      console.error("Error creating callback request:", error);
      res.status(500).json({ message: "Failed to submit callback request" });
    }
  });

  app.get("/api/admin/callback-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const requests = await db.select().from(callbackRequests).orderBy(sql`created_at DESC`);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching callback requests:", error);
      res.status(500).json({ message: "Failed to fetch callback requests" });
    }
  });

  // Public: Request password reset (forgot password)
  app.post("/api/forgot-password", async (req, res) => {
    try {
      // Rate limit by IP: 5 requests per 15 minutes
      const clientIp = getClientIp(req);
      const rateLimitResult = rateLimit(`forgot-password:${clientIp}`, 5, 15 * 60 * 1000);
      
      if (!rateLimitResult.allowed) {
        return res.status(429).json({ 
          message: "Too many password reset requests. Please try again later.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
        });
      }
      
      const schema = z.object({
        email: z.string().email("Invalid email"),
      });
      
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      
      // Emails are stored lowercased (see /api/register); normalize here too
      // so a reset request with a different-case variant of the stored
      // address still finds the account instead of silently no-op'ing.
      const email = parsed.data.email.toLowerCase().trim();

      // Additional rate limit by email: 3 requests per hour
      const emailRateLimit = rateLimit(`forgot-password:email:${email}`, 3, 60 * 60 * 1000);
      if (!emailRateLimit.allowed) {
        // Still return success to prevent email enumeration
        return res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
      }

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      if (!user) {
        return res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
      }
      
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.setPasswordResetToken(user.id, hashedToken, resetExpiry);
      
      const sent = await sendPasswordResetEmail(user.email!, rawToken, user.firstName || undefined, false);
      
      if (!sent) {
        console.error("Failed to send password reset email to:", email);
      }
      
      res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Admin: Send password reset email
  app.post("/api/admin/send-password-reset/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const profile = await storage.getProfile(adminUserId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(404).json({ message: "User not found or has no email" });
      }
      
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
      
      await storage.setPasswordResetToken(userId, hashedToken, resetExpiry);
      
      const sent = await sendPasswordResetEmail(user.email, rawToken, user.firstName || undefined, true);

      if (!sent) {
        // Token is already saved — reset will work if user gets the link.
        // Return 503 so the admin knows email delivery failed.
        const host = process.env.APP_DOMAIN || 'easy-pass-ht1x.onrender.com';
        const resetLink = `https://${host}/reset-password?token=${rawToken}`;
        return res.status(503).json({
          message: "Email service unavailable. Reset token was created but the email could not be sent. Set RESEND_API_KEY to enable email delivery.",
          resetLink,
        });
      }

      res.json({ success: true, message: "Password reset email sent" });
    } catch (error) {
      console.error("Error sending password reset:", error);
      res.status(500).json({ message: "Failed to send password reset" });
    }
  });
  
  // Public: Reset password with token
  app.post("/api/reset-password", async (req, res) => {
    try {
      // Rate limit: 10 attempts per 15 minutes per IP
      const clientIp = getClientIp(req);
      const rateLimitResult = rateLimit(`reset-password:${clientIp}`, 10, 15 * 60 * 1000);
      
      if (!rateLimitResult.allowed) {
        return res.status(429).json({ 
          message: "Too many reset attempts. Please try again later.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
        });
      }
      
      const schema = z.object({
        token: z.string().min(1),
        password: z.string().min(8, "Password must be at least 8 characters"),
      });
      
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      
      const { token, password } = parsed.data;
      
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const user = await storage.getUserByResetToken(hashedToken);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        await storage.clearResetToken(user.id);
        return res.status(400).json({ message: "Reset token has expired" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearResetToken(user.id);
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  
  // Public: Verify reset token is valid
  app.get("/api/reset-password/verify", async (req, res) => {
    try {
      // Rate limit: 20 attempts per 15 minutes per IP (more lenient for verification)
      const clientIp = getClientIp(req);
      const rateLimitResult = rateLimit(`reset-verify:${clientIp}`, 20, 15 * 60 * 1000);
      
      if (!rateLimitResult.allowed) {
        return res.status(429).json({ 
          valid: false, 
          message: "Too many verification attempts. Please try again later."
        });
      }
      
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ valid: false, message: "No token provided" });
      }
      
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const user = await storage.getUserByResetToken(hashedToken);
      
      if (!user) {
        return res.status(400).json({ valid: false, message: "Invalid reset token" });
      }
      
      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ valid: false, message: "Reset token has expired" });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ valid: false, message: "Failed to verify token" });
    }
  });

  // Study Guide Routes
  app.get("/api/study-guide/topics", async (req, res) => {
    try {
      res.json(studyTopicsConfig);
    } catch (error) {
      console.error("Error fetching study topics:", error);
      res.status(500).json({ message: "Failed to fetch study topics" });
    }
  });

  app.get("/api/study-guide/topics/:category", async (req, res) => {
    try {
      const { category } = req.params;
      if (!examCategoryEnum.enumValues.includes(category as ExamCategory)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      const topics = getTopicsByCategory(category as ExamCategory);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching category topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  app.get("/api/study-guide/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const category = req.query.category as ExamCategory | undefined;
      
      if (category && !examCategoryEnum.enumValues.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      
      const progress = await storage.getStudyProgress(userId, category);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching study progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.get("/api/study-guide/quiz/:topicId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topicId } = req.params;
      // Study guide: 150 random questions
      const questionLimit = 150;
      
      const topicInfo = getTopicById(topicId);
      if (!topicInfo) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      const subscriptionCheck = await ensureSubscriptionActive(userId, topicInfo.category.category);
      if (!subscriptionCheck.active) {
        return res.status(403).json({ message: subscriptionCheck.message });
      }
      
      // Get 150 random questions for this category
      const questions = await storage.getQuestions(topicInfo.category.category, questionLimit);

      // Map database field names to frontend expected names
      const questionsForClient = questions.map(({ correctAnswer, questionTextEn, questionTextEs, ...rest }) => ({
        ...rest,
        questionEn: questionTextEn,
        questionEs: questionTextEs,
      }));

      res.json({
        topic: topicInfo.topic,
        category: topicInfo.category,
        questions: questionsForClient,
      });
    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  const submitQuizAnswerSchema = z.object({
    questionId: z.string(),
    selectedAnswer: z.number().min(0).max(3),
    topicId: z.string(),
  });

  app.post("/api/study-guide/answer", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = submitQuizAnswerSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      
      const { questionId, selectedAnswer, topicId } = parsed.data;
      
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const topicInfo = getTopicById(topicId);
      if (!topicInfo) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      const isCorrect = question.correctAnswer === selectedAnswer;
      
      await storage.upsertStudyProgress(userId, topicInfo.category.category, topicId, isCorrect);
      
      res.json({
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        explanationEn: question.explanationEn,
        explanationEs: question.explanationEs,
      });
    } catch (error) {
      console.error("Error submitting quiz answer:", error);
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  return httpServer;
}
