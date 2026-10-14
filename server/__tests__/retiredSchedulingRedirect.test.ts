import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { readFileSync } from "node:fs";
import { redirectRetiredExamScheduling } from "../static";

function request(method: string, path: string, query: Request["query"] = {}) {
  const redirect = vi.fn();
  const next = vi.fn();
  redirectRetiredExamScheduling(
    { method, path, query } as Request,
    { redirect } as unknown as Response,
    next as NextFunction,
  );
  return { redirect, next };
}

describe("retired scheduling HTTP redirect", () => {
  it.each(["GET", "HEAD"])("permanently redirects a %s visit", (method) => {
    const result = request(method, "/schedule-exam");
    expect(result.redirect).toHaveBeenCalledExactlyOnceWith(301, "/free/study-resources");
    expect(result.next).not.toHaveBeenCalled();
  });

  it("accepts the historical trailing slash", () => {
    expect(request("GET", "/schedule-exam/").redirect)
      .toHaveBeenCalledExactlyOnceWith(301, "/free/study-resources");
  });

  it("preserves the supported Spanish language choice", () => {
    expect(request("GET", "/schedule-exam", { lang: "es" }).redirect)
      .toHaveBeenCalledExactlyOnceWith(301, "/free/study-resources?lang=es");
  });

  it("does not forward personal details or an untrusted destination", () => {
    expect(request("GET", "/schedule-exam", {
      email: "example@example.com", next: "https://example.org", lang: "en",
    }).redirect).toHaveBeenCalledExactlyOnceWith(301, "/free/study-resources");
  });

  it("does not accept a repeated language parameter as Spanish", () => {
    expect(request("GET", "/schedule-exam", { lang: ["es", "en"] }).redirect)
      .toHaveBeenCalledExactlyOnceWith(301, "/free/study-resources");
  });

  it.each(["POST", "PUT", "DELETE"])("does not redirect a %s operation", (method) => {
    const result = request(method, "/schedule-exam");
    expect(result.redirect).not.toHaveBeenCalled();
    expect(result.next).toHaveBeenCalledExactlyOnceWith();
  });

  it.each(["/", "/api/schedule-exam", "/schedule-exam/other", "/free/study-resources", "/pricing"])(
    "does not change %s", (path) => {
      const result = request("GET", path);
      expect(result.redirect).not.toHaveBeenCalled();
      expect(result.next).toHaveBeenCalledExactlyOnceWith();
    },
  );

  it("keeps the retired URL out of the published primary sitemap", () => {
    const sitemap = readFileSync("client/public/sitemap.xml", "utf8");
    expect(sitemap).not.toContain("/schedule-exam");
    expect(sitemap).toContain("https://www.myeasypass.net/free/study-resources");
  });
});
