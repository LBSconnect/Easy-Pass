import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./simpleAuth";
import { getCachedStripeClient } from "./stripeClient";
import { initializeStripePrices } from "./initializeStripePrices";
import { sendPasswordResetEmail } from "./resendClient";
import { rateLimit, getClientIp } from "./rateLimit";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { insertQuestionSchema, insertCallbackRequestSchema, insertQuestionFeedbackSchema, insertGuestArticleSchema, callbackRequests, questionFeedback, type ExamCategory, examCategoryEnum, feedbackStatusEnum, guestArticleStatusEnum } from "@shared/schema";
import { studyTopicsConfig, getTopicById, getTopicsByCategory } from "@shared/studyTopics";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { sanitizeHtml } from "./sanitize";

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

async function ensureSubscriptionActive(userId: string, category?: ExamCategory): Promise<{ active: boolean; message?: string }> {
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
  
  if (category) {
    if (!profile.allowedCategories || profile.allowedCategories.length === 0) {
      return { 
        active: false, 
        message: "Your subscription category access is not configured. Please contact support or resubscribe to continue." 
      };
    }
    if (!profile.allowedCategories.includes(category)) {
      return { 
        active: false, 
        message: `Your subscription does not include access to this exam category. Please upgrade your subscription to access ${category.replace('_', ' ')} exams.` 
      };
    }
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
      
      const validLanguages = ["en", "es"];
      const sanitizedLanguage = validLanguages.includes(preferredLanguage) ? preferredLanguage : undefined;
      const sanitizedPhone = phone ? sanitizeHtml(phone) ?? phone : undefined;
      
      const updated = await storage.updateProfile(userId, {
        phone: sanitizedPhone,
        preferredLanguage: sanitizedLanguage,
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

  // Public diagnostic endpoint to see raw Stripe data (read-only, no sensitive info)
  app.get("/api/stripe/debug", async (req, res) => {
    try {
      const stripe = await getCachedStripeClient();
      const products = await stripe.products.list({ active: true, limit: 100 });
      const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
      const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
      
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
      res.status(500).json({ error: error.message });
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
        .filter(p => {
          const product = typeof p.product === "object" && !('deleted' in p.product) ? p.product : null;
          return p.metadata?.subscription_type || product?.metadata?.subscription_type;
        })
        .map(p => {
          VALID_PRICE_IDS.add(p.id);
          const product = typeof p.product === "object" && !('deleted' in p.product) ? p.product : null;
          const interval = p.recurring?.interval;
          const billingPeriod = p.metadata?.billing_period || product?.metadata?.billing_period ||
            (interval === 'week' ? 'weekly' : interval === 'month' ? 'monthly' : null);
          const subscriptionType = p.metadata?.subscription_type || product?.metadata?.subscription_type;
          const allowedCategoriesStr = p.metadata?.allowed_categories || product?.metadata?.allowed_categories;
          const allowedCategories = allowedCategoriesStr?.split(',').map((c: string) => c.trim()) || [];
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
      
      const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
      
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
      
      // Determine what's missing
      const requiredPrices = [
        { product: 'Real Estate Exam', category: 'real_estate', prices: [{ amount: 699, interval: 'week' }, { amount: 1999, interval: 'month' }] },
        { product: 'Property & Casualty Exam', category: 'property_casualty', prices: [{ amount: 699, interval: 'week' }, { amount: 1999, interval: 'month' }] },
        { product: 'Life Insurance Exam', category: 'life_insurance', prices: [{ amount: 699, interval: 'week' }, { amount: 1999, interval: 'month' }] },
        { product: 'General Lines Exam', category: 'general_lines', prices: [{ amount: 699, interval: 'week' }, { amount: 1999, interval: 'month' }] },
        { product: 'Bundle', category: 'bundle', prices: [{ amount: 1299, interval: 'week' }, { amount: 3499, interval: 'month' }] }
      ];
      
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
      const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
      
      const results: string[] = [];
      
      const REQUIRED = [
        { name: 'Real Estate Exam', category: 'real_estate', isBundle: false, prices: [{ amount: 699, interval: 'week' as const }, { amount: 1999, interval: 'month' as const }] },
        { name: 'Property & Casualty Exam', category: 'property_casualty', isBundle: false, prices: [{ amount: 699, interval: 'week' as const }, { amount: 1999, interval: 'month' as const }] },
        { name: 'Life Insurance Exam', category: 'life_insurance', isBundle: false, prices: [{ amount: 699, interval: 'week' as const }, { amount: 1999, interval: 'month' as const }] },
        { name: 'General Lines Exam', category: 'general_lines', isBundle: false, prices: [{ amount: 699, interval: 'week' as const }, { amount: 1999, interval: 'month' as const }] },
        { name: 'Bundle', category: 'bundle', isBundle: true, prices: [{ amount: 1299, interval: 'week' as const }, { amount: 3499, interval: 'month' as const }] }
      ];
      
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
                  billing_period: priceConfig.interval === 'week' ? 'weekly' : 'monthly'
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
      
      const categoryParam = req.query.category as string | undefined;
      const category = categoryParam && categoryParam !== "all" ? categoryParam as ExamCategory : undefined;
      const questions = await storage.getQuestions(category);
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
      
      const { email } = parsed.data;
      
      // Additional rate limit by email: 3 requests per hour
      const emailRateLimit = rateLimit(`forgot-password:email:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
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
        return res.status(500).json({ message: "Failed to send email" });
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
