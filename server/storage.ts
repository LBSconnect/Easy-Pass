import {
  userProfiles,
  questions,
  generatedQuestions,
  examSessions,
  examResults,
  paymentHistory,
  questionFeedback,
  studyProgress,
  examCertificates,
  guestArticles,
  employerInquiries,
  analyticsEvents,
  questionResponses,
  questionBookmarks,
  flashcardReviews,
  diagnosticAttempts,
  aiUsageEvents,
  type UserProfile,
  type InsertUserProfile,
  type Question,
  type GeneratedQuestionRow,
  type InsertGeneratedQuestion,
  type InsertQuestion,
  type ExamSession,
  type InsertExamSession,
  type ExamResult,
  type InsertExamResult,
  type InsertPaymentHistory,
  type PaymentHistory,
  type ExamCategory,
  type QuestionFeedback,
  type InsertQuestionFeedback,
  type FeedbackStatus,
  type StudyProgress,
  type InsertStudyProgress,
  type ExamCertificate,
  type InsertExamCertificate,
  type GuestArticle,
  type InsertGuestArticle,
  type GuestArticleStatus,
  type EmployerInquiry,
  type InsertEmployerInquiry,
  type EmployerInquiryStatus,
  type InsertAnalyticsEvent,
  type AnalyticsEvent,
  type QuestionResponse,
  type InsertQuestionResponse,
  type TopicMastery,
  type QuestionBookmark,
  type FlashcardReview,
  type DiagnosticAttempt,
  type InsertDiagnosticAttempt,
  type AiUsageEvent,
  type InsertAiUsageEvent,
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { db, pool } from "./db";
import { eq, and, desc, sql, gte, inArray, isNotNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  clearResetToken(userId: string): Promise<void>;
  
  getProfile(userId: string): Promise<UserProfile | undefined>;
  createProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  
  getQuestions(category?: ExamCategory, limit?: number): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestionsByIds(ids: string[]): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, data: Partial<InsertQuestion>): Promise<Question | undefined>;
  deleteQuestion(id: string): Promise<boolean>;
  
  createExamSession(session: InsertExamSession): Promise<ExamSession>;
  getExamSession(id: string): Promise<ExamSession | undefined>;
  updateExamSession(id: string, data: Partial<ExamSession>): Promise<ExamSession | undefined>;
  deleteExamSession(id: string): Promise<boolean>;
  
  createExamResult(result: InsertExamResult): Promise<ExamResult>;
  getExamResults(userId: string): Promise<ExamResult[]>;
  getAllExamResults(): Promise<ExamResult[]>;
  clearUserExamHistory(userId: string): Promise<{
    examSessions: number;
    examResults: number;
    studyProgress: number;
    examCertificates: number;
  }>;
  deleteUserAccount(userId: string): Promise<{
    examSessions: number;
    examResults: number;
    studyProgress: number;
    examCertificates: number;
    questionFeedback: number;
    userProfile: boolean;
    user: boolean;
  }>;

  createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistory(userId: string): Promise<PaymentHistory[]>;
  getPaymentByStripeId(stripePaymentId: string): Promise<PaymentHistory | undefined>;
  
  getAllUsers(): Promise<Array<User & { profile?: UserProfile; examCount: number; lastExamAt: Date | null }>>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    passRate: number;
  }>;
  getAdminAnalytics(): Promise<{
    examsByCategory: Array<{ category: string; attempts: number; avgScore: number; passRate: number }>;
    resultsOverTime: Array<{ date: string; count: number }>;
    userGrowth: Array<{ date: string; count: number }>;
    revenueOverTime: Array<{ date: string; amount: number }>;
    subscriptionsByType: Array<{ type: string; count: number }>;
    subscriptionsByCategory: Array<{ category: string; count: number }>;
    topEvents: Array<{ event: string; count: number }>;
  }>;

  createQuestionFeedback(feedback: InsertQuestionFeedback): Promise<QuestionFeedback>;
  getQuestionFeedback(questionId?: string): Promise<QuestionFeedback[]>;
  getAllQuestionFeedback(): Promise<QuestionFeedback[]>;
  updateQuestionFeedback(id: string, data: { status?: FeedbackStatus; adminNotes?: string }): Promise<QuestionFeedback | undefined>;
  
  getStudyProgress(userId: string, category?: ExamCategory): Promise<StudyProgress[]>;
  getStudyProgressByTopic(userId: string, topicId: string): Promise<StudyProgress | undefined>;
  upsertStudyProgress(userId: string, category: ExamCategory, topicId: string, correct: boolean): Promise<StudyProgress>;
  getQuestionsByTopic(category: ExamCategory, topicId: string, limit?: number): Promise<Question[]>;
  getActiveQuestions(category: ExamCategory): Promise<Question[]>;
  getActiveQuestionCounts(): Promise<Record<string, number>>;

  // Draft questions. Nothing here is ever served to a student; approval copies
  // a row into `questions`, and that copy is the only path across.
  createGeneratedQuestions(drafts: InsertGeneratedQuestion[]): Promise<number>;
  listGeneratedQuestions(status?: string): Promise<GeneratedQuestionRow[]>;
  getGeneratedQuestion(id: string): Promise<GeneratedQuestionRow | undefined>;
  approveGeneratedQuestion(
    id: string,
    reviewerId: string,
    edits: { questionTextEn: string; questionTextEs: string; optionsEn: string[]; optionsEs: string[]; correctAnswer: number; explanationEn: string | null; explanationEs: string | null; topic: string | null },
    note?: string,
  ): Promise<{ questionId: string } | null>;
  rejectGeneratedQuestion(id: string, reviewerId: string, note?: string): Promise<boolean>;

  recordQuestionResponses(responses: InsertQuestionResponse[]): Promise<number>;
  getTopicMastery(userId: string, category?: ExamCategory): Promise<TopicMastery[]>;
  getMissedQuestionIds(userId: string, category?: ExamCategory): Promise<string[]>;
  getResponsesSince(userId: string, since: Date): Promise<QuestionResponse[]>;
  getResponsesForCategory(userId: string, category: ExamCategory): Promise<QuestionResponse[]>;
  toggleBookmark(userId: string, questionId: string, category: ExamCategory): Promise<{ bookmarked: boolean }>;
  getBookmarkedQuestionIds(userId: string, category?: ExamCategory): Promise<string[]>;
  getFlashcardReviews(userId: string, category: ExamCategory): Promise<FlashcardReview[]>;
  upsertFlashcardReview(userId: string, questionId: string, category: ExamCategory, state: { streak: number; intervalDays: number; ease: number; dueAt: Date }): Promise<void>;
  countActiveQuestions(category: ExamCategory): Promise<number>;
  getItemResponseStats(): Promise<Array<{ questionId: string; respondents: number; correct: number }>>;
  applyItemDifficulty(items: Array<{ questionId: string; difficulty: string; pValue: number }>): Promise<number>;
  
  createCertificate(certificate: InsertExamCertificate): Promise<ExamCertificate>;
  getCertificateBySlug(slug: string): Promise<ExamCertificate | undefined>;
  getCertificateByResultId(resultId: string): Promise<ExamCertificate | undefined>;
  getCertificatesByUser(userId: string): Promise<ExamCertificate[]>;
  revokeCertificate(id: string): Promise<ExamCertificate | undefined>;
  
  createGuestArticle(article: InsertGuestArticle): Promise<GuestArticle>;
  getAllGuestArticles(): Promise<GuestArticle[]>;
  updateGuestArticleStatus(id: string, status: GuestArticleStatus, adminNotes?: string): Promise<GuestArticle | undefined>;

  createEmployerInquiry(inquiry: InsertEmployerInquiry): Promise<EmployerInquiry>;
  getAllEmployerInquiries(): Promise<EmployerInquiry[]>;
  updateEmployerInquiryStatus(id: string, status: EmployerInquiryStatus, adminNotes?: string): Promise<EmployerInquiry | undefined>;

  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;

  createAiUsageEvent(event: InsertAiUsageEvent): Promise<AiUsageEvent>;
  getAiUsageSummary(sinceDays: number): Promise<AiUsageSummary>;

  createDiagnosticAttempt(attempt: InsertDiagnosticAttempt): Promise<DiagnosticAttempt>;
  getDiagnosticAttempt(id: string): Promise<DiagnosticAttempt | undefined>;
  /** Most recent COMPLETED attempt for a user, newest first. */
  getLatestDiagnosticAttempt(userId: string): Promise<DiagnosticAttempt | undefined>;
  completeDiagnosticAttempt(id: string, data: { score: number; correctAnswers: number }): Promise<DiagnosticAttempt | undefined>;
}

