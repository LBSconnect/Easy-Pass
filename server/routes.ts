import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replit_integrations/auth";
import { getCachedStripeClient } from "./stripeClient";
import { insertQuestionSchema, insertCallbackRequestSchema, insertQuestionFeedbackSchema, callbackRequests, questionFeedback, type ExamCategory, examCategoryEnum, feedbackStatusEnum } from "@shared/schema";
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

  app.get("/api/stripe/prices", async (req, res) => {
    try {
      const stripe = await getCachedStripeClient();
      const prices = await stripe.prices.list({
        active: true,
        expand: ["data.product"],
      });
      const formattedPrices = prices.data.map(p => {
        VALID_PRICE_IDS.add(p.id);
        return {
          id: p.id,
          unit_amount: p.unit_amount,
          currency: p.currency,
          recurring_interval: p.recurring?.interval,
          recurring: p.recurring,
          product_id: typeof p.product === "string" ? p.product : p.product?.id,
          product_name: typeof p.product === "object" ? p.product?.name : null,
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
      
      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripeCustomerId,
        return_url: `${protocol}://${host}/profile`,
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal:", error);
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

  return httpServer;
}
