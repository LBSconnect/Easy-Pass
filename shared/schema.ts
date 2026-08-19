import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const languageEnum = pgEnum("language", ["en", "es"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "trialing"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["weekly", "monthly"]);
export const subscriptionTypeEnum = pgEnum("subscription_type", ["single", "bundle"]);
export const examCategoryEnum = pgEnum("exam_category", ["real_estate", "property_casualty", "life_insurance", "general_lines"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
// Where a question response came from. "practice" and "exam" both originate
// from exam_sessions today; the rest are placeholders for the adaptive
// features that write to this table later.
export const responseSourceEnum = pgEnum("response_source", [
  "exam",
  "practice",
  "diagnostic",
  "drill",
  "flashcard",
]);

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
  subscriptionType: subscriptionTypeEnum("subscription_type"),
  allowedCategories: jsonb("allowed_categories").$type<string[]>(),
  subscriptionEndDate: timestamp("subscription_end_date"),
  // Scheduled exam date, used for the countdown and to size the study plan.
  // Null means "not scheduled yet", which is an explicit, supported answer -
  // those students get an untimed plan rather than being nagged for a date.
  examDate: timestamp("exam_date"),
  // "I haven't scheduled it yet", remembered.
  //
  // Null and false both mean "has not answered". Without this the answer was
  // a click that died on reload, so a returning student was asked for a date
  // they had already declined to give - every visit, with the rest of the
  // checklist hidden behind the unanswered question.
  //
  // Setting an actual exam date clears this: they have now scheduled it, and
  // leaving both set would make "skipped" outlive the fact it described.
  examDateSkipped: boolean("exam_date_skipped"),
  // Retaker Rescue: a student who has sat the exam before gets a plan that
  // leans harder on weak areas. Null means they have not told us yet.
  hasPreviousAttempt: boolean("has_previous_attempt"),
  // The exam the student is actively studying for. Persisted so the dashboard
  // does not make them re-pick on every visit; null falls back to whichever
  // category they most recently sat or have access to.
  preferredCategory: examCategoryEnum("preferred_category"),
  // Study reminder emails, off unless the student turns them on. Null and
  // false both mean off; only an explicit true is consent, because a nullable
  // column defaulting to "yes" would opt in everyone who already exists.
  emailRemindersOptIn: boolean("email_reminders_opt_in"),
  // When the last reminder email went out, so one student cannot be emailed
  // twice for the same week however often the dispatcher runs.
  lastReminderEmailAt: timestamp("last_reminder_email_at"),
  // Lets a one-click unsubscribe work without a login. Random, per student,
  // and only ever able to turn reminders off - it grants no other access.
  unsubscribeToken: varchar("unsubscribe_token"),
  // When this student last made a request, used for the "online now" count.
  // Written at most once a minute per student - see shared/onlinePresence.ts.
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_profiles_user_id").on(table.userId),
  index("idx_user_profiles_stripe_customer").on(table.stripeCustomerId),
]);

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: examCategoryEnum("category").notNull(),
  topic: varchar("topic"),
  questionTextEn: text("question_text_en").notNull(),
  questionTextEs: text("question_text_es").notNull(),
  optionsEn: jsonb("options_en").notNull().$type<string[]>(),
  optionsEs: jsonb("options_es").notNull().$type<string[]>(),
  correctAnswer: integer("correct_answer").notNull(),
  explanationEn: text("explanation_en"),
  explanationEs: text("explanation_es"),
  // Measured difficulty, not authored. Calibrated from real response data by
  // server/itemCalibration; null means not enough students have attempted it
  // yet for a p-value to mean anything. See calibrateItemDifficulty.
  difficulty: varchar("difficulty", { length: 20 }),
  /** Proportion answering correctly, x10000 - integers avoid float drift. */
  pValueBasisPoints: integer("p_value_basis_points"),
  difficultyCalibratedAt: timestamp("difficulty_calibrated_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_questions_category").on(table.category),
  index("idx_questions_active").on(table.isActive),
  index("idx_questions_topic").on(table.topic),
]);

/**
 * Draft questions awaiting human review.
 *
 * A SEPARATE TABLE ON PURPOSE.
 *
 * Nothing a model wrote may reach a student on this product, and the surest
 * way to guarantee that is structural rather than procedural: generated
 * questions never live in `questions`, so no query that serves a student can
 * reach one however it is written. Approval copies the row into `questions`
 * as a new record; that copy is the only path from draft to student, and it
 * requires a person.
 *
 * The validator's own verdict is stored alongside, not acted on. It can reject
 * outright, but it can never approve - only a reviewer does that.
 */
