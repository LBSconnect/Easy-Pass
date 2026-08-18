/**
 * When the database connection uses TLS.
 *
 * The bug this replaces was quiet, which is what makes it worth pinning: with
 * SSL keyed off NODE_ENV alone, running the production build against a plain
 * Postgres failed every migration step and the end-to-end suite still went
 * green, because the schema had been created another way.
 */
import { describe, it, expect } from "vitest";
import { resolveDbSsl, sslModeOf } from "@shared/dbSsl";

const PROD_URL = "postgresql://user:pass@db.example.com:5432/app";
const LOCAL_URL = "postgresql://postgres@127.0.0.1:5432/easypass_test";

describe("sslModeOf", () => {
  it("reads an explicit sslmode", () => {
    expect(sslModeOf(`${LOCAL_URL}?sslmode=disable`)).toBe("disable");
    expect(sslModeOf(`${PROD_URL}?sslmode=require`)).toBe("require");
  });

  it("returns null when there is none", () => {
    expect(sslModeOf(PROD_URL)).toBeNull();
  });

  it("does not guess from an unparseable string", () => {
    expect(sslModeOf("not a url")).toBeNull();
    expect(sslModeOf(undefined)).toBeNull();
  });
});

describe("resolveDbSsl", () => {
  it("keeps SSL on for production, which is the case that must not change", () => {
    expect(resolveDbSsl({ connectionString: PROD_URL, nodeEnv: "production" })).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("leaves it off outside production", () => {
    expect(resolveDbSsl({ connectionString: LOCAL_URL, nodeEnv: "development" })).toBe(false);
    expect(resolveDbSsl({ connectionString: LOCAL_URL, nodeEnv: undefined })).toBe(false);
  });

  it("honours sslmode=disable even under NODE_ENV=production", () => {
    // This is the case CI needs: the production build, a plain Postgres, and
    // migrations that actually run.
    expect(
      resolveDbSsl({ connectionString: `${LOCAL_URL}?sslmode=disable`, nodeEnv: "production" }),
    ).toBe(false);
  });

  it("honours an explicit sslmode outside production too", () => {
    for (const mode of ["require", "prefer", "verify-ca", "verify-full"]) {
      expect(
        resolveDbSsl({ connectionString: `${PROD_URL}?sslmode=${mode}`, nodeEnv: "development" }),
      ).toEqual({ rejectUnauthorized: false });
    }
  });

  it("falls back to the environment when the string cannot be read", () => {
    expect(resolveDbSsl({ connectionString: undefined, nodeEnv: "production" })).toEqual({
      rejectUnauthorized: false,
    });
    expect(resolveDbSsl({ connectionString: "garbage", nodeEnv: "production" })).toEqual({
      rejectUnauthorized: false,
    });
  });
});
