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
import { shuffleQuestionOptions } from "./shuffleQuestionOptions";

const startExamSchema = z.object({
  category: z.enum(examCategoryEnum.enumValues),
  mode: z.enum(["practice", "full"]).default("practice"),
});

const submitExamSchema = z.object({
  answers: z.record(z.string(), z.number()),
});

const checkoutSchema = z.object({
  priceId: z.string().min(1),
});

const profileUpdateSchema = z.object({
  phone: z.string().max(20).optional(),
  preferredLanguage: z.enum(["en", "es"]).optional(),
  // null is meaningful: it clears a previously set exam date back to
  // "not scheduled yet", which is a supported answer rather than a gap.
  examDate: z.string().datetime().nullable().optional(),
  hasPreviousAttempt: z.boolean().nullable().optional(),
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
  if (VALID_PRICE_IDS.has(priceId)) {
    return true;
  }
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    if (isSellableExamPrice(price)) {
      VALID_PRICE_IDS.add(price.id);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error validating price ID:", error);
    return false;
  }
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
      let correctAnswers = 0;
      for (const questionId of attempt.questionIds as string[]) {
        if (parsed.data.answers[questionId] === answerOrder[questionId]) {
          correctAnswers++;
        }
      }
      const score = Math.round((correctAnswers / attempt.totalQuestions) * 100);

      const updated = await storage.completeDiagnosticAttempt(attemptId, { score, correctAnswers });

      res.json({
        score,
        correctAnswers,
        totalQuestions: attempt.totalQuestions,
        category: attempt.category,
        completedAt: updated?.completedAt,
      });
    } catch (error) {
      console.error("Error submitting diagnostic assessment:", error);
      res.status(500).json({ message: "Failed to submit assessment" });
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
      let profile = await storage.getProfile(userId);
      
      if (!profile) {
        profile = await storage.createProfile({
          userId,
          preferredLanguage: "en",
          role: "user",
        });
      }
      
      res.json(profile);
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

      const { phone, preferredLanguage, examDate, hasPreviousAttempt } = parsed.data;
      const sanitizedPhone = phone ? sanitizeHtml(phone) ?? phone : undefined;

      const updated = await storage.updateProfile(userId, {
        phone: sanitizedPhone,
        preferredLanguage,
        // undefined leaves the field alone; null clears it.
        ...(examDate !== undefined ? { examDate: examDate ? new Date(examDate) : null } : {}),
        ...(hasPreviousAttempt !== undefined ? { hasPreviousAttempt } : {}),
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
      
      // Practice: 50 random questions, 90 min | Full Mock: 150 random questions, 120 min
      const questionLimit = mode === "full" ? 150 : 50;
      const timeLimit = mode === "full" ? 7200 : 5400; // 120 min or 90 min in seconds
      
      console.log(`[Exam Start] Category: ${category}, Mode: ${mode}, Limit: ${questionLimit}, Time: ${timeLimit}s`);
      const questions = await storage.getQuestions(category, questionLimit);
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
            source: "exam" as const,
            sessionId,
          })),
        );
      } catch (error) {
        console.error("Error recording question responses:", error);
      }

      const topicBreakdown = calculateTopicBreakdown(topicStats);

      res.json({ result, topicBreakdown });
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
        .filter((r) => r.category === examCategory)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .map((r) => r.score);

      const readiness = calculateEasyPassScore({
        responses: responses.map((r) => ({
          questionId: r.questionId,
          topic: r.topic,
          isCorrect: r.isCorrect,
          answeredAt: new Date(r.answeredAt),
        })),
        mockExamScores,
        questionBankSize,
        now: new Date(),
      });

      res.json(readiness);
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
      
      const { priceId } = parsed.data;

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
        cancel_url: `${protocol}://${host}/pricing?canceled=true`,
        metadata: { userId },
        subscription_data: {
          metadata: { userId },
        },
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout:", error);
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
      
      res.json({ 
        synced: true, 
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