/**
 * Bilingual glossary of exam terminology.
 *
 * Definitions are written by a person and never generated. The terms
 * themselves can be surfaced from the approved question bank - see
 * server/alexi/glossaryCandidates.ts, which produces a worklist and
 * deliberately no definitions - but what a term means in Texas insurance or
 * real-estate law is a statement about law, and it belongs to someone
 * qualified to make it.
 *
 * Both languages are required before a term is published, for the same
 * reason generated questions are: half a bilingual glossary is a blank
 * where a Spanish-speaking student expects an answer.
 */
/**
 * What the tutor said, and what the student asked, per question.
 *
 * Scoped to one student and one question on purpose. The tutor may only
 * discuss a question the student has already answered - otherwise it would be
 * handing out answers to questions still ahead of them - and per-question
 * memory keeps that true. Memory spanning questions could carry an earlier
 * discussion of one question into another and leak its answer.
 */
export const tutorTurns = pgTable("tutor_turns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  questionId: varchar("question_id").notNull(),
  /** student | assistant */
  role: varchar("role", { length: 16 }).notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const glossaryTerms = pgTable("glossary_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  /** Null when the term applies across exams rather than to one. */
  category: examCategoryEnum("category"),
  termEn: varchar("term_en", { length: 120 }).notNull(),
  termEs: varchar("term_es", { length: 120 }).notNull(),
  definitionEn: text("definition_en").notNull(),
  definitionEs: text("definition_es").notNull(),
  /** Bank questions the term was surfaced from, so its use is checkable. */
  sourceQuestionIds: jsonb("source_question_ids").$type<string[]>(),
  /** draft | published. Only published terms reach students. */
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generatedQuestions = pgTable("generated_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: examCategoryEnum("category").notNull(),
  topic: varchar("topic"),
  questionTextEn: text("question_text_en").notNull(),
  optionsEn: jsonb("options_en").notNull().$type<string[]>(),
  correctAnswer: integer("correct_answer").notNull(),
  explanationEn: text("explanation_en"),
  /** Bank questions this variant was grounded in. */
  sourceQuestionIds: jsonb("source_question_ids").notNull().$type<string[]>(),
  /** pending | approved | rejected */
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  /** Deterministic + model validation notes, for the reviewer to read. */
  validationNotes: jsonb("validation_notes").$type<string[]>(),
  validatorConfidenceBasisPoints: integer("validator_confidence_basis_points"),
  promptRef: varchar("prompt_ref", { length: 80 }),
  /** Set when a reviewer acts. Null while pending. */
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  /** The `questions` row created on approval, so the link is auditable. */
  publishedQuestionId: varchar("published_question_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_generated_questions_status").on(table.status),
  index("idx_generated_questions_category").on(table.category),
]);

export const examSessions = pgTable("exam_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  category: examCategoryEnum("category").notNull(),
  questionIds: jsonb("question_ids").notNull().$type<string[]>(),
  answers: jsonb("answers").$type<Record<string, number>>(),
  answerOrder: jsonb("answer_order").$type<Record<string, number>>(),
  currentQuestionIndex: integer("current_question_index").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  timeLimit: integer("time_limit").default(3600).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  // "practice" | "full" | "targeted" - see shared/examMode.ts. Stored as text
  // rather than an enum so adding a mode is a code change, not a type
  // migration on a table holding every sitting a student has ever taken.
  mode: varchar("mode", { length: 20 }).default("practice").notNull(),
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

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("userId", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull(),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
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

export const feedbackTypeEnum = pgEnum("feedback_type", ["error", "unclear", "wrong_answer", "translation", "suggestion", "other"]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["pending", "reviewed", "resolved", "dismissed"]);

export const studyProgress = pgTable("study_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  category: examCategoryEnum("category").notNull(),
  topicId: varchar("topic_id").notNull(),
  questionsAnswered: integer("questions_answered").default(0).notNull(),
  correctAnswers: integer("correct_answers").default(0).notNull(),
  lastStudiedAt: timestamp("last_studied_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_study_progress_user").on(table.userId),
  index("idx_study_progress_category").on(table.category),
  index("idx_study_progress_topic").on(table.topicId),
  index("idx_study_progress_user_topic").on(table.userId, table.topicId),
]);

export const questionFeedback = pgTable("question_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar("question_id").notNull(),
  userId: varchar("user_id").notNull(),
  feedbackType: feedbackTypeEnum("feedback_type").notNull(),
  message: text("message").notNull(),
  status: feedbackStatusEnum("status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_question_feedback_question").on(table.questionId),
  index("idx_question_feedback_user").on(table.userId),
  index("idx_question_feedback_status").on(table.status),
  index("idx_question_feedback_type").on(table.feedbackType),
]);

export const examCertificates = pgTable("exam_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").notNull(),
  userId: varchar("user_id").notNull(),
  category: examCategoryEnum("category").notNull(),
  score: integer("score").notNull(),
  slug: varchar("slug", { length: 12 }).notNull().unique(),
  recipientName: varchar("recipient_name", { length: 200 }).notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  completedAt: timestamp("completed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_certificates_user").on(table.userId),
  index("idx_certificates_result").on(table.resultId),
  index("idx_certificates_slug").on(table.slug),
]);

