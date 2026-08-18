/**
 * The guard that keeps the end-to-end suite off production.
 *
 * Worth pinning precisely, because the failure mode is silent: specs that
 * register accounts ran against the live site for as long as the default base
 * URL pointed there, and nothing about a passing run would have told you.
 */
import { describe, it, expect, afterEach } from "vitest";
import { isLocalTarget, requireWritableTarget } from "../../tests/helpers/target";

const original = process.env.ALLOW_REMOTE_WRITES;
afterEach(() => {
  if (original === undefined) delete process.env.ALLOW_REMOTE_WRITES;
  else process.env.ALLOW_REMOTE_WRITES = original;
});

describe("isLocalTarget", () => {
  it("accepts the loopback hosts a dev server runs on", () => {
    expect(isLocalTarget("http://localhost:5000")).toBe(true);
    expect(isLocalTarget("http://127.0.0.1:5000")).toBe(true);
    expect(isLocalTarget("http://0.0.0.0:5000")).toBe(true);
  });

  it("rejects the live site", () => {
    expect(isLocalTarget("https://www.myeasypass.net")).toBe(false);
  });

  it("rejects a host that merely contains 'localhost'", () => {
    // localhost.evil.example resolves wherever its owner wants it to.
    expect(isLocalTarget("https://localhost.evil.example")).toBe(false);
    expect(isLocalTarget("https://notlocalhost")).toBe(false);
  });

  it("rejects anything unparseable rather than assuming the best", () => {
    expect(isLocalTarget("")).toBe(false);
    expect(isLocalTarget(undefined)).toBe(false);
    expect(isLocalTarget("not a url")).toBe(false);
  });
});

describe("requireWritableTarget", () => {
  it("allows a local target", () => {
    delete process.env.ALLOW_REMOTE_WRITES;
    expect(() => requireWritableTarget("http://localhost:5000")).not.toThrow();
  });

  it("refuses a remote target by default", () => {
    delete process.env.ALLOW_REMOTE_WRITES;
    expect(() => requireWritableTarget("https://www.myeasypass.net")).toThrow(/Refusing/);
  });

  it("refuses when no target is given at all", () => {
    delete process.env.ALLOW_REMOTE_WRITES;
    expect(() => requireWritableTarget(undefined)).toThrow(/Refusing/);
  });

  it("allows a remote target only on an explicit opt-in", () => {
    process.env.ALLOW_REMOTE_WRITES = "1";
    expect(() => requireWritableTarget("https://staging.example")).not.toThrow();
  });

  it("does not treat any other value as the opt-in", () => {
    // "true"/"yes" are the values someone reaches for from memory; only the
    // documented one counts, so a half-remembered setting fails closed.
    for (const value of ["true", "yes", "0", ""]) {
      process.env.ALLOW_REMOTE_WRITES = value;
      expect(() => requireWritableTarget("https://www.myeasypass.net")).toThrow(/Refusing/);
    }
  });

  it("names the offending target in the message", () => {
    delete process.env.ALLOW_REMOTE_WRITES;
    expect(() => requireWritableTarget("https://www.myeasypass.net")).toThrow(
      /www\.myeasypass\.net/,
    );
  });
});
