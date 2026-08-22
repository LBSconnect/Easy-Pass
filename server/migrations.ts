/**
 * Additive schema migrations, applied automatically at startup.
 *
 * WHY THIS EXISTS
 *
 * Deploys did not apply schema changes - `npm run db:push` was a manual step
 * someone had to remember. That gap took checkout down in production: a column
 * was added to `user_profiles`, the code shipped, the column never did, and
 * every `getProfile` call started failing. The pricing page did not read the
 * profile so it looked healthy; the Subscribe button did, so it returned a 500.
 *
 * A deploy that ships code needing a column, without the column, is broken by
 * construction. So the schema is now brought forward on boot.
 *
 * SAFETY
 *
 * Strictly additive and idempotent. Only CREATE TABLE IF NOT EXISTS, ADD COLUMN
 * IF NOT EXISTS and CREATE INDEX IF NOT EXISTS appear here. There is no DROP,
 * no RENAME, no type change, and no data rewrite anywhere in this file, and
 * nothing here can remove a student's work.
 *
 * This is deliberately NOT `drizzle-kit push`, which compares the whole schema
 * and will happily offer to drop a column it thinks is stale. On a database
 * holding real student progress, a migration that can only add is worth more
 * than one that is clever.
 *
 * ADDING TO THIS FILE
 *
 * Append a step. Never edit or reorder an existing one - they have already run
 * everywhere. If a change cannot be expressed additively (a genuine rename, a
 * type change, a backfill), it needs a considered migration and a human, not
 * this file.
 */

import { pool } from "./db";

interface Step {
  name: string;
  sql: string;
}

/**
 * Enum types must exist before columns reference them. `CREATE TYPE` has no
 * IF NOT EXISTS, so each is wrapped in a DO block that swallows duplicate_object.
 */