export const guestArticleStatusEnum = pgEnum("guest_article_status", ["pending", "approved", "rejected"]);

export const guestArticles = pgTable("guest_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  articleUrl: varchar("article_url", { length: 500 }),
  message: text("message").notNull(),
  status: guestArticleStatusEnum("status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_guest_articles_status").on(table.status),
  index("idx_guest_articles_email").on(table.email),
]);

export const employerInquiryStatusEnum = pgEnum("employer_inquiry_status", ["new", "contacted", "closed"]);

export const employerInquiries = pgTable("employer_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  teamSize: varchar("team_size", { length: 50 }),
  categoriesInterested: jsonb("categories_interested").$type<string[]>(),
  message: text("message"),
  status: employerInquiryStatusEnum("status").default("new").notNull(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_employer_inquiries_status").on(table.status),
  index("idx_employer_inquiries_created").on(table.createdAt),
]);

export const diagnosticAttempts = pgTable("diagnostic_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  category: examCategoryEnum("category").notNull(),
  questionIds: jsonb("question_ids").notNull().$type<string[]>(),
  answerOrder: jsonb("answer_order").notNull().$type<Record<string, number>>(),
  score: integer("score"),
  correctAnswers: integer("correct_answers"),
  totalQuestions: integer("total_questions").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_diagnostic_attempts_created").on(table.createdAt),
]);

// Response-level history: one row per question answered, per attempt.
//
// exam_sessions.answers only holds the latest answer map for a single session
// and exam_results only stores aggregates, so neither can answer "which
// questions has this user missed, and when?". Topic mastery, the EasyPass
// Score, adaptive question selection and the missed-question notebook all read
// from this table. Rows are append-only - a re-answer is a new row, so the
// history stays intact.
export const questionResponses = pgTable("question_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  questionId: varchar("question_id").notNull(),
  category: examCategoryEnum("category").notNull(),
  // Denormalized from questions.topic so mastery queries avoid a join, and so
  // history survives a later re-topic of the question bank.
  topic: varchar("topic").notNull().default("General"),
  source: responseSourceEnum("source").notNull(),
  // Null for sources that are not tied to a session row (e.g. flashcards).
  sessionId: varchar("session_id"),
  // Index into the options array as shown to the user. Null means unanswered
  // (skipped or ran out of time), which still counts as exposure.
  selectedAnswer: integer("selected_answer"),
  isCorrect: boolean("is_correct").notNull(),
  timeSpentMs: integer("time_spent_ms"),
  language: languageEnum("language").notNull().default("en"),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
}, (table) => [
  // Recency windows for the EasyPass Score ("last N days of activity").
  index("idx_question_responses_user_time").on(table.userId, table.answeredAt),
  // Per-category mastery and score breakdowns.
  index("idx_question_responses_user_category").on(table.userId, table.category),
  // Mastery heatmap and weak-area drills.
  index("idx_question_responses_user_topic").on(table.userId, table.topic),
  // "Have they seen this question before, and did they miss it?" - drives
  // adaptive selection, exposure rotation and the missed-question notebook.
  index("idx_question_responses_user_question").on(table.userId, table.questionId),
  // Admin question-quality analytics (per-question success rates).
  index("idx_question_responses_question").on(table.questionId),
  // Backfill idempotency: one row per (session, question) for session-backed
  // sources, so re-running the backfill cannot duplicate history.
  uniqueIndex("uq_question_responses_session_question")
    .on(table.sessionId, table.questionId)
    .where(sql`session_id IS NOT NULL`),
]);

// Questions a student has flagged to come back to. Separate from the missed
// notebook, which is derived from answer history - a bookmark is an explicit
// choice and survives answering the question correctly.
export const questionBookmarks = pgTable("question_bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  questionId: varchar("question_id").notNull(),
  category: examCategoryEnum("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_question_bookmarks_user").on(table.userId),
  // One bookmark per student per question; makes the toggle idempotent.
  uniqueIndex("uq_question_bookmarks_user_question").on(table.userId, table.questionId),
]);

