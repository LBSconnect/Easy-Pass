import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const languageEnum = pgEnum("language", ["en", "es"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "trialing"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["weekly", "monthly"]);
export const examCategoryEnum = pgEnum("exam_category", ["real_estate", "property_casualty", "life_insurance", "general_lines"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  preferredLanguage: languageEnum("preferred_language").default("en").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  phone: varchar("phone"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_profiles_user_id").on(table.userId),
  index("idx_user_profiles_stripe_customer").on(table.stripeCustomerId),
]);

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: examCategoryEnum("category").notNull(),
  questionTextEn: text("question_text_en").notNull(),
  questionTextEs: text("question_text_es").notNull(),
  optionsEn: jsonb("options_en").notNull().$type<string[]>(),
  optionsEs: jsonb("options_es").notNull().$type<string[]>(),
  correctAnswer: integer("correct_answer").notNull(),
  explanationEn: text("explanation_en"),
  explanationEs: text("explanation_es"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_questions_category").on(table.category),
  index("idx_questions_active").on(table.isActive),
]);

export const examSessions = pgTable("exam_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  category: examCategoryEnum("category").notNull(),
  questionIds: jsonb("question_ids").notNull().$type<string[]>(),
  answers: jsonb("answers").$type<Record<string, number>>(),
  currentQuestionIndex: integer("current_question_index").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  timeLimit: integer("time_limit").default(3600).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
}, (table) => [
  index("idx_exam_sessions_user").on(table.userId),
  index("idx_exam_sessions_category").on(table.category),
]);

export const examResults = pgTable("exam_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  category: examCategoryEnum("category").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  timeTaken: integer("time_taken").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [
  index("idx_exam_results_user").on(table.userId),
  index("idx_exam_results_category").on(table.category),
]);

export const paymentHistory = pgTable("payment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  stripePaymentId: varchar("stripe_payment_id").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency").default("usd").notNull(),
  status: varchar("status").notNull(),
  description: varchar("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payment_history_user").on(table.userId),
]);

export const callbackRequests = pgTable("callback_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  preferredDay: varchar("preferred_day", { length: 20 }).notNull(),
  preferredTime: varchar("preferred_time", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_callback_requests_status").on(table.status),
  index("idx_callback_requests_created").on(table.createdAt),
]);

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  examSessions: many(examSessions),
  examResults: many(examResults),
  payments: many(paymentHistory),
}));

export const examSessionsRelations = relations(examSessions, ({ one }) => ({
  result: one(examResults, {
    fields: [examSessions.id],
    references: [examResults.sessionId],
  }),
}));

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExamSessionSchema = createInsertSchema(examSessions).omit({
  id: true,
  startedAt: true,
});

export const insertExamResultSchema = createInsertSchema(examResults).omit({
  id: true,
  completedAt: true,
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({
  id: true,
  createdAt: true,
});

export const insertCallbackRequestSchema = createInsertSchema(callbackRequests).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertExamSession = z.infer<typeof insertExamSessionSchema>;
export type ExamSession = typeof examSessions.$inferSelect;
export type InsertExamResult = z.infer<typeof insertExamResultSchema>;
export type ExamResult = typeof examResults.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertCallbackRequest = z.infer<typeof insertCallbackRequestSchema>;
export type CallbackRequest = typeof callbackRequests.$inferSelect;

export type ExamCategory = "real_estate" | "property_casualty" | "life_insurance" | "general_lines";
export type Language = "en" | "es";
export type SubscriptionPlan = "weekly" | "monthly";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";
export type UserRole = "user" | "admin";
