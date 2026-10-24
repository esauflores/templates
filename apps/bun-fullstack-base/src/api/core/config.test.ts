import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { config } from "@/api/core/config.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("config", () => {
  it("has a default for every setting, empty values included", () => {
    vi.stubEnv("DATABASE_PATH", "");
    vi.stubEnv("RATE_LIMIT", "");

    expect(config()).toEqual({
      PORT: 3000,
      DATABASE_PATH: "data/app.db",
      RATE_LIMIT: 300,
      MAX_BODY_BYTES: 1_048_576,
      TRUST_PROXY: false,
    });
  });

  it("reads each setting from the environment, as numbers and booleans", () => {
    vi.stubEnv("PORT", "8080");
    vi.stubEnv("RATE_LIMIT", "0");
    vi.stubEnv("MAX_BODY_BYTES", "16");

    expect(config()).toMatchObject({ PORT: 8080, RATE_LIMIT: 0, MAX_BODY_BYTES: 16, DATABASE_PATH: ":memory:" });
  });

  it("reads TRUST_PROXY as true, 1, yes, on or enabled, and their opposites, in any case", () => {
    for (const value of ["true", "TRUE", "1", "yes", "On", "enabled"]) {
      vi.stubEnv("TRUST_PROXY", value);
      expect(config().TRUST_PROXY).toBe(true);
    }
    for (const value of ["false", "False", "0", "no", "OFF", "disabled"]) {
      vi.stubEnv("TRUST_PROXY", value);
      expect(config().TRUST_PROXY).toBe(false);
    }
  });

  it("fails on a bad value, naming the setting", () => {
    for (const [name, value] of [
      ["PORT", "70000"],
      ["RATE_LIMIT", "off"],
      ["MAX_BODY_BYTES", "1mb"],
      ["TRUST_PROXY", "ture"],
    ]) {
      vi.stubEnv(name!, value!);
      expect(() => config()).toThrow(new RegExp(`^Invalid config:[^]*at ${name}`));
      vi.unstubAllEnvs();
    }
  });
});