// Spaced-repetition state, one row per student per card. Cards are backed by
// existing questions rather than separate content, so flashcards stay in sync
// with the question bank instead of drifting into a second source of truth.
export const flashcardReviews = pgTable("flashcard_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  questionId: varchar("question_id").notNull(),
  category: examCategoryEnum("category").notNull(),
  streak: integer("streak").default(0).notNull(),
  intervalDays: integer("interval_days").default(0).notNull(),
  // Stored in hundredths to keep the column integral; 250 = ease 2.50.
  easeHundredths: integer("ease_hundredths").default(250).notNull(),
  dueAt: timestamp("due_at").defaultNow().notNull(),
  lastReviewedAt: timestamp("last_reviewed_at").defaultNow().notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
}, (table) => [
  // Due-card lookup for one student in one category.
  index("idx_flashcard_reviews_due").on(table.userId, table.category, table.dueAt),
  uniqueIndex("uq_flashcard_reviews_user_question").on(table.userId, table.questionId),
]);

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  event: varchar("event", { length: 100 }).notNull(),
  userId: varchar("user_id"),
  path: varchar("path", { length: 500 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_analytics_events_event").on(table.event),
  index("idx_analytics_events_created").on(table.createdAt),
]);

/**
 * AI usage and cost accounting.
 *
 * One row per provider operation. Holds no student text - operation type,
 * model and token counts answer every cost and cache question we have, and a
 * table full of tutor conversations would be a privacy liability for no
 * analytical gain.
 */
