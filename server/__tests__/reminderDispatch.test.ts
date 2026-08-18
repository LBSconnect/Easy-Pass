/**
 * Sending reminder emails.
 *
 * The failures worth guarding here are the ones a student experiences as the
 * product being untrustworthy: being emailed twice, being emailed after
 * unsubscribing, or being marked as emailed for a message that never left.
 * That last one is subtle and did happen - the provider reports a rejected
 * send by returning an error rather than throwing, so an invalid API key
 * looked exactly like success.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = {
  getReminderRecipients: vi.fn(),
  getMissedQuestionIds: vi.fn(),
  getExamResults: vi.fn(),
  getLastAnsweredAt: vi.fn(),
  markReminderEmailSent: vi.fn(),
  setUnsubscribeToken: vi.fn(),
  unsubscribeByToken: vi.fn(),
};

const mockSend = vi.fn();
const mockGetResendClient = vi.fn();

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("../resendClient", () => ({ getResendClient: () => mockGetResendClient() }));

const { dispatchReminderEmails, renderReminderEmail, newUnsubscribeToken, REMINDER_INTERVAL_DAYS } =
  await import("../reminderDispatch");

const NOW = new Date("2026-08-18T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const recipient = (over: Record<string, unknown> = {}) => ({
  userId: "u1",
  email: "student@example.com",
  firstName: "Sam",
  preferredLanguage: "en" as const,
  // An exam in two days, which is the one thing that earns an email.
  examDate: new Date(NOW.getTime() + 2 * DAY),
  subscriptionEndDate: null,
  hasActiveSubscription: true,
  unsubscribeToken: "existing-token",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetResendClient.mockResolvedValue({
    client: { emails: { send: mockSend } },
    fromEmail: "MyEasyPass <noreply@example.com>",
  });
  mockSend.mockResolvedValue({ data: { id: "msg_1" }, error: null });
  mockStorage.getReminderRecipients.mockResolvedValue([recipient()]);
  mockStorage.getMissedQuestionIds.mockResolvedValue([]);
  mockStorage.getExamResults.mockResolvedValue([{ id: "r1" }]);
  mockStorage.getLastAnsweredAt.mockResolvedValue(new Date(NOW.getTime() - DAY));
  mockStorage.markReminderEmailSent.mockResolvedValue(undefined);
  mockStorage.setUnsubscribeToken.mockResolvedValue(undefined);
});

describe("dispatchReminderEmails", () => {
  it("sends to a student with something time-bound to say", async () => {
    const result = await dispatchReminderEmails(NOW);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockStorage.markReminderEmailSent).toHaveBeenCalledWith("u1", NOW);
  });

  it("does nothing at all without email credentials", async () => {
    // A deployment with no provider configured is not an error state; it just
    // does not send reminders.
    mockGetResendClient.mockResolvedValue(null);
    const result = await dispatchReminderEmails(NOW);

    expect(result.emailUnavailable).toBe(true);
    expect(mockStorage.getReminderRecipients).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("only looks at students not emailed within the window", async () => {
    await dispatchReminderEmails(NOW);
    const cutoff = mockStorage.getReminderRecipients.mock.calls[0][0] as Date;
    expect(Math.round((NOW.getTime() - cutoff.getTime()) / DAY)).toBe(REMINDER_INTERVAL_DAYS);
  });

  it("skips a student with nothing worth an email, and leaves them eligible", async () => {
    // No exam date, nothing expiring, practised yesterday. A full notebook
    // does not earn an email - it will still be there next week.
    mockStorage.getReminderRecipients.mockResolvedValue([recipient({ examDate: null })]);
    mockStorage.getMissedQuestionIds.mockResolvedValue(new Array(80).fill("q"));

    const result = await dispatchReminderEmails(NOW);

    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
    // The timestamp is untouched, so they get one as soon as there is
    // something to say rather than losing their turn.
    expect(mockStorage.markReminderEmailSent).not.toHaveBeenCalled();
  });

  it("treats a rejected send as a failure rather than a success", async () => {
    // The provider returns an error object instead of throwing. Counting this
    // as sent would mark the student as emailed for the week having received
    // nothing at all.
    mockSend.mockResolvedValue({ data: null, error: { message: "API key is invalid" } });

    const result = await dispatchReminderEmails(NOW);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockStorage.markReminderEmailSent).not.toHaveBeenCalled();
  });

  it("does not record a send that threw", async () => {
    mockSend.mockRejectedValue(new Error("network down"));

    const result = await dispatchReminderEmails(NOW);

    expect(result.failed).toBe(1);
    expect(mockStorage.markReminderEmailSent).not.toHaveBeenCalled();
  });

  it("carries on after one student fails", async () => {
    mockStorage.getReminderRecipients.mockResolvedValue([
      recipient({ userId: "u1" }),
      recipient({ userId: "u2" }),
    ]);
    mockSend.mockRejectedValueOnce(new Error("bounced")).mockResolvedValue({ error: null });

    const result = await dispatchReminderEmails(NOW);

    expect(result.failed).toBe(1);
    expect(result.sent).toBe(1);
  });

  it("issues an unsubscribe token to a student who has none", async () => {
    mockStorage.getReminderRecipients.mockResolvedValue([recipient({ unsubscribeToken: null })]);

    await dispatchReminderEmails(NOW);

    expect(mockStorage.setUnsubscribeToken).toHaveBeenCalledWith("u1", expect.any(String));
    const token = mockStorage.setUnsubscribeToken.mock.calls[0][1] as string;
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it("reuses an existing token rather than invalidating old links", async () => {
    // A student may still have last month's email in their inbox, and its
    // unsubscribe link has to keep working.
    await dispatchReminderEmails(NOW);
    expect(mockStorage.setUnsubscribeToken).not.toHaveBeenCalled();
  });

  it("puts an unsubscribe link in the message and its headers", async () => {
    await dispatchReminderEmails(NOW);

    const message = mockSend.mock.calls[0][0];
    expect(message.html).toContain("existing-token");
    expect(message.text).toContain("existing-token");
    expect(message.headers["List-Unsubscribe"]).toContain("existing-token");
    expect(message.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("sends one message per student, not a digest", async () => {
    mockStorage.getReminderRecipients.mockResolvedValue([
      recipient({
        userId: "u1",
        subscriptionEndDate: new Date(NOW.getTime() + DAY),
      }),
    ]);

    await dispatchReminderEmails(NOW);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});

describe("newUnsubscribeToken", () => {
  it("is long and not guessable from another one", () => {
    const a = newUnsubscribeToken();
    const b = newUnsubscribeToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("renderReminderEmail", () => {
  const reminder = { code: "exam_imminent" as const, priority: 100, data: { days: 2 } };

  it("writes in the student's language", () => {
    const en = renderReminderEmail(recipient(), reminder, "https://example.com/u");
    const es = renderReminderEmail(
      recipient({ preferredLanguage: "es" }),
      reminder,
      "https://example.com/u",
    );

    expect(en.subject).toBe("Your exam is in 2 days.");
    expect(es.subject).toBe("Tu examen es en 2 días.");
    expect(es.html).toContain("Hola Sam");
  });

  it("says why they are receiving it", () => {
    // A student should never have to wonder why an email arrived.
    const { html, text } = renderReminderEmail(recipient(), reminder, "https://example.com/u");
    expect(html).toContain("turned on study reminders");
    expect(text).toContain("turned on study reminders");
  });

  it("greets a student whose name we do not have without an empty gap", () => {
    const { html } = renderReminderEmail(
      recipient({ firstName: null }),
      reminder,
      "https://example.com/u",
    );
    expect(html).toContain("Hi,");
    expect(html).not.toContain("Hi ,");
  });

  it("always sends a plain-text alternative", () => {
    const { text } = renderReminderEmail(recipient(), reminder, "https://example.com/u");
    expect(text).toContain("Your exam is in 2 days.");
    expect(text).not.toContain("<div");
  });
});
