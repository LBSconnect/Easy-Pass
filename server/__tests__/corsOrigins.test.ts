/**
 * The CORS allowlist.
 *
 * The failure that prompted this was total rather than subtle: a production
 * build served on http://localhost rejected its own stylesheets, so every
 * page rendered blank. Anything that can blank the site deserves tests that
 * say exactly what is allowed.
 */
import { describe, it, expect } from "vitest";
import { buildAllowedOrigins, DEPLOYED_ORIGINS, LOCAL_ORIGIN } from "@shared/corsOrigins";

describe("buildAllowedOrigins", () => {
  it("always allows the deployed origins", () => {
    const origins = buildAllowedOrigins({ nodeEnv: "production", extra: undefined });
    for (const deployed of DEPLOYED_ORIGINS) expect(origins).toContain(deployed);
  });

  it("allows localhost outside production", () => {
    expect(buildAllowedOrigins({ nodeEnv: "development", extra: undefined })).toContain(LOCAL_ORIGIN);
  });

  it("leaves production unchanged when nothing is configured", () => {
    // The point of the default: this change must not widen production.
    expect(buildAllowedOrigins({ nodeEnv: "production", extra: undefined })).toEqual(DEPLOYED_ORIGINS);
  });

  it("accepts extra origins, which is how an e2e run allows its own host", () => {
    const origins = buildAllowedOrigins({
      nodeEnv: "production",
      extra: "http://localhost:5000",
    });
    expect(origins).toContain("http://localhost:5000");
  });

  it("accepts several, comma separated and untrimmed", () => {
    const origins = buildAllowedOrigins({
      nodeEnv: "production",
      extra: " http://localhost:5000 , https://preview.example ",
    });
    expect(origins).toContain("http://localhost:5000");
    expect(origins).toContain("https://preview.example");
  });

  it("ignores anything that is not a well-formed origin", () => {
    // A value that can never match an Origin header should not be added, or
    // the list quietly claims to allow a host it does not.
    const origins = buildAllowedOrigins({
      nodeEnv: "production",
      extra: "myeasypass.net, https://x.example/path, , javascript:alert(1), ftp://x.example",
    });
    expect(origins).toEqual(DEPLOYED_ORIGINS);
  });

  it("does not add a duplicate", () => {
    const origins = buildAllowedOrigins({
      nodeEnv: "production",
      extra: "https://www.myeasypass.net",
    });
    expect(origins.filter((o) => o === "https://www.myeasypass.net")).toHaveLength(1);
  });
});