export const aiUsageEvents = pgTable("ai_usage_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operation: varchar("operation", { length: 50 }).notNull(),
  /** success | cache_hit | fallback | error | blocked */
  outcome: varchar("outcome", { length: 20 }).notNull(),
  provider: varchar("provider", { length: 30 }).notNull(),
  model: varchar("model", { length: 60 }),
  /** Versioned prompt identifier, e.g. "tutor_explanation@v1". */
  promptRef: varchar("prompt_ref", { length: 80 }),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  /** Millionths of a USD - integer maths avoids float drift when summing. */
  estimatedCostMicros: integer("estimated_cost_micros").default(0).notNull(),
  latencyMs: integer("latency_ms").default(0).notNull(),
  category: varchar("category", { length: 40 }),
  userId: varchar("user_id"),
  /** Short machine-readable reason on non-success outcomes. */
  reason: varchar("reason", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ai_usage_created").on(table.createdAt),
  index("idx_ai_usage_operation").on(table.operation, table.outcome),
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

export const insertUserProfileSchema = createInsertSchema(userProfiles, {
  allowedCategories: z.array(z.string()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Note: kept as a plain ZodObject (no top-level .refine()) because
// server/routes.ts calls insertQuestionSchema.partial() for PATCH updates,
// which is only available on ZodObject, not on the ZodEffects a .refine()
// would produce. Cross-field checks (correct answer index in range, EN/ES
// option counts matching) are applied separately on full creation in
// server/routes.ts POST /api/admin/questions.
export const insertQuestionSchema = createInsertSchema(questions, {
  optionsEn: z.array(z.string().min(1, "Option text is required")).min(2).max(6),
  optionsEs: z.array(z.string().min(1, "Option text is required")).min(2).max(6),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExamSessionSchema = createInsertSchema(examSessions, {
  questionIds: z.array(z.string()),
}).omit({
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

export const insertCallbackRequestSchema = createInsertSchema(callbackRequests, {
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email").max(255),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(20),
  preferredDay: z.string().min(1, "Please select a preferred day").max(20),
  preferredTime: z.string().min(1, "Please select a preferred time").max(20),
}).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const insertQuestionFeedbackSchema = createInsertSchema(questionFeedback).omit({
  id: true,
  status: true,
  adminNotes: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudyProgressSchema = createInsertSchema(studyProgress).omit({
  id: true,
  questionsAnswered: true,
  correctAnswers: true,
  lastStudiedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExamCertificateSchema = createInsertSchema(examCertificates).omit({
  id: true,
  isRevoked: true,
  createdAt: true,
});

export const insertGuestArticleSchema = createInsertSchema(guestArticles, {
  name: z.string().min(2, "Name is required").max(100),
  email: z.string().email("Please enter a valid email").max(255),
  topic: z.string().min(1, "Please select a topic").max(200),
  articleUrl: z.string().url("Please enter a valid URL").max(500).nullable().optional().or(z.literal("")),
  message: z.string().min(50, "Please write at least 50 characters about your article idea"),
}).omit({
  id: true,
  status: true,
  adminNotes: true,
  createdAt: true,
});

export const insertEmployerInquirySchema = createInsertSchema(employerInquiries, {
  companyName: z.string().min(1, "Company name is required").max(200),
  contactName: z.string().min(1, "Contact name is required").max(200),
  email: z.string().email("Please enter a valid email").max(255),
  phone: z.string().max(20).optional(),
  teamSize: z.string().max(50).optional(),
  categoriesInterested: z.array(z.string()).optional(),
  message: z.string().max(2000).optional(),
}).omit({
  id: true,
  status: true,
  adminNotes: true,
  createdAt: true,
});

export const insertDiagnosticAttemptSchema = createInsertSchema(diagnosticAttempts, {
  questionIds: z.array(z.string()),
  answerOrder: z.record(z.string(), z.number()),
}).omit({
  id: true,
  score: true,
  correctAnswers: true,
  completedAt: true,
  createdAt: true,
});

// answeredAt is left settable (it defaults to now()) so the backfill can
// preserve the original completion timestamps of historical exam sessions.
export const insertQuestionResponseSchema = createInsertSchema(questionResponses).omit({
  id: true,
});

export const insertQuestionBookmarkSchema = createInsertSchema(questionBookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents, {
  metadata: z.record(z.string(), z.unknown()).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertAiUsageEventSchema = createInsertSchema(aiUsageEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type GeneratedQuestionRow = typeof generatedQuestions.$inferSelect;
export type InsertGeneratedQuestion = typeof generatedQuestions.$inferInsert;
export type TutorTurnRow = typeof tutorTurns.$inferSelect;
export type InsertTutorTurn = typeof tutorTurns.$inferInsert;
export type GlossaryTerm = typeof glossaryTerms.$inferSelect;
export type InsertGlossaryTerm = typeof glossaryTerms.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type InsertExamSession = z.infer<typeof insertExamSessionSchema>;
export type ExamSession = typeof examSessions.$inferSelect;
export type InsertExamResult = z.infer<typeof insertExamResultSchema>;
export type ExamResult = typeof examResults.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertCallbackRequest = z.infer<typeof insertCallbackRequestSchema>;
export type CallbackRequest = typeof callbackRequests.$inferSelect;
export type InsertQuestionFeedback = z.infer<typeof insertQuestionFeedbackSchema>;
export type QuestionFeedback = typeof questionFeedback.$inferSelect;
export type InsertStudyProgress = z.infer<typeof insertStudyProgressSchema>;
export type StudyProgress = typeof studyProgress.$inferSelect;
export type InsertExamCertificate = z.infer<typeof insertExamCertificateSchema>;
export type ExamCertificate = typeof examCertificates.$inferSelect;
export type InsertGuestArticle = z.infer<typeof insertGuestArticleSchema>;
export type GuestArticle = typeof guestArticles.$inferSelect;
export type InsertEmployerInquiry = z.infer<typeof insertEmployerInquirySchema>;
export type EmployerInquiry = typeof employerInquiries.$inferSelect;
export type InsertDiagnosticAttempt = z.infer<typeof insertDiagnosticAttemptSchema>;
export type DiagnosticAttempt = typeof diagnosticAttempts.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertQuestionResponse = z.infer<typeof insertQuestionResponseSchema>;
export type QuestionResponse = typeof questionResponses.$inferSelect;
export type InsertAiUsageEvent = z.infer<typeof insertAiUsageEventSchema>;
export type AiUsageEvent = typeof aiUsageEvents.$inferSelect;
export type ResponseSource = (typeof responseSourceEnum.enumValues)[number];
export type QuestionBookmark = typeof questionBookmarks.$inferSelect;
export type FlashcardReview = typeof flashcardReviews.$inferSelect;
export type InsertQuestionBookmark = z.infer<typeof insertQuestionBookmarkSchema>;

// Aggregated per-topic accuracy, derived from question_responses. Feeds the
// mastery heatmap, weak-area drills and the EasyPass Score's topic component.
export type TopicMastery = {
  category: ExamCategory;
  topic: string;
  answered: number;
  correct: number;
  accuracy: number;
  lastAnsweredAt: Date;
};

export type ExamCategory = "real_estate" | "property_casualty" | "life_insurance" | "general_lines";
export type GuestArticleStatus = "pending" | "approved" | "rejected";
export type FeedbackType = "error" | "unclear" | "wrong_answer" | "translation" | "suggestion" | "other";
export type FeedbackStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type Language = "en" | "es";
export type SubscriptionPlan = "weekly" | "monthly";
export type SubscriptionType = "single" | "bundle";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";
export type UserRole = "user" | "admin";
export type EmployerInquiryStatus = "new" | "contacted" | "closed";
