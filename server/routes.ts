import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./simpleAuth";
import { getCachedStripeClient } from "./stripeClient";
import { insertQuestionSchema, insertCallbackRequestSchema, insertQuestionFeedbackSchema, insertGuestArticleSchema, callbackRequests, questionFeedback, type ExamCategory, examCategoryEnum, feedbackStatusEnum, guestArticleStatusEnum } from "@shared/schema";
import { studyTopicsConfig, getTopicById, getTopicsByCategory } from "@shared/studyTopics";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";

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

const VALID_PRICE_IDS = new Set<string>();

async function ensureSubscriptionActive(userId: string): Promise<{ active: boolean; message?: string }> {
  const profile = await storage.getProfile(userId);
  
  if (!profile) {
    return { active: false, message: "Profile not found" };
  }
  
  if (profile.role === "admin") {
    return { active: true };
  }
  
  const validStatuses = ["active", "trialing"];
  if (!validStatuses.includes(profile.subscriptionStatus || "")) {
    return { active: false, message: "Active subscription required to take exams. Please subscribe to continue." };
  }
  
  if (profile.subscriptionEndDate && new Date(profile.subscriptionEndDate) < new Date()) {
    return { active: false, message: "Subscription has expired. Please renew to continue." };
  }
  
  return { active: true };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
      const { phone, preferredLanguage } = req.body;
      
      const updated = await storage.updateProfile(userId, {
        phone,
        preferredLanguage,
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
      
      const subscriptionCheck = await ensureSubscriptionActive(userId);
      if (!subscriptionCheck.active) {
        return res.status(403).json({ message: subscriptionCheck.message });
      }
      
      const { category, mode } = parsed.data;
      
      const questionLimit = mode === "full" ? undefined : 50;
      const questions = await storage.getQuestions(category, questionLimit);
      
      if (questions.length === 0) {
        return res.status(404).json({ message: "No questions available for this category" });
      }
      
      const timeLimit = mode === "full" 
        ? Math.max(questions.length * 108, 5400)
        : 5400;
      
      const session = await storage.createExamSession({
        userId,
        category,
        questionIds: questions.map(q => q.id),
        currentQuestionIndex: 0,
        timeLimit,
        isCompleted: false,
      });
      
      res.json({ session, questions });
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
      
      let correctAnswers = 0;
      const questionIds = session.questionIds as string[];
      const topicStats: Record<string, { correct: number; total: number }> = {};
      
      for (const questionId of questionIds) {
        const question = await storage.getQuestion(questionId);
        if (question) {
          const topic = question.topic || "General";
          if (!topicStats[topic]) {
            topicStats[topic] = { correct: 0, total: 0 };
          }
          topicStats[topic].total++;
          
          if (answers[questionId] === question.correctAnswer) {
            correctAnswers++;
            topicStats[topic].correct++;
          }
        }
      }
      
      const totalQuestions = questionIds.length;
      const score = Math.round((correctAnswers / totalQuestions) * 100);
      const passed = score >= 70;
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
      
      const topicBreakdown = Object.entries(topicStats).map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
        percentage: Math.round((stats.correct / stats.total) * 100),
      })).sort((a, b) => a.percentage - b.percentage);
      
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
      const parsed = insertGuestArticleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid submission", errors: parsed.error.errors });
      }
      
      const article = await storage.createGuestArticle(parsed.data);
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

  app.get("/api/stripe/prices", async (req, res) => {
    try {
      const stripe = await getCachedStripeClient();
      const prices = await stripe.prices.list({
        active: true,
        expand: ["data.product"],
      });
      const formattedPrices = prices.data
        .filter(p => p.metadata?.subscription_type)
        .map(p => {
          VALID_PRICE_IDS.add(p.id);
          const product = typeof p.product === "object" ? p.product : null;
          return {
            id: p.id,
            unit_amount: p.unit_amount,
            currency: p.currency,
            recurring_interval: p.recurring?.interval,
            recurring: p.recurring,
            product_id: typeof p.product === "string" ? p.product : p.product?.id,
            product_name: product?.name || null,
            subscription_type: p.metadata?.subscription_type,
            allowed_categories: p.metadata?.allowed_categories?.split(',') || [],
            billing_period: p.metadata?.billing_period,
          };
        });
      res.json(formattedPrices);
    } catch (error) {
      console.error("Error fetching prices:", error);
      res.json([]);
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
      
      if (VALID_PRICE_IDS.size > 0 && !VALID_PRICE_IDS.has(priceId)) {
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
      
      const stripe = await getCachedStripeClient();
      
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
      res.status(500).json({ message: "Failed to create portal session", error: error?.message });
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
      await stripe.subscriptions.cancel(profile.stripeSubscriptionId);
      
      await storage.updateProfile(userId, {
        subscriptionStatus: "canceled",
        stripeSubscriptionId: undefined,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
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
        subscriptionStatus: u.profile?.subscriptionStatus,
        subscriptionPlan: u.profile?.subscriptionPlan,
        createdAt: u.createdAt,
      }));
      
      res.json(formatted);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/questions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const category = req.query.category as ExamCategory | undefined;
      const questions = await storage.getQuestions(category === "all" ? undefined : category);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
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
      const question = await storage.createQuestion(validated);
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
      
      const question = await storage.updateQuestion(id, validated);
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
      
      const feedback = await storage.createQuestionFeedback(parsed.data);
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
      const parsed = insertCallbackRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      
      const [request] = await db.insert(callbackRequests).values(parsed.data).returning();
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
      const limit = parseInt(req.query.limit as string) || 10;
      
      const topicInfo = getTopicById(topicId);
      if (!topicInfo) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      const subscriptionCheck = await ensureSubscriptionActive(userId);
      if (!subscriptionCheck.active) {
        return res.status(403).json({ message: subscriptionCheck.message });
      }
      
      const questions = await storage.getQuestions(topicInfo.category.category, Math.min(limit, 20));
      
      const questionsWithoutAnswers = questions.map(({ correctAnswer, ...rest }) => rest);
      
      res.json({
        topic: topicInfo.topic,
        category: topicInfo.category,
        questions: questionsWithoutAnswers,
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