export interface AiUsageSummary {
  sinceDays: number;
  totalCalls: number;
  totalCostUsd: number;
  cacheHitRate: number;
  errorRate: number;
  byOperation: Array<{
    operation: string;
    outcome: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    avgLatencyMs: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    // Case-insensitive lookup: registration always stores emails lowercased,
    // but older rows or direct DB edits could have mixed case, and callers
    // (login, forgot-password) don't all normalize their input either.
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = lower(${email})`);
    return user;
  }
  
  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(users.id, userId));
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }
  
  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.id, userId));
  }
  
  async clearResetToken(userId: string): Promise<void> {
    await db.update(users).set({ resetToken: null, resetTokenExpiry: null }).where(eq(users.id, userId));
  }

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  async getQuestions(category?: ExamCategory, limit?: number): Promise<Question[]> {
    // Prevent bundler from removing Drizzle query code
    void questions;

    let baseQuery = db.select().from(questions).where(eq(questions.isActive, true));

    if (category) {
      baseQuery = db
        .select()
        .from(questions)
        .where(and(eq(questions.isActive, true), eq(questions.category, category)));
    }

    const result = limit
      ? await baseQuery.orderBy(sql`RANDOM()`).limit(limit)
      : await baseQuery.orderBy(sql`RANDOM()`);

    return result;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    if (ids.length === 0) return [];
    return db.select().from(questions).where(inArray(questions.id, ids));
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [created] = await db.insert(questions).values(question).returning();
    return created;
  }

  async updateQuestion(id: string, data: Partial<InsertQuestion>): Promise<Question | undefined> {
    const [updated] = await db
      .update(questions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    return updated;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const [deleted] = await db
      .update(questions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    return !!deleted;
  }

  async createExamSession(session: InsertExamSession): Promise<ExamSession> {
    const [created] = await db.insert(examSessions).values(session).returning();
    return created;
  }

  async getExamSession(id: string): Promise<ExamSession | undefined> {
    const [session] = await db.select().from(examSessions).where(eq(examSessions.id, id));
    return session;
  }

  async updateExamSession(id: string, data: Partial<ExamSession>): Promise<ExamSession | undefined> {
    const [updated] = await db
      .update(examSessions)
      .set(data)
      .where(eq(examSessions.id, id))
      .returning();
    return updated;
  }

  async deleteExamSession(id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(examSessions)
      .where(eq(examSessions.id, id))
      .returning();
    return !!deleted;
  }

  async createExamResult(result: InsertExamResult): Promise<ExamResult> {
    const [created] = await db.insert(examResults).values(result).returning();
    return created;
  }

  async getExamResults(userId: string): Promise<ExamResult[]> {
    return db
      .select()
      .from(examResults)
      .where(eq(examResults.userId, userId))
      .orderBy(desc(examResults.completedAt));
  }

  async getAllExamResults(): Promise<ExamResult[]> {
    return db.select().from(examResults).orderBy(desc(examResults.completedAt));
  }

  async clearUserExamHistory(userId: string): Promise<{
    examSessions: number;
    examResults: number;
    studyProgress: number;
    examCertificates: number;
  }> {
    const deletedSessions = await db.delete(examSessions).where(eq(examSessions.userId, userId)).returning();
    const deletedResults = await db.delete(examResults).where(eq(examResults.userId, userId)).returning();
    const deletedProgress = await db.delete(studyProgress).where(eq(studyProgress.userId, userId)).returning();
    const deletedCertificates = await db.delete(examCertificates).where(eq(examCertificates.userId, userId)).returning();

    return {
      examSessions: deletedSessions.length,
      examResults: deletedResults.length,
      studyProgress: deletedProgress.length,
      examCertificates: deletedCertificates.length,
    };
  }

  // Deletes a user's account and all associated app-activity data (exam
  // sessions/results, study progress, certificates, feedback, profile).
  // Deliberately does NOT touch paymentHistory or subscriptions - those are
  // retained for accounting/legal purposes per the Records Retention
  // Schedule, matching the "we may deny or limit a deletion request where
  // we must retain the information" carve-out in the Privacy Policy.
  async deleteUserAccount(userId: string): Promise<{
    examSessions: number;
    examResults: number;
    studyProgress: number;
    examCertificates: number;
    questionFeedback: number;
    userProfile: boolean;
    user: boolean;
  }> {
    const deletedSessions = await db.delete(examSessions).where(eq(examSessions.userId, userId)).returning();
    const deletedResults = await db.delete(examResults).where(eq(examResults.userId, userId)).returning();
    const deletedProgress = await db.delete(studyProgress).where(eq(studyProgress.userId, userId)).returning();
    const deletedCertificates = await db.delete(examCertificates).where(eq(examCertificates.userId, userId)).returning();
    const deletedFeedback = await db.delete(questionFeedback).where(eq(questionFeedback.userId, userId)).returning();
    await db.update(diagnosticAttempts).set({ userId: null }).where(eq(diagnosticAttempts.userId, userId));
    const deletedProfile = await db.delete(userProfiles).where(eq(userProfiles.userId, userId)).returning();
    const deletedUser = await db.delete(users).where(eq(users.id, userId)).returning();

    return {
      examSessions: deletedSessions.length,
      examResults: deletedResults.length,
      studyProgress: deletedProgress.length,
      examCertificates: deletedCertificates.length,
      questionFeedback: deletedFeedback.length,
      userProfile: deletedProfile.length > 0,
      user: deletedUser.length > 0,
    };
  }

  async createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory> {
    const [created] = await db.insert(paymentHistory).values(payment).returning();
    return created;
  }

  async getPaymentHistory(userId: string): Promise<PaymentHistory[]> {
    return db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.userId, userId))
      .orderBy(desc(paymentHistory.createdAt));
  }

  // Used to make webhook-driven payment recording idempotent: Stripe can
  // redeliver the same event (or we can receive both invoice.paid and a
  // later reconciliation pass) referencing the same payment/invoice, and
  // this lookup lets callers skip re-inserting a row they already have.
  async getPaymentByStripeId(stripePaymentId: string): Promise<PaymentHistory | undefined> {
    const [payment] = await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.stripePaymentId, stripePaymentId));
    return payment;
  }

  async getAllUsers(): Promise<Array<User & { profile?: UserProfile; examCount: number; lastExamAt: Date | null }>> {
    const allUsers = await db.select().from(users);
    const allProfiles = await db.select().from(userProfiles);
    const allResults = await db.select().from(examResults);

    return allUsers.map(user => {
      const profile = allProfiles.find(p => p.userId === user.id);
      const userResults = allResults.filter(r => r.userId === user.id);
      const lastExamAt = userResults.length > 0
        ? new Date(Math.max(...userResults.map(r => new Date(r.completedAt).getTime())))
        : null;
      return {
        ...user,
        profile: profile || undefined,
        examCount: userResults.length,
        lastExamAt,
      };
    });
  }
  async getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    passRate: number;
  }> {
    const allUsers = await db.select().from(users);
    const allResults = await db.select().from(examResults);
    const allPayments = await db.select().from(paymentHistory);

    // Count active subscriptions from user_profiles
    const activeProfiles = await db
      .select()
      .from(userProfiles)
      .where(sql`subscription_status = 'active'`);

    const totalRevenue = allPayments
      .filter(p => p.status === "succeeded")
      .reduce((sum, p) => sum + p.amount, 0);

    const passRate = allResults.length > 0
      ? Math.round((allResults.filter(r => r.passed).length / allResults.length) * 100)
      : 0;

    return {
      totalUsers: allUsers.length,
      activeSubscriptions: activeProfiles.length,
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      passRate,
    };
  }

  async getAdminAnalytics(): Promise<{
    examsByCategory: Array<{ category: string; attempts: number; avgScore: number; passRate: number }>;
    resultsOverTime: Array<{ date: string; count: number }>;
    userGrowth: Array<{ date: string; count: number }>;
    revenueOverTime: Array<{ date: string; amount: number }>;
    subscriptionsByType: Array<{ type: string; count: number }>;
    subscriptionsByCategory: Array<{ category: string; count: number }>;
    topEvents: Array<{ event: string; count: number }>;
  }> {
    const TREND_DAYS = 30;
    const since = new Date();
    since.setDate(since.getDate() - (TREND_DAYS - 1));
    since.setHours(0, 0, 0, 0);

    const [allResults, allUsers, allPayments, allProfiles, recentEvents] = await Promise.all([
      db.select().from(examResults),
      db.select().from(users),
      db.select().from(paymentHistory),
      db.select().from(userProfiles),
      db.select().from(analyticsEvents).where(sql`${analyticsEvents.createdAt} >= ${since}`),
    ]);

    const categories: ExamCategory[] = ["real_estate", "property_casualty", "life_insurance", "general_lines"];

    const examsByCategory = categories.map((category) => {
      const results = allResults.filter((r) => r.category === category);
      const attempts = results.length;
      const avgScore = attempts > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / attempts) : 0;
      const passRate = attempts > 0 ? Math.round((results.filter((r) => r.passed).length / attempts) * 100) : 0;
      return { category, attempts, avgScore, passRate };
    });

    // Build a zero-filled date bucket for the last TREND_DAYS days so trend
    // charts show gaps (days with no activity) instead of skipping them.
    const dateBuckets: string[] = [];
    for (let i = 0; i < TREND_DAYS; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      dateBuckets.push(d.toISOString().slice(0, 10));
    }
    const toDateKey = (value: Date | string) => new Date(value).toISOString().slice(0, 10);

    const resultsCounts: Record<string, number> = Object.fromEntries(dateBuckets.map((d) => [d, 0]));
    for (const result of allResults) {
      const key = toDateKey(result.completedAt);
      if (key in resultsCounts) resultsCounts[key]++;
    }
    const resultsOverTime = dateBuckets.map((date) => ({ date, count: resultsCounts[date] }));

    const userGrowthCounts: Record<string, number> = Object.fromEntries(dateBuckets.map((d) => [d, 0]));
    for (const user of allUsers) {
      if (!user.createdAt) continue;
      const key = toDateKey(user.createdAt);
      if (key in userGrowthCounts) userGrowthCounts[key]++;
    }
    const userGrowth = dateBuckets.map((date) => ({ date, count: userGrowthCounts[date] }));

    const revenueCents: Record<string, number> = Object.fromEntries(dateBuckets.map((d) => [d, 0]));
    for (const payment of allPayments) {
      if (payment.status !== "succeeded") continue;
      const key = toDateKey(payment.createdAt);
      if (key in revenueCents) revenueCents[key] += payment.amount;
    }
    const revenueOverTime = dateBuckets.map((date) => ({ date, amount: revenueCents[date] / 100 }));

    const activeProfiles = allProfiles.filter(
      (p) => p.subscriptionStatus === "active" || p.subscriptionStatus === "trialing"
    );

    const typeCounts: Record<string, number> = { single: 0, bundle: 0 };
    for (const profile of activeProfiles) {
      if (profile.subscriptionType) {
        typeCounts[profile.subscriptionType] = (typeCounts[profile.subscriptionType] || 0) + 1;
      }
    }
    const subscriptionsByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

    const categoryCounts: Record<string, number> = Object.fromEntries(categories.map((c) => [c, 0]));
    for (const profile of activeProfiles) {
      for (const category of profile.allowedCategories || []) {
        if (category in categoryCounts) categoryCounts[category]++;
      }
    }
    const subscriptionsByCategory = categories.map((category) => ({ category, count: categoryCounts[category] }));

    const eventCounts: Record<string, number> = {};
    for (const event of recentEvents) {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    }
    const topEvents = Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      examsByCategory,
      resultsOverTime,
      userGrowth,
      revenueOverTime,
      subscriptionsByType,
      subscriptionsByCategory,
      topEvents,
    };
  }

  async createQuestionFeedback(feedback: InsertQuestionFeedback): Promise<QuestionFeedback> {
    const [created] = await db.insert(questionFeedback).values(feedback).returning();
    return created;
  }

  async getQuestionFeedback(questionId?: string): Promise<QuestionFeedback[]> {
    if (questionId) {
      return db
        .select()
        .from(questionFeedback)
        .where(eq(questionFeedback.questionId, questionId))
        .orderBy(desc(questionFeedback.createdAt));
    }
    return db.select().from(questionFeedback).orderBy(desc(questionFeedback.createdAt));
  }

  async getAllQuestionFeedback(): Promise<QuestionFeedback[]> {
    return db.select().from(questionFeedback).orderBy(desc(questionFeedback.createdAt));
  }

  async updateQuestionFeedback(id: string, data: { status?: FeedbackStatus; adminNotes?: string }): Promise<QuestionFeedback | undefined> {
    const [updated] = await db
      .update(questionFeedback)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(questionFeedback.id, id))
      .returning();
    return updated;
  }

  async getStudyProgress(userId: string, category?: ExamCategory): Promise<StudyProgress[]> {
    if (category) {
      return db
        .select()
        .from(studyProgress)
        .where(and(eq(studyProgress.userId, userId), eq(studyProgress.category, category)))
        .orderBy(desc(studyProgress.lastStudiedAt));
    }
    return db
      .select()
      .from(studyProgress)
      .where(eq(studyProgress.userId, userId))
      .orderBy(desc(studyProgress.lastStudiedAt));
  }

  async getStudyProgressByTopic(userId: string, topicId: string): Promise<StudyProgress | undefined> {
    const [progress] = await db
      .select()
      .from(studyProgress)
      .where(and(eq(studyProgress.userId, userId), eq(studyProgress.topicId, topicId)));
    return progress;
  }

  async upsertStudyProgress(userId: string, category: ExamCategory, topicId: string, correct: boolean): Promise<StudyProgress> {
    const existing = await this.getStudyProgressByTopic(userId, topicId);
    
    if (existing) {
      const [updated] = await db
        .update(studyProgress)
        .set({
          questionsAnswered: existing.questionsAnswered + 1,
          correctAnswers: existing.correctAnswers + (correct ? 1 : 0),
          lastStudiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(studyProgress.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(studyProgress)
      .values({
        userId,
        category,
        topicId,
        questionsAnswered: 1,
        correctAnswers: correct ? 1 : 0,
      })
      .returning();
    return created;
  }

  // Previously ignored topicId entirely and returned random questions from the
  // whole category, so "study this topic" silently studied everything.
  async getQuestionsByTopic(category: ExamCategory, topicId: string, limit?: number): Promise<Question[]> {
    const query = db
      .select()
      .from(questions)
      .where(and(
        eq(questions.category, category),
        eq(questions.isActive, true),
        eq(questions.topic, topicId),
      ));

    if (limit) {
      return query.orderBy(sql`RANDOM()`).limit(limit);
    }
    return query.orderBy(sql`RANDOM()`);
  }

  // Full active bank for a category, used as the candidate pool for adaptive
  // selection. Unordered: the selector decides the ordering, not the database.
  // How many questions each category actually offers. Counted in the database
  // rather than by loading every row: the exams page shows this on four cards
  // at once and does not need a single question body to do it.
  async getActiveQuestionCounts(): Promise<Record<string, number>> {
    const rows = await db
      .select({
        category: questions.category,
        count: sql<number>`count(*)::int`,
      })
      .from(questions)
      .where(eq(questions.isActive, true))
      .groupBy(questions.category);

    return Object.fromEntries(rows.map((r) => [r.category, Number(r.count)]));
  }

  async createGeneratedQuestions(drafts: InsertGeneratedQuestion[]): Promise<number> {
    if (drafts.length === 0) return 0;
    const rows = await db.insert(generatedQuestions).values(drafts).returning({ id: generatedQuestions.id });
    return rows.length;
  }

  async listGeneratedQuestions(status = "pending"): Promise<GeneratedQuestionRow[]> {
    return db
      .select()
      .from(generatedQuestions)
      .where(eq(generatedQuestions.status, status))
      .orderBy(desc(generatedQuestions.createdAt));
  }

  async getGeneratedQuestion(id: string): Promise<GeneratedQuestionRow | undefined> {
    const [row] = await db.select().from(generatedQuestions).where(eq(generatedQuestions.id, id));
    return row;
  }

  /**
   * Publish a draft as a real question.
   *
   * The reviewer's edits are what gets written, not the draft - a reviewer who
   * corrected the wording expects the correction published, and taking the
   * original instead would silently discard their work.
   *
   * Guarded on `status = 'pending'` inside the update so a double-click, or two
   * admins acting at once, cannot publish the same draft twice.
   */
  async approveGeneratedQuestion(
    id: string,
    reviewerId: string,
    edits: {
      questionTextEn: string; questionTextEs: string;
      optionsEn: string[]; optionsEs: string[];
      correctAnswer: number;
      explanationEn: string | null; explanationEs: string | null;
      topic: string | null;
    },
    note?: string,
  ): Promise<{ questionId: string } | null> {
    const draft = await this.getGeneratedQuestion(id);
    if (!draft || draft.status !== "pending") return null;

    const [claimed] = await db
      .update(generatedQuestions)
      .set({ status: "approved", reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: note ?? null })
      .where(and(eq(generatedQuestions.id, id), eq(generatedQuestions.status, "pending")))
      .returning({ id: generatedQuestions.id });
    if (!claimed) return null;

    const [created] = await db
      .insert(questions)
      .values({
        category: draft.category,
        topic: edits.topic,
        questionTextEn: edits.questionTextEn,
        questionTextEs: edits.questionTextEs,
        optionsEn: edits.optionsEn,
        optionsEs: edits.optionsEs,
        correctAnswer: edits.correctAnswer,
        explanationEn: edits.explanationEn,
        explanationEs: edits.explanationEs,
        isActive: true,
      })
      .returning({ id: questions.id });

    await db
      .update(generatedQuestions)
      .set({ publishedQuestionId: created.id })
      .where(eq(generatedQuestions.id, id));

    return { questionId: created.id };
  }

  async rejectGeneratedQuestion(id: string, reviewerId: string, note?: string): Promise<boolean> {
    const [row] = await db
      .update(generatedQuestions)
      .set({ status: "rejected", reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: note ?? null })
      .where(and(eq(generatedQuestions.id, id), eq(generatedQuestions.status, "pending")))
      .returning({ id: generatedQuestions.id });
    return Boolean(row);
  }

  async getActiveQuestions(category: ExamCategory): Promise<Question[]> {
    return db
      .select()
      .from(questions)
      .where(and(eq(questions.category, category), eq(questions.isActive, true)));
  }

  // Append-only. onConflictDoNothing keeps the backfill and a retried submit
  // from duplicating history via uq_question_responses_session_question.
  async recordQuestionResponses(responses: InsertQuestionResponse[]): Promise<number> {
    if (responses.length === 0) return 0;
    const inserted = await db
      .insert(questionResponses)
      .values(responses)
      .onConflictDoNothing()
      .returning({ id: questionResponses.id });
    return inserted.length;
  }

  async getTopicMastery(userId: string, category?: ExamCategory): Promise<TopicMastery[]> {
    const filters = [eq(questionResponses.userId, userId)];
    if (category) filters.push(eq(questionResponses.category, category));

    const rows = await db
      .select({
        category: questionResponses.category,
        topic: questionResponses.topic,
        answered: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) FILTER (WHERE ${questionResponses.isCorrect})::int`,
        lastAnsweredAt: sql<Date>`max(${questionResponses.answeredAt})`,
      })
      .from(questionResponses)
      .where(and(...filters))
      .groupBy(questionResponses.category, questionResponses.topic);

    return rows.map((r) => ({
      ...r,
      accuracy: r.answered > 0 ? Math.round((r.correct / r.answered) * 100) : 0,
    }));
  }

  // Questions whose most recent answer was wrong. A later correct answer
  // clears a question from the notebook without erasing its history.
  async getMissedQuestionIds(userId: string, category?: ExamCategory): Promise<string[]> {
    const filters = [eq(questionResponses.userId, userId)];
    if (category) filters.push(eq(questionResponses.category, category));

    const rows = await db
      .select({
        questionId: questionResponses.questionId,
        latestCorrect: sql<boolean>`(array_agg(${questionResponses.isCorrect} ORDER BY ${questionResponses.answeredAt} DESC))[1]`,
      })
      .from(questionResponses)
      .where(and(...filters))
      .groupBy(questionResponses.questionId);

    return rows.filter((r) => !r.latestCorrect).map((r) => r.questionId);
  }

  async getResponsesSince(userId: string, since: Date): Promise<QuestionResponse[]> {
    return db
      .select()
      .from(questionResponses)
      .where(
        and(
          eq(questionResponses.userId, userId),
          gte(questionResponses.answeredAt, since),
        ),
      )
      .orderBy(questionResponses.answeredAt);
  }

  // Oldest-first: the score's recovery component reads answer sequences in
  // chronological order.
  async getResponsesForCategory(userId: string, category: ExamCategory): Promise<QuestionResponse[]> {
    return db
      .select()
      .from(questionResponses)
      .where(
        and(
          eq(questionResponses.userId, userId),
          eq(questionResponses.category, category),
        ),
      )
      .orderBy(questionResponses.answeredAt);
  }

  async countActiveQuestions(category: ExamCategory): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questions)
      .where(and(eq(questions.category, category), eq(questions.isActive, true)));
    return row?.count ?? 0;
  }

  // Idempotent toggle: relies on uq_question_bookmarks_user_question so a
  // double-tap cannot create duplicate rows.
  async toggleBookmark(
    userId: string,
    questionId: string,
    category: ExamCategory,
  ): Promise<{ bookmarked: boolean }> {
    const [existing] = await db
      .select({ id: questionBookmarks.id })
      .from(questionBookmarks)
      .where(and(
        eq(questionBookmarks.userId, userId),
        eq(questionBookmarks.questionId, questionId),
      ));

    if (existing) {
      await db.delete(questionBookmarks).where(eq(questionBookmarks.id, existing.id));
      return { bookmarked: false };
    }

    await db
      .insert(questionBookmarks)
      .values({ userId, questionId, category })
      .onConflictDoNothing();
    return { bookmarked: true };
  }

  async getBookmarkedQuestionIds(userId: string, category?: ExamCategory): Promise<string[]> {
    const filters = [eq(questionBookmarks.userId, userId)];
    if (category) filters.push(eq(questionBookmarks.category, category));

    const rows = await db
      .select({ questionId: questionBookmarks.questionId })
      .from(questionBookmarks)
      .where(and(...filters));
    return rows.map((r) => r.questionId);
  }

  async getFlashcardReviews(userId: string, category: ExamCategory): Promise<FlashcardReview[]> {
    return db
      .select()
      .from(flashcardReviews)
      .where(and(
        eq(flashcardReviews.userId, userId),
        eq(flashcardReviews.category, category),
      ));
  }

  // Upsert on the unique (user, question) index so a review is idempotent
  // per card rather than accumulating rows.
  async upsertFlashcardReview(
    userId: string,
    questionId: string,
    category: ExamCategory,
    state: { streak: number; intervalDays: number; ease: number; dueAt: Date },
  ): Promise<void> {
    const row = {
      userId,
      questionId,
      category,
      streak: state.streak,
      intervalDays: state.intervalDays,
      easeHundredths: Math.round(state.ease * 100),
      dueAt: state.dueAt,
      lastReviewedAt: new Date(),
    };

    await db
      .insert(flashcardReviews)
      .values({ ...row, reviewCount: 1 })
      .onConflictDoUpdate({
        target: [flashcardReviews.userId, flashcardReviews.questionId],
        set: { ...row, reviewCount: sql`${flashcardReviews.reviewCount} + 1` },
      });
  }

  async createCertificate(certificate: InsertExamCertificate): Promise<ExamCertificate> {
    const [created] = await db.insert(examCertificates).values(certificate).returning();
    return created;
  }

  async getCertificateBySlug(slug: string): Promise<ExamCertificate | undefined> {
    const [cert] = await db
      .select()
      .from(examCertificates)
      .where(eq(examCertificates.slug, slug));
    return cert;
  }

  async getCertificateByResultId(resultId: string): Promise<ExamCertificate | undefined> {
    const [cert] = await db
      .select()
      .from(examCertificates)
      .where(eq(examCertificates.resultId, resultId));
    return cert;
  }

  async getCertificatesByUser(userId: string): Promise<ExamCertificate[]> {
    return db
      .select()
      .from(examCertificates)
      .where(eq(examCertificates.userId, userId))
      .orderBy(desc(examCertificates.createdAt));
  }

  async revokeCertificate(id: string): Promise<ExamCertificate | undefined> {
    const [updated] = await db
      .update(examCertificates)
      .set({ isRevoked: true })
      .where(eq(examCertificates.id, id))
      .returning();
    return updated;
  }

  async createGuestArticle(article: InsertGuestArticle): Promise<GuestArticle> {
    const [created] = await db.insert(guestArticles).values(article).returning();
    return created;
  }

  async getAllGuestArticles(): Promise<GuestArticle[]> {
    return db
      .select()
      .from(guestArticles)
      .orderBy(desc(guestArticles.createdAt));
  }

  async updateGuestArticleStatus(id: string, status: GuestArticleStatus, adminNotes?: string): Promise<GuestArticle | undefined> {
    const [updated] = await db
      .update(guestArticles)
      .set({ status, adminNotes })
      .where(eq(guestArticles.id, id))
      .returning();
    return updated;
  }

  async createEmployerInquiry(inquiry: InsertEmployerInquiry): Promise<EmployerInquiry> {
    const [created] = await db.insert(employerInquiries).values(inquiry).returning();
    return created;
  }

  async getAllEmployerInquiries(): Promise<EmployerInquiry[]> {
    return db
      .select()
      .from(employerInquiries)
      .orderBy(desc(employerInquiries.createdAt));
  }

  async updateEmployerInquiryStatus(id: string, status: EmployerInquiryStatus, adminNotes?: string): Promise<EmployerInquiry | undefined> {
    const [updated] = await db
      .update(employerInquiries)
      .set({ status, adminNotes })
      .where(eq(employerInquiries.id, id))
      .returning();
    return updated;
  }

  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [created] = await db.insert(analyticsEvents).values(event).returning();
    return created;
  }

  /**
   * Per-item response statistics for difficulty calibration.
   *
   * Counts DISTINCT students, not attempts: a student who retries the same
   * question until they get it right would otherwise make a hard item look
   * easy. Their first answer is the one that reflects difficulty.
   */
  async getItemResponseStats(): Promise<Array<{ questionId: string; respondents: number; correct: number }>> {
    const rows = await db
      .select({
        questionId: sql<string>`first_attempts.question_id`,
        respondents: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where first_attempts.is_correct)::int`,
      })
      .from(
        sql`(
          select distinct on (question_id, user_id)
                 question_id, user_id, is_correct
          from question_responses
          order by question_id, user_id, answered_at asc
        ) as first_attempts`,
      )
      .groupBy(sql`first_attempts.question_id`);

    return rows.map((r) => ({
      questionId: r.questionId,
      respondents: Number(r.respondents),
      correct: Number(r.correct),
    }));
  }

  /** Write calibrated difficulty back onto the bank. */
  async applyItemDifficulty(
    items: Array<{ questionId: string; difficulty: string; pValue: number }>,
  ): Promise<number> {
    if (items.length === 0) return 0;
    const now = new Date();
    let updated = 0;

    for (const item of items) {
      const res = await db
        .update(questions)
        .set({
          difficulty: item.difficulty,
          pValueBasisPoints: Math.round(item.pValue * 10000),
          difficultyCalibratedAt: now,
        })
        .where(eq(questions.id, item.questionId));
      updated += (res as { rowCount?: number }).rowCount ?? 1;
    }

    return updated;
  }

  async createAiUsageEvent(event: InsertAiUsageEvent): Promise<AiUsageEvent> {
    const [created] = await db.insert(aiUsageEvents).values(event).returning();
    return created;
  }

  /**
   * Roll up AI spend and reliability for the admin dashboard.
   *
   * Grouped by operation and outcome so a cache-hit rate and a validation
   * failure rate both fall out of the same query - the two numbers that say
   * whether the AI layer is behaving economically and correctly.
   */
  async getAiUsageSummary(sinceDays: number): Promise<AiUsageSummary> {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        operation: aiUsageEvents.operation,
        outcome: aiUsageEvents.outcome,
        calls: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEvents.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEvents.outputTokens}), 0)::int`,
        costMicros: sql<number>`coalesce(sum(${aiUsageEvents.estimatedCostMicros}), 0)::bigint`,
        avgLatencyMs: sql<number>`coalesce(avg(${aiUsageEvents.latencyMs}), 0)::int`,
      })
      .from(aiUsageEvents)
      .where(gte(aiUsageEvents.createdAt, since))
      .groupBy(aiUsageEvents.operation, aiUsageEvents.outcome);

    const byOperation = rows.map((r) => ({
      operation: r.operation,
      outcome: r.outcome,
      calls: Number(r.calls),
      inputTokens: Number(r.inputTokens),
      outputTokens: Number(r.outputTokens),
      costUsd: Number(r.costMicros) / 1_000_000,
      avgLatencyMs: Number(r.avgLatencyMs),
    }));

    const totalCalls = byOperation.reduce((sum, r) => sum + r.calls, 0);
    const cacheHits = byOperation
      .filter((r) => r.outcome === "cache_hit")
      .reduce((sum, r) => sum + r.calls, 0);
    const errors = byOperation
      .filter((r) => r.outcome === "error" || r.outcome === "fallback")
      .reduce((sum, r) => sum + r.calls, 0);

    return {
      sinceDays,
      totalCalls,
      totalCostUsd: byOperation.reduce((sum, r) => sum + r.costUsd, 0),
      // Guard the divisions: a fresh deployment has no rows and 0/0 would
      // render as NaN on the admin dashboard.
      cacheHitRate: totalCalls > 0 ? cacheHits / totalCalls : 0,
      errorRate: totalCalls > 0 ? errors / totalCalls : 0,
      byOperation,
    };
  }

  async createDiagnosticAttempt(attempt: InsertDiagnosticAttempt): Promise<DiagnosticAttempt> {
    const [created] = await db.insert(diagnosticAttempts).values(attempt).returning();
    return created;
  }

  async getDiagnosticAttempt(id: string): Promise<DiagnosticAttempt | undefined> {
    const [attempt] = await db.select().from(diagnosticAttempts).where(eq(diagnosticAttempts.id, id));
    return attempt;
  }

  /**
   * The student's most recent finished readiness check.
   *
   * Only completed attempts count. An abandoned attempt - started, never
   * submitted - has no score, and treating one as "done" would tick the
   * onboarding step off without the student ever seeing a result.
   */
  async getLatestDiagnosticAttempt(userId: string): Promise<DiagnosticAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(diagnosticAttempts)
      .where(and(eq(diagnosticAttempts.userId, userId), isNotNull(diagnosticAttempts.completedAt)))
      .orderBy(desc(diagnosticAttempts.completedAt))
      .limit(1);
    return attempt;
  }

  async completeDiagnosticAttempt(id: string, data: { score: number; correctAnswers: number }): Promise<DiagnosticAttempt | undefined> {
    const [updated] = await db
      .update(diagnosticAttempts)
      .set({ score: data.score, correctAnswers: data.correctAnswers, completedAt: new Date() })
      .where(eq(diagnosticAttempts.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