const ENUM_STEPS: Step[] = [
  {
    name: "enum response_source",
    sql: `DO $$ BEGIN
      CREATE TYPE response_source AS ENUM ('exam','practice','diagnostic','drill','flashcard');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  },
];

const STEPS: Step[] = [
  // --- Response log: the foundation of readiness scoring -------------------
  {
    name: "table question_responses",
    sql: `CREATE TABLE IF NOT EXISTS question_responses (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      question_id varchar NOT NULL,
      category exam_category NOT NULL,
      topic varchar NOT NULL DEFAULT 'General',
      source response_source NOT NULL,
      session_id varchar,
      selected_answer integer,
      is_correct boolean NOT NULL,
      time_spent_ms integer,
      language language NOT NULL DEFAULT 'en',
      answered_at timestamp NOT NULL DEFAULT now()
    );`,
  },
  {
    name: "indexes question_responses",
    sql: `CREATE INDEX IF NOT EXISTS idx_question_responses_user_category
            ON question_responses (user_id, category);
          CREATE INDEX IF NOT EXISTS idx_question_responses_answered
            ON question_responses (answered_at);
          CREATE UNIQUE INDEX IF NOT EXISTS uq_question_responses_session_question
            ON question_responses (session_id, question_id)
            WHERE session_id IS NOT NULL;`,
  },

  // --- Study planning and retaker rescue ----------------------------------
  {
    name: "user_profiles.exam_date",
    sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS exam_date timestamp;`,
  },
  {
    name: "user_profiles.has_previous_attempt",
    sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS has_previous_attempt boolean;`,
  },

  // --- Bookmarks and flashcards -------------------------------------------
  {
    name: "table question_bookmarks",
    sql: `CREATE TABLE IF NOT EXISTS question_bookmarks (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      question_id varchar NOT NULL,
      category exam_category NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_question_bookmarks_user_question
      ON question_bookmarks (user_id, question_id);`,
  },
  {
    name: "table flashcard_reviews",
    sql: `CREATE TABLE IF NOT EXISTS flashcard_reviews (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      question_id varchar NOT NULL,
      category exam_category NOT NULL,
      streak integer NOT NULL DEFAULT 0,
      interval_days integer NOT NULL DEFAULT 0,
      ease_hundredths integer NOT NULL DEFAULT 250,
      due_at timestamp NOT NULL DEFAULT now(),
      last_reviewed_at timestamp NOT NULL DEFAULT now(),
      review_count integer NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_due
      ON flashcard_reviews (user_id, category, due_at);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_flashcard_reviews_user_question
      ON flashcard_reviews (user_id, question_id);`,
  },

  // --- Assistant cost accounting ------------------------------------------
  {
    name: "table ai_usage_events",
    sql: `CREATE TABLE IF NOT EXISTS ai_usage_events (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operation varchar(50) NOT NULL,
      outcome varchar(20) NOT NULL,
      provider varchar(30) NOT NULL,
      model varchar(60),
      prompt_ref varchar(80),
      input_tokens integer NOT NULL DEFAULT 0,
      output_tokens integer NOT NULL DEFAULT 0,
      estimated_cost_micros integer NOT NULL DEFAULT 0,
      latency_ms integer NOT NULL DEFAULT 0,
      category varchar(40),
      user_id varchar,
      reason varchar(120),
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_events (created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON ai_usage_events (operation, outcome);`,
  },

  // --- The column that broke checkout -------------------------------------
  {
    name: "user_profiles.preferred_category",
    sql: `ALTER TABLE user_profiles
            ADD COLUMN IF NOT EXISTS preferred_category exam_category;`,
  },

  // --- Draft questions awaiting human review ------------------------------
  {
    name: "table generated_questions",
    sql: `CREATE TABLE IF NOT EXISTS generated_questions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      category exam_category NOT NULL,
      topic varchar,
      question_text_en text NOT NULL,
      options_en jsonb NOT NULL,
      correct_answer integer NOT NULL,
      explanation_en text,
      source_question_ids jsonb NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'pending',
      validation_notes jsonb,
      validator_confidence_basis_points integer,
      prompt_ref varchar(80),
      reviewed_by varchar,
      reviewed_at timestamp,
      review_note text,
      published_question_id varchar,
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_generated_questions_status
      ON generated_questions (status);
    CREATE INDEX IF NOT EXISTS idx_generated_questions_category
      ON generated_questions (category);`,
  },

  // --- Remembering that the exam is not scheduled --------------------------
  {
    name: "user_profiles.exam_date_skipped",
    sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS exam_date_skipped boolean;`,
  },

  // --- Readiness check retention ------------------------------------------
  {
    // The dashboard now asks "has this student already done their readiness
    // check?" on every load, which is a lookup by user rather than by id.
    // Without this it is a sequential scan of every attempt ever taken,
    // including the anonymous ones from the marketing page.
    name: "indexes diagnostic_attempts by user",
    sql: `CREATE INDEX IF NOT EXISTS idx_diagnostic_attempts_user
            ON diagnostic_attempts (user_id, completed_at DESC)
            WHERE user_id IS NOT NULL;`,
  },

  // --- Tutor conversation memory --------------------------------------------
  {
    name: "tutor_turns",
    sql: `CREATE TABLE IF NOT EXISTS tutor_turns (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      question_id varchar NOT NULL,
      role varchar(16) NOT NULL,
      text text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
    -- Every read is "this student, this question, most recent first".
    CREATE INDEX IF NOT EXISTS idx_tutor_turns_lookup
      ON tutor_turns (user_id, question_id, created_at DESC);`,
  },

  // --- Bilingual glossary ---------------------------------------------------
  {
    name: "glossary_terms",
    sql: `CREATE TABLE IF NOT EXISTS glossary_terms (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      category exam_category,
      term_en varchar(120) NOT NULL,
      term_es varchar(120) NOT NULL,
      definition_en text NOT NULL,
      definition_es text NOT NULL,
      source_question_ids jsonb,
      status varchar(20) NOT NULL DEFAULT 'draft',
      created_by varchar,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_glossary_status ON glossary_terms (status);
    CREATE INDEX IF NOT EXISTS idx_glossary_category ON glossary_terms (category);
    -- One definition per term per exam. Two rows for the same word would put
    -- contradictory definitions in front of a student with no way to choose.
    --
    -- Two partial indexes rather than one over COALESCE(category::text, ''):
    -- casting an enum to text is only STABLE, not IMMUTABLE, so Postgres
    -- refuses it in an index expression. Splitting on the null also states
    -- the intent plainly - a term with no category is global, and there can
    -- be only one of those per word.
    CREATE UNIQUE INDEX IF NOT EXISTS uq_glossary_term_per_category
      ON glossary_terms (lower(term_en), category)
      WHERE category IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_glossary_term_global
      ON glossary_terms (lower(term_en))
      WHERE category IS NULL;`,
  },

  // --- Measured item difficulty -------------------------------------------
  {
    name: "questions difficulty columns",
    sql: `ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty varchar(20);
          ALTER TABLE questions ADD COLUMN IF NOT EXISTS p_value_basis_points integer;
          ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty_calibrated_at timestamp;`,
  },

  // --- Which kind of paper a sitting was ----------------------------------
  // Targeted practice is deliberately over-weighted toward a student's weak
  // topics, so its score is lower than a representative paper's and must not
  // be read as readiness. Without this column a completed session cannot say
  // which kind it was, and every sitting looks alike to the score.
  //
  // Defaulted rather than backfilled: every existing row predates targeted
  // practice, so "practice" is what they actually were.
  {
    name: "exam_sessions mode",
    sql: `ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS mode varchar(20) DEFAULT 'practice' NOT NULL;`,
  },

  // --- Study reminder emails ----------------------------------------------
  // Nullable and undefaulted on purpose: an existing student has not consented
  // to anything, and a column defaulting to true would opt in every one of
  // them at once. Only an explicit true is consent.
  {
    name: "user_profiles reminder emails",
    sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_reminders_opt_in boolean;
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_reminder_email_at timestamp;
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS unsubscribe_token varchar;
          CREATE UNIQUE INDEX IF NOT EXISTS uq_user_profiles_unsubscribe_token
            ON user_profiles (unsubscribe_token)
            WHERE unsubscribe_token IS NOT NULL;`,
  },

  // --- Who is using the app right now -------------------------------------
  // Nullable with no default: an existing student has not been seen since the
  // column existed, and defaulting to now() would report every account ever
  // created as online the moment this shipped.
  //
  // The index is partial because the count only ever asks about recent rows,
  // and the vast majority of the table will be null or long past.
  {
    name: "user_profiles last seen",
    sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamp;
          CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen
            ON user_profiles (last_seen_at)
            WHERE last_seen_at IS NOT NULL;`,
  },

  // --- Revenue that can be audited back to a subscription ------------------
  //
  // Total Revenue is read as "this site's subscription income this month".
  // Without the subscription id that claim rested on an implicit property of
  // the recorder rather than on anything you could query. The index is on
  // created_at because the figure is now month-to-date and scans by date.
  {
    name: "payment_history subscription and date index",
    sql: `ALTER TABLE payment_history
            ADD COLUMN IF NOT EXISTS stripe_subscription_id varchar;
          CREATE INDEX IF NOT EXISTS idx_payment_history_created
            ON payment_history (created_at);`,
  },

  // --- Partner acquisition channel ----------------------------------------
  //
  // One table, not two. A prospect and a partner are the same organization at
  // different points in one relationship, and splitting them would mean a join
  // on every screen plus a rule about which row is authoritative. The
  // distinction that matters - may we say their name in public - is a status
  // on the row, checked in exactly one place (isPubliclyActive).
  {
    name: "table partner_prospects",
    sql: `CREATE TABLE IF NOT EXISTS partner_prospects (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),

      -- Identity. dedupe_key is name+market normalised; see shared/partners.ts.
      organization_name varchar(300) NOT NULL,
      dedupe_key varchar(400) NOT NULL,
      segment varchar(60) NOT NULL DEFAULT 'other',
      segment_raw varchar(200),
      market varchar(200),
      state varchar(10),

      -- Public research, refreshed by the importer.
      website varchar(500),
      public_contact varchar(300),
      candidate_signal text,
      known_exam_volume integer,
      priority varchar(20),
      why_it_matters text,
      source_url varchar(1000),

      -- CRM. Written by people, never overwritten by an import.
      outreach_status varchar(40) NOT NULL DEFAULT 'not_contacted',
      owner varchar(120),
      decision_maker_name varchar(200),
      decision_maker_title varchar(200),
      contact_email varchar(320),
      contact_phone varchar(60),
      linkedin_url varchar(500),
      facebook_url varchar(500),
      instagram_url varchar(500),
      partnership_hypothesis text,
      notes text,
      next_action text,
      last_contact_at timestamp,

      -- Scoring. Components are 0-5; the override wins when set.
      score_candidate_pipeline integer,
      score_product_fit integer,
      score_decision_maker_access integer,
      score_audience_scale integer,
      score_override integer,

      -- The relationship, and the link that depends on it.
      partner_status varchar(40) NOT NULL DEFAULT 'prospect',
      partner_code varchar(64),
      default_exam_category exam_category,
      partner_active boolean NOT NULL DEFAULT false,
      partner_display_name varchar(200),
      partner_landing_variant varchar(60),
      partner_created_at timestamp,

      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );`,
  },
  {
    name: "indexes partner_prospects",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_prospects_dedupe
            ON partner_prospects (dedupe_key);
          -- Partial, because most rows have no code and NULLs must not collide.
          CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_prospects_code
            ON partner_prospects (partner_code)
            WHERE partner_code IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_partner_prospects_segment
            ON partner_prospects (segment);
          CREATE INDEX IF NOT EXISTS idx_partner_prospects_partner_status
            ON partner_prospects (partner_status);`,
  },
  {
    // First-touch partner on the student. Set once and then left alone, so a
    // later visit through a different link cannot move an existing student's
    // attribution to whoever mailed them most recently.
    name: "user_profiles partner attribution",
    sql: `ALTER TABLE user_profiles
            ADD COLUMN IF NOT EXISTS partner_code varchar(64),
            ADD COLUMN IF NOT EXISTS partner_prospect_id varchar,
            ADD COLUMN IF NOT EXISTS partner_attributed_at timestamp;`,
  },
  {
    // Verified subscriptions credited to a partner.
    //
    // The unique index on stripe_subscription_id is the deduplication, and it
    // is here rather than in application code on purpose: a reload, a second
    // tab and a repeated sync all race each other, and the only place that
    // reliably settles a race between three requests is the database.
    name: "table partner_conversions",
    sql: `CREATE TABLE IF NOT EXISTS partner_conversions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_prospect_id varchar NOT NULL,
      partner_code varchar(64) NOT NULL,
      user_id varchar NOT NULL,
      stripe_subscription_id varchar NOT NULL,
      exam_category exam_category,
      billing_period varchar(20),
      status varchar(40) NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );`,
  },
  {
    name: "indexes partner_conversions",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_conversions_subscription
            ON partner_conversions (stripe_subscription_id);
          CREATE INDEX IF NOT EXISTS idx_partner_conversions_prospect
            ON partner_conversions (partner_prospect_id);
          CREATE INDEX IF NOT EXISTS idx_partner_conversions_created
            ON partner_conversions (created_at);`,
  },

  // --- Automated partner outreach ------------------------------------------
  //
  // Three tables, three concerns. The campaign row is the machine's state for
  // one prospect (shared/outreachCampaign.ts holds the rules); the message
  // rows are the audit trail of what actually left and arrived; suppressions
  // are the addresses nothing may ever be sent to again. Suppression is its
  // own table rather than a campaign flag because it outlives the campaign,
  // the prospect, and any re-import - it is keyed on the address itself.
  {
    name: "table partner_outreach_campaigns",
    sql: `CREATE TABLE IF NOT EXISTS partner_outreach_campaigns (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      prospect_id varchar NOT NULL,

      state varchar(40) NOT NULL DEFAULT 'queued',
      -- A person's hold. Checked before every send, independent of state.
      paused boolean NOT NULL DEFAULT false,

      -- The address this campaign writes to, frozen at enrollment so a CRM
      -- edit mid-sequence cannot silently retarget follow-ups.
      contact_email varchar(320) NOT NULL,
      campaign_source varchar(60) NOT NULL DEFAULT 'partner-outreach-v1',

      initial_sent_at timestamp,
      last_sent_at timestamp,
      next_action_at timestamp,

      reply_received_at timestamp,
      reply_classification varchar(40),
      -- Enough of the reply for a person to act on the alert. Never public.
      reply_excerpt text,
      stop_reason varchar(60),

      -- One-click unsubscribe, no login. Random per campaign.
      unsubscribe_token varchar(64) NOT NULL,

      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );`,
  },
  {
    name: "indexes partner_outreach_campaigns",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_outreach_campaign_prospect
            ON partner_outreach_campaigns (prospect_id);
          CREATE UNIQUE INDEX IF NOT EXISTS uq_outreach_campaign_unsub
            ON partner_outreach_campaigns (unsubscribe_token);
          CREATE INDEX IF NOT EXISTS idx_outreach_campaign_state
            ON partner_outreach_campaigns (state);
          CREATE INDEX IF NOT EXISTS idx_outreach_campaign_next_action
            ON partner_outreach_campaigns (next_action_at)
            WHERE next_action_at IS NOT NULL;`,
  },
  {
    name: "table partner_outreach_messages",
    sql: `CREATE TABLE IF NOT EXISTS partner_outreach_messages (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id varchar NOT NULL,
      prospect_id varchar NOT NULL,

      direction varchar(10) NOT NULL,          -- outbound | inbound
      step varchar(20) NOT NULL,               -- initial | follow_up_1 | follow_up_2 | reply
      recipient varchar(320) NOT NULL,
      subject varchar(500),
      template_version varchar(40),
      provider_message_id varchar(200),
      -- pending | sent | failed | bounced | complained | received
      status varchar(20) NOT NULL,
      -- Inbound only, truncated: what the person actually wrote.
      body_excerpt text,

      sent_at timestamp,
      created_at timestamp NOT NULL DEFAULT now()
    );`,
  },
  {
    name: "indexes partner_outreach_messages",
    sql: `-- One outbound send per step per campaign, enforced by the database
          -- rather than by the engine's discipline. A duplicate job, a retry
          -- after a timeout, two dispatchers racing: all hit this index.
          CREATE UNIQUE INDEX IF NOT EXISTS uq_outreach_message_step
            ON partner_outreach_messages (campaign_id, step)
            WHERE direction = 'outbound';
          CREATE INDEX IF NOT EXISTS idx_outreach_messages_campaign
            ON partner_outreach_messages (campaign_id);
          CREATE INDEX IF NOT EXISTS idx_outreach_messages_sent
            ON partner_outreach_messages (sent_at)
            WHERE sent_at IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_outreach_messages_provider_id
            ON partner_outreach_messages (provider_message_id)
            WHERE provider_message_id IS NOT NULL;`,
  },
  {
    name: "table partner_email_suppressions",
    sql: `CREATE TABLE IF NOT EXISTS partner_email_suppressions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar(320) NOT NULL,
      reason varchar(30) NOT NULL,             -- unsubscribed | hard_bounce | spam_complaint | manual
      source varchar(60),
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_suppression_email
      ON partner_email_suppressions (email);`,
  },
];

export interface MigrationResult {
  applied: string[];
  failed: Array<{ name: string; error: string }>;
}

/**
 * Bring the schema forward.
 *
 * A failing step is logged and the rest still run: one missing index should
 * not stop a column the app needs from being added. The summary is returned so
 * startup can log it and the admin health endpoint can report it.
 */
export async function runMigrations(): Promise<MigrationResult> {
  const result: MigrationResult = { applied: [], failed: [] };

  for (const step of [...ENUM_STEPS, ...STEPS]) {
    try {
      await pool.query(step.sql);
      result.applied.push(step.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[migrate] FAILED ${step.name}: ${message}`);
      result.failed.push({ name: step.name, error: message });
    }
  }

  if (result.failed.length === 0) {
    console.log(`[migrate] schema up to date (${result.applied.length} steps verified)`);
  } else {
    console.error(
      `[migrate] ${result.failed.length} of ${result.applied.length + result.failed.length} ` +
      `steps FAILED - the app may not work correctly`,
    );
  }

  return result;
}

/**
 * Report which expected tables and columns are actually present.
 *
 * Deliberately queries information_schema directly rather than going through
 * the ORM: when a column is missing, the ORM is exactly what is broken, and a
 * diagnostic that fails in the same way as the bug is no diagnostic at all.
 */
export async function checkSchemaHealth(): Promise<{
  healthy: boolean;
  missingTables: string[];
  missingColumns: string[];
}> {
  const expectedTables = [
    "question_responses",
    "question_bookmarks",
    "flashcard_reviews",
    "ai_usage_events",
    "generated_questions",
    "glossary_terms",
    "tutor_turns",
    "partner_prospects",
    "partner_conversions",
    "partner_outreach_campaigns",
    "partner_outreach_messages",
    "partner_email_suppressions",
  ];
  const expectedColumns: Array<[string, string]> = [
    ["user_profiles", "exam_date"],
    ["user_profiles", "exam_date_skipped"],
    ["user_profiles", "has_previous_attempt"],
    ["user_profiles", "preferred_category"],
    ["questions", "difficulty"],
    ["questions", "p_value_basis_points"],
    ["questions", "difficulty_calibrated_at"],
    ["exam_sessions", "mode"],
    ["user_profiles", "email_reminders_opt_in"],
    ["user_profiles", "unsubscribe_token"],
    ["user_profiles", "last_seen_at"],
    ["payment_history", "stripe_subscription_id"],
    ["user_profiles", "partner_code"],
  ];

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  const present = new Set(tables.rows.map((r: { table_name: string }) => r.table_name));
  const missingTables = expectedTables.filter((t) => !present.has(t));

  const columns = await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
  );
  const presentColumns = new Set(
    columns.rows.map((r: { table_name: string; column_name: string }) =>
      `${r.table_name}.${r.column_name}`,
    ),
  );
  const missingColumns = expectedColumns
    .map(([t, c]) => `${t}.${c}`)
    .filter((k) => !presentColumns.has(k));

  return {
    healthy: missingTables.length === 0 && missingColumns.length === 0,
    missingTables,
    missingColumns,
  };
}
