/**
 * What a student is told when a request fails.
 *
 * Every failed request used to throw `${status}: ${rawBody}`, and around
 * thirty toasts in the app show `error.message` directly. So the most common
 * registration failure in the product read:
 *
 *   Signup failed
 *   400: {"message":"Email already registered"}
 *
 * These tests pin the sentence surviving, and pin the two things that must
 * never reach a toast instead: a status code, and an HTML error page.
 */
import { describe, it, expect } from "vitest";
import { ApiError, messageFromBody } from "../../client/src/lib/apiError";

describe("messageFromBody", () => {
  it("shows the server's sentence, not the envelope", () => {
    const message = messageFromBody(400, JSON.stringify({ message: "Email already registered" }));

    expect(message).toBe("Email already registered");
    expect(message).not.toContain("400");
    expect(message).not.toContain("{");
  });

  it("reads the rate limiter's own wording", () => {
    // This body carries both `error` and `message`; `message` is the sentence.
    const body = JSON.stringify({
      error: "Too many sign-ups",
      message: "A lot of accounts have been created from this network recently.",
      retryAfter: 3600,
    });

    expect(messageFromBody(429, body)).toBe(
      "A lot of accounts have been created from this network recently.",
    );
  });

  it("falls back to `error` when there is no message", () => {
    expect(messageFromBody(429, JSON.stringify({ error: "Too many requests" }))).toBe(
      "Too many requests",
    );
  });

  it("reads the first complaint out of a validation failure", () => {
    // The shape Zod failures arrive in: { errors: [{ path, message }, ...] }.
    const body = JSON.stringify({
      errors: [{ path: ["email"], message: "Enter a valid email address" }],
    });

    expect(messageFromBody(400, body)).toBe("Enter a valid email address");
  });

  it("never shows an HTML error page", () => {
    // A proxy 502 returns markup. A wall of tags in a toast is worse than
    // saying nothing specific at all.
    const html = "<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>";

    expect(messageFromBody(502, html)).toBe("Something went wrong on our end. Please try again.");
    expect(messageFromBody(502, JSON.stringify({ message: html }))).toBe(
      "Something went wrong on our end. Please try again.",
    );
  });

  it("says something useful when the body is empty", () => {
    // A dropped connection reads as "".
    expect(messageFromBody(500, "")).toBe("Something went wrong on our end. Please try again.");
    expect(messageFromBody(401, "")).toBe("Please sign in and try again.");
    expect(messageFromBody(429, "")).toBe("Too many attempts. Please wait a little and try again.");
    expect(messageFromBody(400, "")).toBe("Something went wrong. Please try again.");
  });

  it("ignores a message that is only whitespace", () => {
    expect(messageFromBody(400, JSON.stringify({ message: "   " }))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("caps a message that is not really a sentence", () => {
    const body = JSON.stringify({ message: "x".repeat(1000) });
    expect(messageFromBody(400, body).length).toBeLessThanOrEqual(200);
  });
});

describe("ApiError", () => {
  it("keeps the status and body for debugging without showing them", () => {
    const raw = JSON.stringify({ message: "Email already registered" });
    const error = new ApiError(400, "Email already registered", raw);

    expect(error.message).toBe("Email already registered");
    expect(error.status).toBe(400);
    expect(error.body).toBe(raw);
    expect(error).toBeInstanceOf(Error);
  });
});
