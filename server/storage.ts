import {
  userProfiles,
  questions,
  examSessions,
  examResults,
  paymentHistory,
  questionFeedback,
  studyProgress,
  examCertificates,
  guestArticles,
  type UserProfile,
  type InsertUserProfile,
  type Question,
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
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

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
  
  createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistory(userId: string): Promise<PaymentHistory[]>;
  
  getAllUsers(): Promise<Array<User & { profile?: UserProfile }>>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    passRate: number;
  }>;
  
  createQuestionFeedback(feedback: InsertQuestionFeedback): Promise<QuestionFeedback>;
  getQuestionFeedback(questionId?: string): Promise<QuestionFeedback[]>;
  getAllQuestionFeedback(): Promise<QuestionFeedback[]>;
  updateQuestionFeedback(id: string, data: { status?: FeedbackStatus; adminNotes?: string }): Promise<QuestionFeedback | undefined>;
  
  getStudyProgress(userId: string, category?: ExamCategory): Promise<StudyProgress[]>;
  getStudyProgressByTopic(userId: string, topicId: string): Promise<StudyProgress | undefined>;
  upsertStudyProgress(userId: string, category: ExamCategory, topicId: string, correct: boolean): Promise<StudyProgress>;
  getQuestionsByTopic(category: ExamCategory, topicId: string, limit?: number): Promise<Question[]>;
  
  createCertificate(certificate: InsertExamCertificate): Promise<ExamCertificate>;
  getCertificateBySlug(slug: string): Promise<ExamCertificate | undefined>;
  getCertificateByResultId(resultId: string): Promise<ExamCertificate | undefined>;
  getCertificatesByUser(userId: string): Promise<ExamCertificate[]>;
  revokeCertificate(id: string): Promise<ExamCertificate | undefined>;
  
  createGuestArticle(article: InsertGuestArticle): Promise<GuestArticle>;
  getAllGuestArticles(): Promise<GuestArticle[]>;
  updateGuestArticleStatus(id: string, status: GuestArticleStatus, adminNotes?: string): Promise<GuestArticle | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async getAllUsers(): Promise<Array<User & { profile?: UserProfile }>> {
    const allUsers = await db.select().from(users);
    const allProfiles = await db.select().from(userProfiles);

    return allUsers.map(user => {
      const profile = allProfiles.find(p => p.userId === user.id);
      return {
        ...user,
        profile: profile || undefined,
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

  async getQuestionsByTopic(category: ExamCategory, topicId: string, limit?: number): Promise<Question[]> {
    let query = db
      .select()
      .from(questions)
      .where(and(eq(questions.category, category), eq(questions.isActive, true)));
    
    if (limit) {
      return query.orderBy(sql`RANDOM()`).limit(limit);
    }
    return query.orderBy(sql`RANDOM()`);
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
}

export const storage = new DatabaseStorage();
