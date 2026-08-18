/**
 * Post-login redirect safety.
 *
 * The pricing page hands /login a `next` path so a visitor who clicked
 * Subscribe lands back on their choice rather than on the dashboard. That
 * value comes from the query string, so anyone can put anything in it - and a
 * link that logs you into MyEasyPass and then drops you on someone else's
 * site is a phishing primitive. These pin the rule shut.
 */
import { describe, it, expect } from "vitest";
import { safeNextPath, DEFAULT_POST_LOGIN_PATH } from "@shared/redirects";

describe("safeNextPath", () => {
  it("keeps an in-app path", () => {
    expect(safeNextPath("/pricing")).toBe("/pricing");
  });

  it("keeps the query string, which is where the intent lives", () => {
    expect(safeNextPath("/pricing?category=life_insurance")).toBe(
      "/pricing?category=life_insurance",
    );
  });

  it("falls back to the dashboard when there is nothing to return to", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safeNextPath(undefined)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safeNextPath("")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("refuses an absolute URL to another site", () => {
    expect(safeNextPath("https://evil.example/steal")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safeNextPath("http://evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("refuses a protocol-relative URL", () => {
    // Browsers treat //evil.example as another origin, despite the leading slash.
    expect(safeNextPath("//evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("refuses the backslash variant of the same trick", () => {
    expect(safeNextPath("/\\evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safeNextPath("\\\\evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("refuses a scheme that is not http", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safeNextPath("data:text/html,<script>")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("refuses a path carrying control characters", () => {
    expect(safeNextPath("/pricing\n\rSet-Cookie: x")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("refuses a bare path with no leading slash", () => {
    // "evil.example" resolves relative to the current page, but it is also how
    // a scheme-less host sneaks in; nothing legitimate needs it.
    expect(safeNextPath("evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safeNextPath("dashboard")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("ignores surrounding whitespace rather than being fooled by it", () => {
    expect(safeNextPath("  /pricing  ")).toBe("/pricing");
    expect(safeNextPath("  //evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
  });
});
