import { 
  userProfiles, 
  questions, 
  examSessions, 
  examResults, 
  paymentHistory,
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
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  
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
  
  createExamResult(result: InsertExamResult): Promise<ExamResult>;
  getExamResults(userId: string): Promise<ExamResult[]>;
  getAllExamResults(): Promise<ExamResult[]>;
  
  createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistory(userId: string): Promise<PaymentHistory[]>;
  
  getAllUsers(): Promise<Array<User & { profile?: UserProfile }>>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    passRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
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
    let query = db.select().from(questions).where(eq(questions.isActive, true));
    
    if (category) {
      query = db.select().from(questions).where(
        and(eq(questions.isActive, true), eq(questions.category, category))
      );
    }
    
    if (limit) {
      const result = await query.orderBy(sql`RANDOM()`).limit(limit);
      return result;
    }
    
    const result = await query.orderBy(sql`RANDOM()`);
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
    
    return allUsers.map(user => ({
      ...user,
      profile: allProfiles.find(p => p.userId === user.id),
    }));
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    passRate: number;
  }> {
    const allUsers = await db.select().from(users);
    const allProfiles = await db.select().from(userProfiles);
    const allResults = await db.select().from(examResults);
    const allPayments = await db.select().from(paymentHistory);

    const activeSubscriptions = allProfiles.filter(p => p.subscriptionStatus === "active").length;
    const totalRevenue = allPayments
      .filter(p => p.status === "succeeded")
      .reduce((sum, p) => sum + p.amount, 0);
    const passRate = allResults.length > 0
      ? Math.round((allResults.filter(r => r.passed).length / allResults.length) * 100)
      : 0;

    return {
      totalUsers: allUsers.length,
      activeSubscriptions,
      totalRevenue,
      passRate,
    };
  }
}

export const storage = new DatabaseStorage();
